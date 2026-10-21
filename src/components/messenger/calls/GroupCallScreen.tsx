import { useEffect, useRef, useState } from "react";
import Icon from "@/components/ui/icon";
import type { GroupCallState } from "@/pages/index/useGroupCall";
import { formatDuration } from "./CallParts";

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
