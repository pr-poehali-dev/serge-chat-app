import { useEffect, useState } from "react";
import Icon from "@/components/ui/icon";
import type { ActiveCall } from "@/pages/index/useCall";
import { PeerAvatar } from "./CallParts";

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
