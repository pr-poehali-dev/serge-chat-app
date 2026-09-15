import { useState } from "react";
import Icon from "@/components/ui/icon";

interface CreateTopicModalProps {
  onCreate: (name: string, color: string) => void;
  onClose: () => void;
}

const TOPIC_COLORS = ["#a855f7", "#ec4899", "#38bdf8", "#34d399", "#f59e0b", "#6366f1", "#ef4444", "#22c55e"];

export default function CreateTopicModal({ onCreate, onClose }: CreateTopicModalProps) {
  const [name, setName] = useState("");
  const [color, setColor] = useState(TOPIC_COLORS[0]);

  const canCreate = name.trim().length > 0;

  return (
    <div
      className="fixed inset-0 z-[92] flex items-center justify-center px-4"
      style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-3xl overflow-hidden animate-fade-in"
        style={{ background: "rgba(14,8,28,0.98)", border: "1px solid rgba(255,255,255,0.1)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.07]">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl gradient-btn">
              <Icon name="Hash" size={16} className="text-white" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white/95">Новая тема</h2>
              <p className="text-[11px] text-white/35">Отдельный чат внутри группы</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-xl text-white/40 hover:text-white/80 hover:bg-white/[0.06] transition-all"
          >
            <Icon name="X" size={16} />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* Name */}
          <div className="flex items-center gap-2 rounded-2xl bg-white/[0.06] border border-white/[0.08] px-3 py-2.5">
            <Icon name="Hash" size={14} style={{ color }} />
            <input
              className="flex-1 bg-transparent text-sm text-white/85 placeholder:text-white/25 outline-none"
              placeholder="Название темы"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter" && canCreate) onCreate(name.trim(), color);
              }}
            />
          </div>

          {/* Color picker */}
          <div>
            <p className="text-[11px] text-white/30 font-medium mb-2">Цвет темы</p>
            <div className="flex gap-2 flex-wrap">
              {TOPIC_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className="flex h-8 w-8 items-center justify-center rounded-xl transition-all"
                  style={{ background: c, outline: color === c ? "2px solid white" : "none", outlineOffset: "2px" }}
                >
                  {color === c && <Icon name="Check" size={14} className="text-white" />}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-white/[0.07]">
          <button
            onClick={() => canCreate && onCreate(name.trim(), color)}
            disabled={!canCreate}
            className="w-full rounded-2xl gradient-btn text-white text-sm font-medium py-3 transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:-translate-y-0.5"
          >
            Создать тему
          </button>
        </div>
      </div>
    </div>
  );
}
