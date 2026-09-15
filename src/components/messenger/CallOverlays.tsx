import { useState, useEffect } from "react";
import Icon from "@/components/ui/icon";

// ─── Incoming Call ──────────────────────────────────────────────────────────
interface IncomingCallProps {
  caller: { name: string; avatar: string; color: string };
  isVideo: boolean;
  onAccept: () => void;
  onDecline: () => void;
}

export function IncomingCall({ caller, isVideo, onAccept, onDecline }: IncomingCallProps) {
  const [ring, setRing] = useState(0);

  useEffect(() => {
    const iv = setInterval(() => setRing((r) => r + 1), 600);
    return () => clearInterval(iv);
  }, []);

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center pb-10 px-4"
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(12px)" }}>

      {/* Card */}
      <div
        className="w-full max-w-sm rounded-3xl overflow-hidden animate-slide-up"
        style={{ background: "linear-gradient(160deg, #1a0d35 0%, #0e1a2e 100%)", border: "1px solid rgba(255,255,255,0.1)" }}
      >
        {/* Glow */}
        <div className="relative h-48 flex flex-col items-center justify-center gap-3 overflow-hidden">
          <div className="absolute inset-0 opacity-30"
            style={{ background: `radial-gradient(circle at 50% 60%, ${caller.color} 0%, transparent 70%)` }} />

          {/* Pulsing rings */}
          {[0, 1, 2].map((i) => (
            <div key={i} className="absolute rounded-full border border-white/[0.06]"
              style={{
                width: `${140 + i * 50}px`,
                height: `${140 + i * 50}px`,
                opacity: ring % 3 === i ? 0.4 : 0.08,
                transition: "opacity 0.3s ease",
              }} />
          ))}

          {/* Avatar */}
          <div
            className="relative z-10 flex h-20 w-20 items-center justify-center rounded-3xl text-2xl font-black text-white shadow-2xl"
            style={{
              background: `linear-gradient(135deg, ${caller.color}cc, ${caller.color}66)`,
              boxShadow: `0 0 30px ${caller.color}44`,
            }}
          >
            {caller.avatar}
          </div>

          <div className="relative z-10 text-center">
            <p className="text-lg font-bold text-white">{caller.name}</p>
            <p className="text-sm text-white/40 mt-0.5 flex items-center justify-center gap-1.5">
              {isVideo ? <><Icon name="Video" size={13} />Входящий видеозвонок</> : <><Icon name="Phone" size={13} />Входящий звонок</>}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-4 px-6 py-6">
          {/* Decline */}
          <button
            onClick={onDecline}
            className="flex flex-1 flex-col items-center gap-2 rounded-2xl bg-red-500/15 border border-red-500/30 py-4 text-red-400 hover:bg-red-500/25 transition-all active:scale-95"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-500 shadow-lg shadow-red-500/30">
              <Icon name="PhoneOff" size={22} className="text-white" />
            </div>
            <span className="text-xs font-medium">Отклонить</span>
          </button>

          {/* Message */}
          <button
            onClick={onDecline}
            className="flex flex-1 flex-col items-center gap-2 rounded-2xl bg-white/[0.05] border border-white/[0.08] py-4 text-white/50 hover:bg-white/[0.08] transition-all active:scale-95"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[0.08]">
              <Icon name="MessageCircle" size={22} />
            </div>
            <span className="text-xs font-medium">Сообщение</span>
          </button>

          {/* Accept */}
          <button
            onClick={onAccept}
            className="flex flex-1 flex-col items-center gap-2 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 py-4 text-emerald-400 hover:bg-emerald-500/25 transition-all active:scale-95"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500 shadow-lg shadow-emerald-500/30"
              style={{ animation: "callRing 1s ease-in-out infinite" }}>
              <Icon name={isVideo ? "Video" : "Phone"} size={22} className="text-white" />
            </div>
            <span className="text-xs font-medium">Принять</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Call Screen ────────────────────────────────────────────────────────────
interface CallScreenProps {
  chat: { name: string; avatar: string; color: string; isGroup: boolean };
  isVideo: boolean;
  onEnd: () => void;
}

const GROUP_PARTICIPANTS = [
  { name: "Алиса", avatar: "АМ", color: "#a855f7", muted: false },
  { name: "Дмитрий", avatar: "ДК", color: "#ec4899", muted: true },
  { name: "Вы", avatar: "ВА", color: "#6366f1", muted: false },
];

export function CallScreen({ chat, isVideo, onEnd }: CallScreenProps) {
  const [muted, setMuted] = useState(false);
  const [camOff, setCamOff] = useState(!isVideo);
  const [speakerOff, setSpeakerOff] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [status, setStatus] = useState<"connecting" | "ringing" | "active">("connecting");

  useEffect(() => {
    const t1 = setTimeout(() => setStatus("ringing"), 800);
    const t2 = setTimeout(() => setStatus("active"), 2800);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  useEffect(() => {
    if (status !== "active") return;
    const iv = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(iv);
  }, [status]);

  const fmt = (s: number) => {
    const m = Math.floor(s / 60).toString().padStart(2, "0");
    const ss = (s % 60).toString().padStart(2, "0");
    return `${m}:${ss}`;
  };

  const statusLabel =
    status === "connecting" ? "Соединение..." :
    status === "ringing" ? "Вызов..." :
    fmt(seconds);

  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-between overflow-hidden"
      style={{ background: "linear-gradient(160deg, #0f0720 0%, #130a2a 40%, #0a1520 100%)" }}>

      {/* Orb bg */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 h-[500px] w-[500px] rounded-full opacity-20"
          style={{ background: `radial-gradient(circle, ${chat.color} 0%, transparent 70%)`, filter: "blur(60px)" }} />
        <div className="absolute bottom-0 left-0 h-64 w-64 rounded-full opacity-10"
          style={{ background: "radial-gradient(circle, #ec4899 0%, transparent 70%)", filter: "blur(40px)" }} />
        <div className="absolute bottom-0 right-0 h-64 w-64 rounded-full opacity-10"
          style={{ background: "radial-gradient(circle, #38bdf8 0%, transparent 70%)", filter: "blur(40px)" }} />
      </div>

      {/* Header */}
      <div className="relative z-10 w-full flex items-center justify-between px-6 pt-5">
        <button onClick={onEnd}
          className="flex h-9 w-9 items-center justify-center rounded-2xl bg-white/[0.08] border border-white/[0.1] text-white/60 hover:text-white transition-all">
          <Icon name="ChevronDown" size={18} />
        </button>
        <span className="text-sm font-medium text-white/40">
          {isVideo ? "Видеозвонок" : "Голосовой звонок"}
          {chat.isGroup && " · группа"}
        </span>
        <button className="flex h-9 w-9 items-center justify-center rounded-2xl bg-white/[0.08] border border-white/[0.1] text-white/60 hover:text-white transition-all">
          <Icon name="MoreHorizontal" size={18} />
        </button>
      </div>

      {/* Main content */}
      <div className="relative z-10 flex flex-1 flex-col items-center justify-center w-full px-6 gap-6">
        {chat.isGroup ? (
          /* Group tiles */
          <div className="grid grid-cols-3 gap-3 w-full max-w-sm">
            {GROUP_PARTICIPANTS.map((p, i) => (
              <div key={i} className="flex flex-col items-center gap-2 rounded-2xl bg-white/[0.05] border border-white/[0.07] p-4 animate-fade-in"
                style={{ animationDelay: `${i * 100}ms` }}>
                <div className="relative">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl text-base font-bold text-white"
                    style={{ background: `linear-gradient(135deg, ${p.color}cc, ${p.color}55)`, boxShadow: status === "active" ? `0 0 20px ${p.color}44` : "none" }}>
                    {p.avatar}
                  </div>
                  {p.muted && (
                    <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500/80 border border-background">
                      <Icon name="MicOff" size={10} className="text-white" />
                    </span>
                  )}
                </div>
                <span className="text-xs text-white/60">{p.name}</span>
              </div>
            ))}
            <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-white/[0.1] p-4 cursor-pointer hover:border-purple-400/30 transition-all">
              <Icon name="UserPlus" size={20} className="text-white/30" />
              <span className="text-[10px] text-white/30">Добавить</span>
            </div>
          </div>
        ) : (
          /* Personal avatar */
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <div
                className="flex h-28 w-28 items-center justify-center rounded-3xl text-3xl font-black text-white"
                style={{
                  background: `linear-gradient(135deg, ${chat.color}cc, ${chat.color}66)`,
                  boxShadow: status === "active"
                    ? `0 0 0 0 ${chat.color}00, 0 0 40px ${chat.color}44`
                    : "none",
                  animation: status === "ringing" ? "callRing 1.2s ease-in-out infinite" : "none",
                }}
              >
                {chat.avatar}
              </div>
              {status === "active" && (
                <div className="absolute -inset-3 rounded-[2rem] border border-white/[0.08] animate-ping" style={{ animationDuration: "2s" }} />
              )}
            </div>
            <div className="text-center">
              <h2 className="text-2xl font-bold text-white mb-1">{chat.name}</h2>
              <p className={`text-sm font-medium transition-colors ${status === "active" ? "text-emerald-400" : "text-white/40"}`}>
                {statusLabel}
              </p>
            </div>
          </div>
        )}

        {chat.isGroup && (
          <p className={`text-sm font-medium ${status === "active" ? "text-emerald-400" : "text-white/40"}`}>
            {statusLabel}
          </p>
        )}
      </div>

      {/* Controls */}
      <div className="relative z-10 w-full px-6 pb-10">
        <div className="flex items-center justify-center gap-4">
          {/* Mute */}
          <button onClick={() => setMuted(!muted)}
            className={`flex h-14 w-14 flex-col items-center justify-center gap-1 rounded-2xl border transition-all ${
              muted ? "bg-red-500/20 border-red-500/40 text-red-400" : "bg-white/[0.08] border-white/[0.1] text-white/70 hover:text-white"
            }`}>
            <Icon name={muted ? "MicOff" : "Mic"} size={22} />
          </button>

          {/* Camera (only for video) */}
          {isVideo && (
            <button onClick={() => setCamOff(!camOff)}
              className={`flex h-14 w-14 flex-col items-center justify-center gap-1 rounded-2xl border transition-all ${
                camOff ? "bg-red-500/20 border-red-500/40 text-red-400" : "bg-white/[0.08] border-white/[0.1] text-white/70 hover:text-white"
              }`}>
              <Icon name={camOff ? "VideoOff" : "Video"} size={22} />
            </button>
          )}

          {/* Speaker */}
          <button onClick={() => setSpeakerOff(!speakerOff)}
            className={`flex h-14 w-14 flex-col items-center justify-center gap-1 rounded-2xl border transition-all ${
              speakerOff ? "bg-red-500/20 border-red-500/40 text-red-400" : "bg-white/[0.08] border-white/[0.1] text-white/70 hover:text-white"
            }`}>
            <Icon name={speakerOff ? "VolumeX" : "Volume2"} size={22} />
          </button>

          {/* End call */}
          <button onClick={onEnd}
            className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500 hover:bg-red-600 text-white shadow-xl shadow-red-500/30 transition-all hover:scale-105 active:scale-95">
            <Icon name="PhoneOff" size={26} />
          </button>
        </div>
      </div>
    </div>
  );
}
