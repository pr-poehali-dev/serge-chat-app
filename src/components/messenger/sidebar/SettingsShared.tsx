import { ReactNode } from "react";
import Icon from "@/components/ui/icon";

export function Row({
  icon,
  title,
  desc,
  children,
}: {
  icon: string;
  title: string;
  desc?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-fg/[0.04] border border-fg/[0.06] px-3 py-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-fg/[0.05] text-fg/60">
        <Icon name={icon} size={16} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-fg/85">{title}</p>
        {desc && <p className="text-xs text-fg/40 leading-snug">{desc}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { id: T; label: string; icon?: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="grid gap-1 rounded-2xl bg-fg/[0.05] p-1" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
      {options.map((o) => (
        <button
          key={o.id}
          onClick={() => onChange(o.id)}
          className={`flex items-center justify-center gap-1.5 rounded-xl px-2 py-2 text-xs font-medium transition-all ${
            value === o.id ? "bg-fg/[0.12] text-foreground shadow-sm" : "text-fg/45 hover:text-fg/70"
          }`}
        >
          {o.icon && <Icon name={o.icon} size={13} />}
          <span className="truncate">{o.label}</span>
        </button>
      ))}
    </div>
  );
}

export function PanelHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <div className="mb-4 flex items-center gap-2">
      <button
        onClick={onBack}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-fg/50 hover:text-foreground hover:bg-fg/[0.06] transition-all"
      >
        <Icon name="ArrowLeft" size={18} />
      </button>
      <h3 className="text-base font-bold text-foreground">{title}</h3>
    </div>
  );
}
