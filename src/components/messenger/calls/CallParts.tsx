import type { ActiveCall } from "@/pages/index/useCall";

export const formatDuration = (s: number) => {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60).toString().padStart(2, "0");
  const ss = (s % 60).toString().padStart(2, "0");
  return h > 0 ? `${h}:${m}:${ss}` : `${m}:${ss}`;
};

export function PeerAvatar({ peer, size, pulse }: { peer: ActiveCall["peer"]; size: number; pulse?: boolean }) {
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
