import { useEffect, useRef, useState } from "react";
import Icon from "@/components/ui/icon";
import type { ActiveCall } from "@/pages/index/useCall";
import type { GroupCallState } from "@/pages/index/useGroupCall";

const formatDuration = (s: number) => {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60).toString().padStart(2, "0");
  const ss = (s % 60).toString().padStart(2, "0");
  return h > 0 ? `${h}:${m}:${ss}` : `${m}:${ss}`;
};

function PeerAvatar({ peer, size, pulse }: { peer: ActiveCall["peer"]; size: number; pulse?: boolean }) {
  return (
    <div
      className="relative z-10 flex items-center justify-center overflow-hidden rounded-3xl font-black text-white shadow-2xl"
      style={{
        width: size,
        height: size,
        fontSize: size / 3.2,
        background: `linear-gradient(135deg, ${peer.color}cc, ${peer.color}66)`,
        boxShadow: `0 0 30px ${peer.color}44`,
        animation: pulse ? "callRing 1.2s ease-in-out infinite" : "none",
      }}
    >
      {peer.avatarUrl ? <img src={peer.avatarUrl} alt="" className="h-full w-full object-cover" /> : peer.avatar}
    </div>
  );
}

interface IncomingCallProps {
  call: ActiveCall;
  onAccept: () => void;
  onDecline: () => void;
}

export function IncomingCall({ call, onAccept, onDecline }: IncomingCallProps) {
  const [ring, setRing] = useState(0);

  useEffect(() => {
    const iv = setInterval(() => setRing((r) => r + 1), 600);
    return () => clearInterval(iv);
  }, []);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center overlay-safe pb-10"
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(12px)" }}
    >
      <div
        className="w-full max-w-sm rounded-3xl overflow-hidden animate-slide-up"
        style={{ background: "linear-gradient(160deg, #1a0d35 0%, #0e1a2e 100%)", border: "1px solid rgba(255,255,255,0.1)" }}
      >
        <div className="relative h-48 flex flex-col items-center justify-center gap-3 overflow-hidden">
          <div
            className="absolute inset-0 opacity-30"
            style={{ background: `radial-gradient(circle at 50% 60%, ${call.peer.color} 0%, transparent 70%)` }}
          />
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="absolute rounded-full border border-white/[0.06]"
              style={{
                width: `${140 + i * 50}px`,
                height: `${140 + i * 50}px`,
                opacity: ring % 3 === i ? 0.4 : 0.08,
                transition: "opacity 0.3s ease",
              }}
            />
          ))}
          <PeerAvatar peer={call.peer} size={80} />
          <div className="relative z-10 text-center">
            <p className="text-lg font-bold text-white">{call.peer.name}</p>
            <p className="text-sm text-white/50 mt-0.5 flex items-center justify-center gap-1.5">
              {call.isVideo ? (
                <>
                  <Icon name="Video" size={13} />
                  Входящий видеозвонок
                </>
              ) : (
                <>
                  <Icon name="Phone" size={13} />
                  Входящий звонок
                </>
              )}
            </p>
          </div>
        </div>

        <div className="flex gap-4 px-6 py-6">
          <button
            onClick={onDecline}
            className="flex flex-1 flex-col items-center gap-2 rounded-2xl bg-red-500/15 border border-red-500/30 py-4 text-red-400 hover:bg-red-500/25 transition-all active:scale-95"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-500 shadow-lg shadow-red-500/30">
              <Icon name="PhoneOff" size={22} className="text-white" />
            </div>
            <span className="text-xs font-medium">Отклонить</span>
          </button>

          <button
            onClick={onAccept}
            className="flex flex-1 flex-col items-center gap-2 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 py-4 text-emerald-400 hover:bg-emerald-500/25 transition-all active:scale-95"
          >
            <div
              className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500 shadow-lg shadow-emerald-500/30"
              style={{ animation: "callRing 1s ease-in-out infinite" }}
            >
              <Icon name={call.isVideo ? "Video" : "Phone"} size={22} className="text-white" />
            </div>
            <span className="text-xs font-medium">Принять</span>
          </button>
        </div>
      </div>
    </div>
  );
}

interface CallScreenProps {
  call: ActiveCall;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  muted: boolean;
  camOff: boolean;
  speakerOff: boolean;
  onToggleMute: () => void;
  onToggleCam: () => void;
  onToggleSpeaker: () => void;
  onEnd: () => void;
}

export function CallScreen({
  call,
  localStream,
  remoteStream,
  muted,
  camOff,
  speakerOff,
  onToggleMute,
  onToggleCam,
  onToggleSpeaker,
  onEnd,
}: CallScreenProps) {
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const [remoteHasVideo, setRemoteHasVideo] = useState(false);

  useEffect(() => {
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStream;
    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = remoteStream;
      remoteAudioRef.current.play().catch(() => undefined);
    }
    if (!remoteStream) {
      setRemoteHasVideo(false);
      return;
    }
    const update = () => setRemoteHasVideo(remoteStream.getVideoTracks().some((t) => t.readyState === "live" && !t.muted));
    update();
    const tracks = remoteStream.getVideoTracks();
    tracks.forEach((t) => {
      t.addEventListener("mute", update);
      t.addEventListener("unmute", update);
      t.addEventListener("ended", update);
    });
    return () => {
      tracks.forEach((t) => {
        t.removeEventListener("mute", update);
        t.removeEventListener("unmute", update);
        t.removeEventListener("ended", update);
      });
    };
  }, [remoteStream]);

  useEffect(() => {
    if (localVideoRef.current) localVideoRef.current.srcObject = localStream;
  }, [localStream]);

  const ended = call.phase === "ended";
  const active = call.phase === "active";
  const showRemoteVideo = call.isVideo && remoteHasVideo && !ended;

  const statusLabel = ended
    ? call.note || "Звонок завершён"
    : call.phase === "starting"
    ? "Соединение..."
    : call.phase === "ringing"
    ? call.incoming
      ? "Входящий..."
      : "Вызов..."
    : call.phase === "connecting"
    ? "Соединяем..."
    : formatDuration(call.seconds);

  return (
    <div
      className="fixed inset-0 z-[90] flex flex-col items-center justify-between overflow-hidden overlay-safe"
      style={{ background: "linear-gradient(160deg, #0f0720 0%, #130a2a 40%, #0a1520 100%)" }}
    >
      <audio ref={remoteAudioRef} autoPlay muted={speakerOff} />

      {call.isVideo && (
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          muted
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ${showRemoteVideo ? "opacity-100" : "opacity-0"}`}
        />
      )}

      <div className="pointer-events-none absolute inset-0">
        <div
          className="absolute -top-32 left-1/2 -translate-x-1/2 h-[500px] w-[500px] rounded-full opacity-20"
          style={{ background: `radial-gradient(circle, ${call.peer.color} 0%, transparent 70%)`, filter: "blur(60px)" }}
        />
        {showRemoteVideo && <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/60" />}
      </div>

      <div className="relative z-10 w-full flex items-center justify-between px-4 pt-3">
        <div className="h-9 w-9" />
        <div className="text-center">
          <p className="text-sm font-semibold text-white">{call.peer.name}</p>
          <p className={`text-xs font-medium ${active ? "text-emerald-400" : "text-white/55"}`}>
            {call.isVideo ? "Видеозвонок" : "Голосовой звонок"}
            {showRemoteVideo || !active ? "" : ` · ${statusLabel}`}
            {showRemoteVideo && active ? ` · ${statusLabel}` : ""}
          </p>
        </div>
        <div className="h-9 w-9" />
      </div>

      <div className="relative z-10 flex flex-1 flex-col items-center justify-center w-full px-6 gap-5">
        {!showRemoteVideo && (
          <>
            <div className="relative">
              <PeerAvatar peer={call.peer} size={112} pulse={call.phase === "ringing"} />
              {active && (
                <div
                  className="absolute -inset-3 rounded-[2rem] border border-white/[0.08] animate-ping"
                  style={{ animationDuration: "2s" }}
                />
              )}
            </div>
            <div className="text-center">
              <h2 className="text-2xl font-bold text-white mb-1">{call.peer.name}</h2>
              <p className={`text-base font-medium tabular-nums ${active ? "text-emerald-400" : "text-white/55"}`}>{statusLabel}</p>
            </div>
          </>
        )}
      </div>

      {call.isVideo && localStream && !ended && (
        <div className="absolute right-4 top-16 z-20 h-36 w-24 overflow-hidden rounded-2xl border border-white/20 bg-black/60 shadow-xl sm:h-44 sm:w-32">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className={`h-full w-full object-cover ${camOff ? "invisible" : ""}`}
            style={{ transform: "scaleX(-1)" }}
          />
          {camOff && (
            <div className="absolute inset-0 flex items-center justify-center text-white/60">
              <Icon name="VideoOff" size={22} />
            </div>
          )}
        </div>
      )}

      <div className="relative z-10 w-full px-6 pb-6">
        {ended ? (
          <p className="text-center text-sm text-white/60">{statusLabel}</p>
        ) : (
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={onToggleMute}
              aria-label={muted ? "Включить микрофон" : "Выключить микрофон"}
              className={`flex h-14 w-14 items-center justify-center rounded-2xl border transition-all ${
                muted ? "bg-red-500/20 border-red-500/40 text-red-400" : "bg-white/[0.12] border-white/[0.15] text-white hover:bg-white/20"
              }`}
            >
              <Icon name={muted ? "MicOff" : "Mic"} size={22} />
            </button>

            {call.isVideo && (
              <button
                onClick={onToggleCam}
                aria-label={camOff ? "Включить камеру" : "Выключить камеру"}
                className={`flex h-14 w-14 items-center justify-center rounded-2xl border transition-all ${
                  camOff ? "bg-red-500/20 border-red-500/40 text-red-400" : "bg-white/[0.12] border-white/[0.15] text-white hover:bg-white/20"
                }`}
              >
                <Icon name={camOff ? "VideoOff" : "Video"} size={22} />
              </button>
            )}

            <button
              onClick={onToggleSpeaker}
              aria-label={speakerOff ? "Включить звук" : "Выключить звук"}
              className={`flex h-14 w-14 items-center justify-center rounded-2xl border transition-all ${
                speakerOff ? "bg-red-500/20 border-red-500/40 text-red-400" : "bg-white/[0.12] border-white/[0.15] text-white hover:bg-white/20"
              }`}
            >
              <Icon name={speakerOff ? "VolumeX" : "Volume2"} size={22} />
            </button>

            <button
              onClick={onEnd}
              aria-label="Завершить звонок"
              className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500 hover:bg-red-600 text-white shadow-xl shadow-red-500/30 transition-all hover:scale-105 active:scale-95"
            >
              <Icon name="PhoneOff" size={26} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}


function GroupTile({
  name,
  avatar,
  color,
  avatarUrl,
  stream,
  isVideo,
  mine,
  muted,
  camOff,
  silent,
}: {
  name: string;
  avatar: string;
  color: string;
  avatarUrl?: string | null;
  stream: MediaStream | null;
  isVideo: boolean;
  mine?: boolean;
  muted?: boolean;
  camOff?: boolean;
  silent?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [hasVideo, setHasVideo] = useState(false);

  useEffect(() => {
    if (videoRef.current) videoRef.current.srcObject = stream;
    if (audioRef.current && !mine) {
      audioRef.current.srcObject = stream;
      audioRef.current.play().catch(() => undefined);
    }
    if (!stream) {
      setHasVideo(false);
      return;
    }
    const update = () => setHasVideo(stream.getVideoTracks().some((t) => t.readyState === "live" && t.enabled && !t.muted));
    update();
    const tracks = stream.getVideoTracks();
    tracks.forEach((t) => {
      t.addEventListener("mute", update);
      t.addEventListener("unmute", update);
      t.addEventListener("ended", update);
    });
    const iv = window.setInterval(update, 1000);
    return () => {
      window.clearInterval(iv);
      tracks.forEach((t) => {
        t.removeEventListener("mute", update);
        t.removeEventListener("unmute", update);
        t.removeEventListener("ended", update);
      });
    };
  }, [stream, mine]);

  const showVideo = isVideo && hasVideo && !camOff;

  return (
    <div className="relative flex min-h-0 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-white/[0.05]">
      {!mine && <audio ref={audioRef} autoPlay muted={silent} />}
      {isVideo && (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`absolute inset-0 h-full w-full object-cover ${showVideo ? "" : "invisible"}`}
          style={mine ? { transform: "scaleX(-1)" } : undefined}
        />
      )}
      {!showVideo && (
        <div
          className="relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl text-xl font-black text-white sm:h-20 sm:w-20"
          style={{ background: `linear-gradient(135deg, ${color}cc, ${color}66)` }}
        >
          {avatarUrl ? <img src={avatarUrl} alt="" className="h-full w-full object-cover" /> : avatar}
        </div>
      )}
      <div className="absolute bottom-1.5 left-1.5 right-1.5 flex items-center gap-1">
        <span className="max-w-full truncate rounded-lg bg-black/55 px-2 py-0.5 text-[11px] font-medium text-white">
          {mine ? "Вы" : name}
        </span>
        {muted && (
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-500/90">
            <Icon name="MicOff" size={11} className="text-white" />
          </span>
        )}
      </div>
    </div>
  );
}

interface GroupCallScreenProps {
  call: GroupCallState;
  myUserId: number;
  localStream: MediaStream | null;
  remoteStreams: Record<number, MediaStream>;
  muted: boolean;
  camOff: boolean;
  speakerOff: boolean;
  onToggleMute: () => void;
  onToggleCam: () => void;
  onToggleSpeaker: () => void;
  onLeave: () => void;
}

export function GroupCallScreen({
  call,
  myUserId,
  localStream,
  remoteStreams,
  muted,
  camOff,
  speakerOff,
  onToggleMute,
  onToggleCam,
  onToggleSpeaker,
  onLeave,
}: GroupCallScreenProps) {
  const ended = call.phase === "ended";
  const others = call.members.filter((m) => m.userId !== myUserId);
  const me = call.members.find((m) => m.userId === myUserId);
  const total = others.length + 1;
  const cols = total <= 1 ? 1 : total <= 4 ? 2 : 3;
  const rows = Math.ceil(total / cols);

  return (
    <div
      className="fixed inset-0 z-[90] flex flex-col overflow-hidden overlay-safe"
      style={{ background: "linear-gradient(160deg, #0f0720 0%, #130a2a 40%, #0a1520 100%)" }}
    >
      <div className="relative z-10 px-4 pt-2 text-center">
        <p className="truncate text-sm font-semibold text-white">{call.chatName}</p>
        <p className={`text-xs font-medium tabular-nums ${ended ? "text-white/60" : "text-emerald-400"}`}>
          {ended ? call.note || "Звонок завершён" : `${call.isVideo ? "Групповой видеозвонок" : "Групповой звонок"} · ${formatDuration(call.seconds)} · ${total} из 6`}
        </p>
      </div>

      <div
        className="relative z-10 grid min-h-0 flex-1 gap-2 p-3"
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))` }}
      >
        <GroupTile
          mine
          name="Вы"
          avatar={me?.avatar || "ВЫ"}
          color={me?.color || "#a855f7"}
          avatarUrl={me?.avatarUrl}
          stream={localStream}
          isVideo={call.isVideo}
          muted={muted}
          camOff={camOff}
        />
        {others.map((m) => (
          <GroupTile
            key={m.userId}
            name={m.name}
            avatar={m.avatar}
            color={m.color}
            avatarUrl={m.avatarUrl}
            stream={remoteStreams[m.userId] || null}
            isVideo={call.isVideo}
            silent={speakerOff}
          />
        ))}
      </div>

      <div className="relative z-10 w-full px-6 pb-6">
        {ended ? null : (
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={onToggleMute}
              aria-label={muted ? "Включить микрофон" : "Выключить микрофон"}
              className={`flex h-14 w-14 items-center justify-center rounded-2xl border transition-all ${
                muted ? "bg-red-500/20 border-red-500/40 text-red-400" : "bg-white/[0.12] border-white/[0.15] text-white hover:bg-white/20"
              }`}
            >
              <Icon name={muted ? "MicOff" : "Mic"} size={22} />
            </button>
            {call.isVideo && (
              <button
                onClick={onToggleCam}
                aria-label={camOff ? "Включить камеру" : "Выключить камеру"}
                className={`flex h-14 w-14 items-center justify-center rounded-2xl border transition-all ${
                  camOff ? "bg-red-500/20 border-red-500/40 text-red-400" : "bg-white/[0.12] border-white/[0.15] text-white hover:bg-white/20"
                }`}
              >
                <Icon name={camOff ? "VideoOff" : "Video"} size={22} />
              </button>
            )}
            <button
              onClick={onToggleSpeaker}
              aria-label={speakerOff ? "Включить звук" : "Выключить звук"}
              className={`flex h-14 w-14 items-center justify-center rounded-2xl border transition-all ${
                speakerOff ? "bg-red-500/20 border-red-500/40 text-red-400" : "bg-white/[0.12] border-white/[0.15] text-white hover:bg-white/20"
              }`}
            >
              <Icon name={speakerOff ? "VolumeX" : "Volume2"} size={22} />
            </button>
            <button
              onClick={onLeave}
              aria-label="Выйти из звонка"
              className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500 hover:bg-red-600 text-white shadow-xl shadow-red-500/30 transition-all hover:scale-105 active:scale-95"
            >
              <Icon name="PhoneOff" size={26} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
