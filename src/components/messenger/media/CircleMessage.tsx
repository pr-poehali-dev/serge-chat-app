import { useRef, useState } from "react";
import Icon from "@/components/ui/icon";
import { Message } from "../types";
import { formatDuration } from "./useRecorder";

export default function CircleMessage({ msg }: { msg: Message }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);

  const toggle = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      v.muted = false;
      v.play().catch(() => setPlaying(false));
    } else {
      v.pause();
    }
  };

  return (
    <button
      onClick={toggle}
      className="relative block h-[200px] w-[200px] max-w-full overflow-hidden rounded-full border-2 border-white/20 bg-black/40"
    >
      <video
        ref={videoRef}
        src={msg.mediaUrl || undefined}
        className="h-full w-full object-cover"
        playsInline
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
      />
      {!playing && (
        <span className="absolute inset-0 flex items-center justify-center bg-black/30">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/25 backdrop-blur">
            <Icon name="Play" size={22} className="text-white" />
          </span>
        </span>
      )}
      {msg.duration ? (
        <span className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-2 py-0.5 text-[10px] text-white">
          {formatDuration(msg.duration)}
        </span>
      ) : null}
    </button>
  );
}
