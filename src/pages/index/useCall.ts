import { useCallback, useEffect, useRef, useState } from "react";
import { API_PUSH } from "./config";
import { onNativeCallAction, syncNativeSession, takePendingCall } from "@/lib/callPrefs";

export interface CallPeer {
  name: string;
  avatar: string;
  color: string;
  avatarUrl?: string | null;
}

export type CallPhase = "starting" | "ringing" | "connecting" | "active" | "ended";

export interface ActiveCall {
  id: number | null;
  chatId: number;
  isVideo: boolean;
  incoming: boolean;
  peer: CallPeer;
  phase: CallPhase;
  seconds: number;
  note?: string;
}

interface UseCallParams {
  sessionId: string | null;
}

interface ApiCall {
  id: number;
  chatId: number;
  isVideo: boolean;
  status: string;
  incoming: boolean;
  peer: CallPeer;
  seconds: number;
  offer?: string | RTCSessionDescriptionInit;
  answer?: string | RTCSessionDescriptionInit;
}

interface ApiData {
  call?: ApiCall | null;
  callId?: number;
  error?: string;
  code?: string;
  iceServers?: RTCIceServer[];
}

const POLL_MS = 1500;
const ICE_WAIT_MS = 3500;
const END_NOTE_MS = 2500;
const FALLBACK_ICE: RTCIceServer[] = [{ urls: ["stun:stun.l.google.com:19302"] }];

const ENDED_STATUSES: Record<string, string> = {
  ended: "Звонок завершён",
  declined: "Вызов отклонён",
  canceled: "Звонок отменён",
  missed: "Нет ответа",
};

function mediaErrorText(e: unknown, video: boolean): string {
  const name = (e as { name?: string })?.name || "";
  const what = video ? "камере и микрофону" : "микрофону";
  if (name === "NotAllowedError" || name === "SecurityError") return `Нет доступа к ${what}. Разрешите доступ в настройках браузера`;
  if (name === "NotFoundError" || name === "OverconstrainedError") return video ? "Не найдены камера или микрофон" : "Не найден микрофон";
  if (name === "NotReadableError") return "Камера или микрофон заняты другим приложением";
  if (!window.isSecureContext) return "Звонки работают только на сайте с https://";
  return "Не удалось включить микрофон или камеру";
}

function createRinger() {
  let timer: number | null = null;
  let ctx: AudioContext | null = null;

  const beep = (freq: number, start: number, dur: number, vol: number) => {
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    const t0 = ctx.currentTime + start;
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  };

  const stop = () => {
    if (timer !== null) window.clearInterval(timer);
    timer = null;
  };

  const start = (kind: "incoming" | "outgoing") => {
    stop();
    try {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return;
      ctx = ctx || new Ctx();
      if (ctx.state === "suspended") ctx.resume();
    } catch {
      return;
    }
    const play = () => {
      if (kind === "incoming") {
        beep(880, 0, 0.35, 0.18);
        beep(660, 0.45, 0.35, 0.18);
      } else {
        beep(425, 0, 1.0, 0.1);
      }
    };
    play();
    timer = window.setInterval(play, kind === "incoming" ? 2200 : 3500);
  };

  return { start, stop };
}

function waitForIce(pc: RTCPeerConnection): Promise<void> {
  return new Promise((resolve) => {
    if (pc.iceGatheringState === "complete") {
      resolve();
      return;
    }
    const done = () => {
      pc.removeEventListener("icegatheringstatechange", onChange);
      window.clearTimeout(timer);
      resolve();
    };
    const onChange = () => {
      if (pc.iceGatheringState === "complete") done();
    };
    const timer = window.setTimeout(done, ICE_WAIT_MS);
    pc.addEventListener("icegatheringstatechange", onChange);
  });
}

export function useCall({ sessionId }: UseCallParams) {
  const [call, setCall] = useState<ActiveCall | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [muted, setMuted] = useState(false);
  const [camOff, setCamOff] = useState(false);
  const [speakerOff, setSpeakerOff] = useState(false);
  const [error, setError] = useState("");

  const callRef = useRef<ActiveCall | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localRef = useRef<MediaStream | null>(null);
  const offerRef = useRef<RTCSessionDescriptionInit | null>(null);
  const pollRef = useRef<number | null>(null);
  const clearTimerRef = useRef<number | null>(null);
  const remoteSetRef = useRef(false);
  const checkingRef = useRef(false);
  const ringerRef = useRef<ReturnType<typeof createRinger> | null>(null);
  const acceptRef = useRef<(() => void) | null>(null);
  const sessionRef = useRef<string | null>(sessionId);
  sessionRef.current = sessionId;
  callRef.current = call;

  const ringer = () => {
    if (!ringerRef.current) ringerRef.current = createRinger();
    return ringerRef.current;
  };

  const headers = useCallback(
    (): Record<string, string> => ({ "Content-Type": "application/json", "X-Session-Id": sessionRef.current || "" }),
    []
  );

  const api = useCallback(
    async (action: string, body?: Record<string, unknown>, query = ""): Promise<{ ok: boolean; status: number; data: ApiData }> => {
      try {
        const res = await fetch(`${API_PUSH}?action=${action}${query}`, {
          method: body ? "POST" : "GET",
          headers: headers(),
          body: body ? JSON.stringify(body) : undefined,
          keepalive: action === "end" || action === "decline",
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
    },
    [headers]
  );

  const stopPolling = () => {
    if (pollRef.current !== null) window.clearInterval(pollRef.current);
    pollRef.current = null;
  };

  const releaseMedia = () => {
    localRef.current?.getTracks().forEach((t) => t.stop());
    localRef.current = null;
    if (pcRef.current) {
      pcRef.current.ontrack = null;
      pcRef.current.onconnectionstatechange = null;
      pcRef.current.close();
    }
    pcRef.current = null;
    setLocalStream(null);
    setRemoteStream(null);
  };

  const finishLocal = useCallback((note: string) => {
    stopPolling();
    ringer().stop();
    releaseMedia();
    offerRef.current = null;
    remoteSetRef.current = false;
    setMuted(false);
    setCamOff(false);
    setSpeakerOff(false);
    setCall((c) => (c ? { ...c, phase: "ended", note } : c));
    if (clearTimerRef.current !== null) window.clearTimeout(clearTimerRef.current);
    clearTimerRef.current = window.setTimeout(() => setCall(null), END_NOTE_MS);
  }, []);

  const dropImmediately = useCallback(() => {
    stopPolling();
    ringer().stop();
    releaseMedia();
    offerRef.current = null;
    remoteSetRef.current = false;
    if (clearTimerRef.current !== null) window.clearTimeout(clearTimerRef.current);
    setCall(null);
  }, []);

  const buildPeerConnection = async (stream: MediaStream): Promise<RTCPeerConnection> => {
    const cfg = await api("config");
    const iceServers: RTCIceServer[] = cfg.ok && cfg.data.iceServers ? cfg.data.iceServers : FALLBACK_ICE;
    const pc = new RTCPeerConnection({ iceServers });
    stream.getTracks().forEach((t) => pc.addTrack(t, stream));
    const remote = new MediaStream();
    pc.ontrack = (e) => {
      e.streams[0]?.getTracks().forEach((t) => {
        if (!remote.getTracks().includes(t)) remote.addTrack(t);
      });
      setRemoteStream(new MediaStream(remote.getTracks()));
    };
    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      if (state === "connected") {
        ringer().stop();
        setCall((c) => (c && c.phase !== "ended" ? { ...c, phase: "active" } : c));
      } else if (state === "failed") {
        const c = callRef.current;
        if (c?.id) api("end", { call_id: c.id });
        finishLocal("Связь потеряна");
      }
    };
    pcRef.current = pc;
    return pc;
  };

  const getMedia = async (video: boolean): Promise<MediaStream> => {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw Object.assign(new Error("no media"), { name: window.isSecureContext ? "NotFoundError" : "SecurityError" });
    }
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      video: video ? { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } } : false,
    });
    localRef.current = stream;
    setLocalStream(stream);
    return stream;
  };

  const startPolling = (callId: number) => {
    stopPolling();
    const tick = async () => {
      const c = callRef.current;
      if (!c || c.id !== callId || c.phase === "ended") return;
      const r = await api("state", undefined, `&call_id=${callId}`);
      if (!r.ok || !r.data.call) {
        if (r.status === 404) finishLocal("Звонок завершён");
        return;
      }
      const st = r.data.call;
      if (ENDED_STATUSES[st.status]) {
        const note = c.incoming && st.status === "canceled" ? "Пропущенный звонок" : ENDED_STATUSES[st.status];
        finishLocal(note);
        return;
      }
      if (st.status === "active") {
        if (!c.incoming && st.answer && !remoteSetRef.current && pcRef.current) {
          remoteSetRef.current = true;
          try {
            const answer = typeof st.answer === "string" ? (JSON.parse(st.answer) as RTCSessionDescriptionInit) : st.answer;
            await pcRef.current.setRemoteDescription(answer);
          } catch {
            api("end", { call_id: callId });
            finishLocal("Не удалось соединиться");
            return;
          }
          ringer().stop();
          setCall((cur) => (cur && cur.phase !== "active" && cur.phase !== "ended" ? { ...cur, phase: "connecting" } : cur));
        }
        setCall((cur) => (cur ? { ...cur, seconds: Math.max(cur.seconds, st.seconds || 0) } : cur));
      }
    };
    pollRef.current = window.setInterval(tick, POLL_MS);
    tick();
  };

  const startCall = async (chatId: number, isVideo: boolean, peer: CallPeer) => {
    if (callRef.current || !sessionRef.current) return;
    setError("");
    if (clearTimerRef.current !== null) window.clearTimeout(clearTimerRef.current);
    setCall({ id: null, chatId, isVideo, incoming: false, peer, phase: "starting", seconds: 0 });
    try {
      const stream = await getMedia(isVideo);
      const pc = await buildPeerConnection(stream);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      await waitForIce(pc);
      const desc = pc.localDescription;
      if (!desc) throw new Error("no offer");
      const r = await api("start", { chat_id: chatId, isVideo, offer: { type: desc.type, sdp: desc.sdp } });
      if (!r.ok) {
        dropImmediately();
        setError(r.status === 409 ? "Линия занята: идёт другой звонок" : r.data.error || "Не удалось позвонить");
        return;
      }
      const id = r.data.callId as number;
      const ringing: ActiveCall = { id, chatId, isVideo, incoming: false, peer, phase: "ringing", seconds: 0 };
      callRef.current = ringing;
      setCall(ringing);
      ringer().start("outgoing");
      startPolling(id);
    } catch (e) {
      dropImmediately();
      setError(mediaErrorText(e, isVideo));
    }
  };

  const checkIncoming = useCallback(async () => {
    if (callRef.current || checkingRef.current || !sessionRef.current) return;
    checkingRef.current = true;
    try {
      const r = await api("incoming");
      const c = r.data.call;
      if (!r.ok || !c || callRef.current) return;
      try {
        const parsed = typeof c.offer === "string" ? (JSON.parse(c.offer) as RTCSessionDescriptionInit) : c.offer;
        if (!parsed) return;
        offerRef.current = parsed;
      } catch {
        return;
      }
      remoteSetRef.current = false;
      if (clearTimerRef.current !== null) window.clearTimeout(clearTimerRef.current);
      setCall({
        id: c.id,
        chatId: c.chatId,
        isVideo: !!c.isVideo,
        incoming: true,
        peer: c.peer,
        phase: "ringing",
        seconds: 0,
      });
      callRef.current = {
        id: c.id,
        chatId: c.chatId,
        isVideo: !!c.isVideo,
        incoming: true,
        peer: c.peer,
        phase: "ringing",
        seconds: 0,
      };
      ringer().start("incoming");
      startPolling(c.id);
    } finally {
      checkingRef.current = false;
    }
  }, [api]);

  const accept = async () => {
    const c = callRef.current;
    const offer = offerRef.current;
    if (!c || !c.incoming || !c.id || !offer || c.phase !== "ringing") return;
    ringer().stop();
    setCall({ ...c, phase: "connecting" });
    setError("");
    try {
      const stream = await getMedia(c.isVideo);
      const pc = await buildPeerConnection(stream);
      await pc.setRemoteDescription(offer);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      await waitForIce(pc);
      const desc = pc.localDescription;
      if (!desc) throw new Error("no answer");
      const r = await api("answer", { call_id: c.id, answer: { type: desc.type, sdp: desc.sdp } });
      if (!r.ok) {
        finishLocal(r.status === 409 ? "Звонок уже завершён" : "Не удалось ответить");
        return;
      }
    } catch (e) {
      api("decline", { call_id: c.id });
      dropImmediately();
      setError(mediaErrorText(e, c.isVideo));
    }
  };

  acceptRef.current = () => {
    accept();
  };

  const decline = async () => {
    const c = callRef.current;
    if (!c) return;
    if (c.id) await api("decline", { call_id: c.id });
    dropImmediately();
  };

  const hangUp = async () => {
    const c = callRef.current;
    if (!c) return;
    if (c.phase === "ended") {
      dropImmediately();
      return;
    }
    if (c.id) await api("end", { call_id: c.id });
    finishLocal("Звонок завершён");
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

  const toggleSpeaker = () => setSpeakerOff((v) => !v);

  useEffect(() => {
    const onHide = () => {
      const c = callRef.current;
      if (c?.id && c.phase !== "ended") {
        fetch(`${API_PUSH}?action=end`, {
          method: "POST",
          headers: headers(),
          body: JSON.stringify({ call_id: c.id }),
          keepalive: true,
        }).catch(() => undefined);
      }
    };
    window.addEventListener("pagehide", onHide);
    return () => window.removeEventListener("pagehide", onHide);
  }, [headers]);

  useEffect(() => {
    if (call?.phase !== "active") return;
    const iv = window.setInterval(() => {
      setCall((c) => (c && c.phase === "active" ? { ...c, seconds: c.seconds + 1 } : c));
    }, 1000);
    return () => window.clearInterval(iv);
  }, [call?.phase]);

  useEffect(() => {
    if (!sessionId && callRef.current) dropImmediately();
  }, [sessionId, dropImmediately]);

  const pendingAcceptRef = useRef<number | null>(null);

  const handleNativeAction = useCallback(
    async (action: { callId: number; accept: boolean }) => {
      await checkIncoming();
      const c = callRef.current;
      if (!action.accept || !c || c.id !== action.callId) return;
      pendingAcceptRef.current = null;
      acceptRef.current?.();
    },
    [checkIncoming]
  );

  useEffect(() => {
    syncNativeSession(sessionId);
    if (!sessionId) return;
    takePendingCall().then((p) => {
      if (p) handleNativeAction(p);
    });
    let off: () => void = () => undefined;
    onNativeCallAction((a) => handleNativeAction(a)).then((fn) => {
      off = fn;
    });
    return () => off();
  }, [sessionId, handleNativeAction]);

  useEffect(() => {
    if (!sessionId) return;
    checkIncoming();
    const onMessage = (e: MessageEvent) => {
      if (e.data?.type === "open-chat") checkIncoming();
    };
    const onVisible = () => {
      if (!document.hidden) checkIncoming();
    };
    navigator.serviceWorker?.addEventListener("message", onMessage);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      navigator.serviceWorker?.removeEventListener("message", onMessage);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [sessionId, checkIncoming]);

  useEffect(
    () => () => {
      stopPolling();
      ringerRef.current?.stop();
      releaseMedia();
    },
    []
  );

  return {
    call,
    localStream,
    remoteStream,
    muted,
    camOff,
    speakerOff,
    error,
    clearError: () => setError(""),
    startCall,
    checkIncoming,
    accept,
    decline,
    hangUp,
    toggleMute,
    toggleCam,
    toggleSpeaker,
  };
}
