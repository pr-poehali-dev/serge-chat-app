import { useRef, useState } from "react";
import Icon from "@/components/ui/icon";
import { Message } from "../types";
import { formatDuration } from "./useRecorder";

interface VoiceMessageProps {
  msg: Message;
  onTranscribe?: (messageId: number) => Promise<string | null>;
}

export default function VoiceMessage({ msg, onTranscribe }: VoiceMessageProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [transcript, setTranscript] = useState<string | null>(msg.transcript || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);

  const toggle = () => {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) a.play().catch(() => setPlaying(false));
    else a.pause();
  };

  const handleTranscribe = async () => {
    if (transcript) {
      setOpen((v) => !v);
      return;
    }
    if (!onTranscribe) return;
    setLoading(true);
    setError("");
    const text = await onTranscribe(msg.id);
    setLoading(false);
    if (text) {
      setTranscript(text);
      setOpen(true);
    } else {
      setError("Не удалось расшифровать");
    }
  };

  const bars = Array.from({ length: 24 }, (_, i) => 20 + ((i * 37) % 70));
  const total = msg.duration || 0;

  return (
    <div className="min-w-[200px] max-w-[260px]">
      <div className="flex items-center gap-3">
        <button
          onClick={toggle}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/20 hover:bg-white/30 transition-all"
        >
          <Icon name={playing ? "Pause" : "Play"} size={16} className="text-white" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex h-6 items-center gap-[2px]">
            {bars.map((h, i) => (
              <span
                key={i}
                className="w-[3px] rounded-full bg-white"
                style={{ height: `${h}%`, opacity: i / bars.length <= progress ? 1 : 0.35 }}
              />
            ))}
          </div>
          <p className="text-[10px] text-white/60 mt-0.5">{formatDuration(total)}</p>
        </div>
        <button
          onClick={handleTranscribe}
          disabled={loading}
          title="Расшифровать в текст"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-all"
        >
          <Icon name={loading ? "Loader" : "FileText"} size={14} className={`text-white ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {open && transcript && (
        <p className="mt-2 border-t border-white/15 pt-2 text-xs leading-relaxed text-white/85 whitespace-pre-wrap break-words">
          {transcript}
        </p>
      )}
      {error && <p className="mt-1 text-[11px] text-red-300">{error}</p>}

      <audio
        ref={audioRef}
        src={msg.mediaUrl || undefined}
        preload="metadata"
        playsInline
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => {
          setPlaying(false);
          setProgress(0);
        }}
        onTimeUpdate={(e) => {
          const a = e.currentTarget;
          if (a.duration && isFinite(a.duration)) setProgress(a.currentTime / a.duration);
        }}
      />
    </div>
  );
}
