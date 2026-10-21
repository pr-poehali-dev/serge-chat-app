import { useCallback, useEffect, useRef, useState } from "react";
import { API_PUSH } from "./config";

export interface GroupMember {
  userId: number;
  name: string;
  avatar: string;
  color: string;
  avatarUrl?: string | null;
  joinedAt: number;
}

export type GroupPhase = "joining" | "active" | "ended";

export interface GroupCallState {
  id: number;
  chatId: number;
  chatName: string;
  isVideo: boolean;
  phase: GroupPhase;
  members: GroupMember[];
  seconds: number;
  note?: string;
}

interface Signal {
  id: number;
  from: number;
  kind: "offer" | "answer" | "ice";
  payload: string;
}

interface ApiData {
  callId?: number;
  isVideo?: boolean;
  members?: GroupMember[];
  seconds?: number;
  status?: string;
  signals?: Signal[];
  error?: string;
  code?: string;
  call?: { id: number; chatId: number; isVideo: boolean; participants: GroupMember[] } | null;
  iceServers?: RTCIceServer[];
}

interface Peer {
  pc: RTCPeerConnection;
  stream: MediaStream;
  pendingIce: RTCIceCandidateInit[];
  remoteSet: boolean;
  outIce: RTCIceCandidateInit[];
}

const POLL_MS = 1200;
const END_NOTE_MS = 2500;
const FALLBACK_ICE: RTCIceServer[] = [{ urls: ["stun:stun.l.google.com:19302"] }];

function mediaErrorText(e: unknown, video: boolean): string {
  const name = (e as { name?: string })?.name || "";
  const what = video ? "камере и микрофону" : "микрофону";
  if (name === "NotAllowedError" || name === "SecurityError") return `Нет доступа к ${what}. Разрешите доступ в настройках`;
  if (name === "NotFoundError" || name === "OverconstrainedError") return video ? "Не найдены камера или микрофон" : "Не найден микрофон";
  if (name === "NotReadableError") return "Камера или микрофон заняты другим приложением";
  if (!window.isSecureContext) return "Звонки работают только на сайте с https://";
  return "Не удалось включить микрофон или камеру";
}

export function useGroupCall(sessionId: string | null, myUserId: number | null) {
  const [call, setCall] = useState<GroupCallState | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Record<number, MediaStream>>({});
  const [muted, setMuted] = useState(false);
  const [camOff, setCamOff] = useState(false);
  const [speakerOff, setSpeakerOff] = useState(false);
  const [error, setError] = useState("");

  const callRef = useRef<GroupCallState | null>(null);
  const peersRef = useRef<Map<number, Peer>>(new Map());
  const localRef = useRef<MediaStream | null>(null);
  const iceRef = useRef<RTCIceServer[]>(FALLBACK_ICE);
  const pollRef = useRef<number | null>(null);
  const clearRef = useRef<number | null>(null);
  const sessionRef = useRef(sessionId);
  const meRef = useRef(myUserId);
  const polling = useRef(false);
  sessionRef.current = sessionId;
  meRef.current = myUserId;
  callRef.current = call;

  const api = useCallback(async (action: string, body?: Record<string, unknown>, query = ""): Promise<{ ok: boolean; status: number; data: ApiData }> => {
    try {
      const res = await fetch(`${API_PUSH}?action=${action}${query}`, {
        method: body ? "POST" : "GET",
        headers: { "Content-Type": "application/json", "X-Session-Id": sessionRef.current || "" },
        body: body ? JSON.stringify(body) : undefined,
        keepalive: action === "gcall-leave",
      });
      let data: ApiData = {};
      try {
        data = await res.json();
      } catch {
        data = {};
      }
      return { ok: res.ok, status: res.status, data };
    } catch {
      return { ok: false, status: 0, data: {} };
    }
  }, []);

  const publishRemote = () => {
    const next: Record<number, MediaStream> = {};
    peersRef.current.forEach((peer, uid) => {
      if (peer.stream.getTracks().length > 0) next[uid] = new MediaStream(peer.stream.getTracks());
    });
    setRemoteStreams(next);
  };

  const closePeer = (uid: number) => {
    const peer = peersRef.current.get(uid);
    if (!peer) return;
    peer.pc.ontrack = null;
    peer.pc.onicecandidate = null;
    peer.pc.onconnectionstatechange = null;
    peer.pc.close();
    peersRef.current.delete(uid);
  };

  const releaseAll = () => {
    if (pollRef.current !== null) window.clearInterval(pollRef.current);
    pollRef.current = null;
    Array.from(peersRef.current.keys()).forEach(closePeer);
    localRef.current?.getTracks().forEach((t) => t.stop());
    localRef.current = null;
    setLocalStream(null);
    setRemoteStreams({});
  };

  const finish = useCallback((note: string) => {
    releaseAll();
    setMuted(false);
    setCamOff(false);
    setSpeakerOff(false);
    setCall((c) => (c ? { ...c, phase: "ended", note } : c));
    if (clearRef.current !== null) window.clearTimeout(clearRef.current);
    clearRef.current = window.setTimeout(() => setCall(null), END_NOTE_MS);
  }, []);

  const dropNow = useCallback(() => {
    releaseAll();
    if (clearRef.current !== null) window.clearTimeout(clearRef.current);
    setCall(null);
  }, []);

  const flushIce = (uid: number, callId: number) => {
    const peer = peersRef.current.get(uid);
    if (!peer || peer.outIce.length === 0) return;
    const batch = peer.outIce.splice(0, peer.outIce.length);
    api("gcall-signal", {
      call_id: callId,
      signals: batch.map((c) => ({ to_user: uid, kind: "ice", payload: c })),
    });
  };

  const createPeer = (uid: number, callId: number): Peer => {
    const pc = new RTCPeerConnection({ iceServers: iceRef.current });
    const stream = new MediaStream();
    const peer: Peer = { pc, stream, pendingIce: [], remoteSet: false, outIce: [] };
    localRef.current?.getTracks().forEach((t) => pc.addTrack(t, localRef.current as MediaStream));
    pc.ontrack = (e) => {
      if (!stream.getTracks().includes(e.track)) stream.addTrack(e.track);
      e.track.onended = publishRemote;
      publishRemote();
    };
    pc.onicecandidate = (e) => {
      if (!e.candidate) return;
      peer.outIce.push(e.candidate.toJSON());
    };
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "connected") {
        setCall((c) => (c && c.phase === "joining" ? { ...c, phase: "active" } : c));
      }
    };
    peersRef.current.set(uid, peer);
    window.setTimeout(() => flushIce(uid, callId), 300);
    return peer;
  };

  const sendSignal = (callId: number, to: number, kind: "offer" | "answer", desc: RTCSessionDescriptionInit) =>
    api("gcall-signal", { call_id: callId, signals: [{ to_user: to, kind, payload: { type: desc.type, sdp: desc.sdp } }] });

  const callPeer = async (uid: number, callId: number) => {
    if (peersRef.current.has(uid)) return;
    const peer = createPeer(uid, callId);
    try {
      const offer = await peer.pc.createOffer();
      await peer.pc.setLocalDescription(offer);
      await sendSignal(callId, uid, "offer", offer);
    } catch {
      closePeer(uid);
    }
  };

  const handleSignal = async (sig: Signal, callId: number) => {
    let payload: RTCSessionDescriptionInit | RTCIceCandidateInit;
    try {
      payload = JSON.parse(sig.payload);
    } catch {
      return;
    }
    if (sig.kind === "offer") {
      closePeer(sig.from);
      const peer = createPeer(sig.from, callId);
      try {
        await peer.pc.setRemoteDescription(payload as RTCSessionDescriptionInit);
        peer.remoteSet = true;
        for (const c of peer.pendingIce.splice(0)) await peer.pc.addIceCandidate(c).catch(() => undefined);
        const answer = await peer.pc.createAnswer();
        await peer.pc.setLocalDescription(answer);
        await sendSignal(callId, sig.from, "answer", answer);
      } catch {
        closePeer(sig.from);
      }
      return;
    }
    const peer = peersRef.current.get(sig.from);
    if (!peer) return;
    if (sig.kind === "answer") {
      try {
        await peer.pc.setRemoteDescription(payload as RTCSessionDescriptionInit);
        peer.remoteSet = true;
        for (const c of peer.pendingIce.splice(0)) await peer.pc.addIceCandidate(c).catch(() => undefined);
      } catch {
        closePeer(sig.from);
      }
      return;
    }
    if (peer.remoteSet) await peer.pc.addIceCandidate(payload as RTCIceCandidateInit).catch(() => undefined);
    else peer.pendingIce.push(payload as RTCIceCandidateInit);
  };

  const tick = async () => {
    const c = callRef.current;
    if (!c || c.phase === "ended" || polling.current) return;
    polling.current = true;
    try {
      const r = await api("gcall-poll", { call_id: c.id });
      if (!r.ok) {
        if (r.status === 401 || r.status === 403 || r.status === 404) finish("Звонок завершён");
        return;
      }
      if (r.data.status !== "active") {
        finish("Звонок завершён");
        return;
      }
      const members = r.data.members || [];
      const me = meRef.current;
      const ids = new Set(members.map((m) => m.userId));

      peersRef.current.forEach((_, uid) => {
        if (!ids.has(uid)) closePeer(uid);
      });

      for (const sig of r.data.signals || []) await handleSignal(sig, c.id);

      const mine = members.find((m) => m.userId === me);
      for (const m of members) {
        if (m.userId === me || peersRef.current.has(m.userId)) continue;
        if (!mine) continue;
        if (m.joinedAt > mine.joinedAt) continue;
        if (m.joinedAt === mine.joinedAt && (me ?? 0) < m.userId) continue;
        await callPeer(m.userId, c.id);
      }
      peersRef.current.forEach((_, uid) => flushIce(uid, c.id));
      publishRemote();

      setCall((cur) =>
        cur && cur.id === c.id
          ? { ...cur, members, seconds: r.data.seconds ?? cur.seconds, phase: cur.phase === "joining" && members.length <= 1 ? "active" : cur.phase }
          : cur
      );
    } finally {
      polling.current = false;
    }
  };

  const begin = async (
    first: { ok: boolean; status: number; data: ApiData },
    chatId: number,
    chatName: string,
    isVideo: boolean,
    stream: MediaStream
  ) => {
    const cfg = await api("config");
    iceRef.current = cfg.ok && cfg.data.iceServers ? cfg.data.iceServers : FALLBACK_ICE;
    localRef.current = stream;
    setLocalStream(stream);
    const callId = (first.data.callId as number) || 0;
    const state: GroupCallState = {
      id: callId,
      chatId,
      chatName,
      isVideo,
      phase: (first.data.members || []).length > 1 ? "joining" : "active",
      members: first.data.members || [],
      seconds: first.data.seconds || 0,
    };
    callRef.current = state;
    setCall(state);
    pollRef.current = window.setInterval(tick, POLL_MS);
    tick();
  };

  const startCall = async (chatId: number, chatName: string, isVideo: boolean) => {
    if (callRef.current || !sessionRef.current) return;
    setError("");
    if (clearRef.current !== null) window.clearTimeout(clearRef.current);
    let stream: MediaStream;
    try {
      stream = await getMedia(isVideo);
    } catch (e) {
      setError(mediaErrorText(e, isVideo));
      return;
    }
    const r = await api("gcall-start", { chat_id: chatId, isVideo });
    if (r.status === 409 && r.data.code === "exists" && r.data.callId) {
      const j = await api("gcall-join", { call_id: r.data.callId });
      if (!j.ok) {
        stream.getTracks().forEach((t) => t.stop());
        setError(j.data.error || "Не удалось присоединиться");
        return;
      }
      await begin({ ...j, data: { ...j.data, callId: r.data.callId } }, chatId, chatName, !!j.data.isVideo, stream);
      return;
    }
    if (!r.ok) {
      stream.getTracks().forEach((t) => t.stop());
      setError(r.data.error || "Не удалось начать звонок");
      return;
    }
    await begin(r, chatId, chatName, isVideo, stream);
  };

  const joinCall = async (callId: number, chatId: number, chatName: string, isVideo: boolean) => {
    if (callRef.current || !sessionRef.current) return;
    setError("");
    if (clearRef.current !== null) window.clearTimeout(clearRef.current);
    let stream: MediaStream;
    try {
      stream = await getMedia(isVideo);
    } catch (e) {
      setError(mediaErrorText(e, isVideo));
      return;
    }
    const r = await api("gcall-join", { call_id: callId });
    if (!r.ok) {
      stream.getTracks().forEach((t) => t.stop());
      setError(r.data.error || "Не удалось присоединиться");
      return;
    }
    await begin({ ...r, data: { ...r.data, callId } }, chatId, chatName, !!r.data.isVideo, stream);
  };

  const getMedia = async (video: boolean): Promise<MediaStream> => {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw Object.assign(new Error("no media"), { name: window.isSecureContext ? "NotFoundError" : "SecurityError" });
    }
    return navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      video: video ? { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } } : false,
    });
  };

  const leave = async () => {
    const c = callRef.current;
    if (!c) return;
    if (c.phase === "ended") {
      dropNow();
      return;
    }
    await api("gcall-leave", { call_id: c.id });
    finish("Вы вышли из звонка");
  };

  const toggleMute = () => {
    const next = !muted;
    localRef.current?.getAudioTracks().forEach((t) => (t.enabled = !next));
    setMuted(next);
  };

  const toggleCam = () => {
    const next = !camOff;
    localRef.current?.getVideoTracks().forEach((t) => (t.enabled = !next));
    setCamOff(next);
  };

  useEffect(() => {
    const onHide = () => {
      const c = callRef.current;
      if (c && c.phase !== "ended") {
        fetch(`${API_PUSH}?action=gcall-leave`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Session-Id": sessionRef.current || "" },
          body: JSON.stringify({ call_id: c.id }),
          keepalive: true,
        }).catch(() => undefined);
      }
    };
    window.addEventListener("pagehide", onHide);
    return () => window.removeEventListener("pagehide", onHide);
  }, []);

  useEffect(() => {
    if (!sessionId && callRef.current) dropNow();
  }, [sessionId, dropNow]);

  useEffect(
    () => () => {
      releaseAll();
    },
    []
  );

  return {
    call,
    localStream,
    remoteStreams,
    muted,
    camOff,
    speakerOff,
    error,
    clearError: () => setError(""),
    startCall,
    joinCall,
    leave,
    toggleMute,
    toggleCam,
    toggleSpeaker: () => setSpeakerOff((v) => !v),
  };
}