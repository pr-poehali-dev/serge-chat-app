import { useEffect, useRef } from "react";
import Icon from "@/components/ui/icon";
import { RecordedMedia, formatDuration, useRecorder } from "./useRecorder";

interface MediaRecorderControlsProps {
  disabled?: boolean;
  onRecorded: (kind: "voice" | "circle", media: RecordedMedia) => void;
  onRecordingChange?: (active: boolean) => void;
}

function CirclePreview({ stream }: { stream: MediaStream | null }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (ref.current && stream) {
      ref.current.srcObject = stream;
      ref.current.play().catch(() => undefined);
    }
  }, [stream]);
  return (
    <video
      ref={ref}
      muted
      playsInline
      autoPlay
      className="h-full w-full object-cover"
      style={{ transform: "scaleX(-1)" }}
    />
  );
}

export default function MediaRecorderControls({ disabled, onRecorded, onRecordingChange }: MediaRecorderControlsProps) {
  const voice = useRecorder(false, 120);
  const circle = useRecorder(true, 60);
  const active = voice.recording ? "voice" : circle.recording ? "circle" : null;
  const current = active === "voice" ? voice : active === "circle" ? circle : null;
  const error = voice.error || circle.error;

  useEffect(() => {
    onRecordingChange?.(!!active);
  }, [active, onRecordingChange]);

  const finish = async () => {
    if (!current || !active) return;
    const kind = active;
    const media = await current.stop();
    if (media) onRecorded(kind, media);
  };

  if (active && current) {
    return (
      <>
        {active === "circle" && (
          <div className="fixed inset-0 z-[80] flex flex-col items-center justify-center gap-4 bg-black/70 backdrop-blur-sm overlay-safe">
            <div className="aspect-square w-64 max-w-[80vw] max-h-[45dvh] overflow-hidden rounded-full border-4 border-red-500/70 shadow-2xl">
              <CirclePreview stream={circle.stream} />
            </div>
            <p className="text-sm font-medium text-white">{formatDuration(circle.seconds)} / 1:00</p>
            <div className="flex items-center gap-4">
              <button
                onClick={circle.cancel}
                className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
              >
                <Icon name="Trash2" size={20} />
              </button>
              <button
                onClick={finish}
                className="flex h-14 w-14 items-center justify-center rounded-full gradient-btn text-white shadow-lg"
              >
                <Icon name="Send" size={22} />
              </button>
            </div>
          </div>
        )}
        {active === "voice" && (
          <div className="flex flex-1 items-center gap-3 rounded-2xl bg-red-500/10 border border-red-500/30 px-4 py-2.5">
            <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-red-500" />
            <span className="flex-1 text-sm font-medium text-white/85">Запись… {formatDuration(voice.seconds)}</span>
            <button
              onClick={voice.cancel}
              className="flex h-8 w-8 items-center justify-center rounded-full text-white/50 hover:text-red-400 hover:bg-white/10"
            >
              <Icon name="Trash2" size={16} />
            </button>
            <button
              onClick={finish}
              className="flex h-9 w-9 items-center justify-center rounded-xl gradient-btn text-white"
            >
              <Icon name="Send" size={15} />
            </button>
          </div>
        )}
      </>
    );
  }

  return (
    <div className="flex items-center gap-1">
      {error && <span className="hidden sm:block text-[11px] text-red-400 mr-1">{error}</span>}
      <button
        onClick={() => circle.start()}
        disabled={disabled}
        title="Видеокружок"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-white/30 hover:text-purple-400 hover:bg-purple-400/[0.08] transition-all disabled:opacity-30"
      >
        <Icon name="Video" size={18} />
      </button>
      <button
        onClick={() => voice.start()}
        disabled={disabled}
        title="Голосовое сообщение"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl gradient-btn text-white shadow-lg shadow-purple-500/20 transition-all disabled:opacity-30"
      >
        <Icon name="Mic" size={16} />
      </button>
    </div>
  );
}
