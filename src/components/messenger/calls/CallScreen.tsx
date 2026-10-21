import { useEffect, useRef, useState } from "react";
import Icon from "@/components/ui/icon";
import type { ActiveCall } from "@/pages/index/useCall";
import { PeerAvatar, formatDuration } from "./CallParts";

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
