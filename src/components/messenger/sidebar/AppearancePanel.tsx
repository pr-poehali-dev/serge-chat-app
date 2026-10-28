import Icon from "@/components/ui/icon";
import { ACCENTS, TextSize, ThemeMode, useAppearance } from "@/hooks/use-appearance";
import { Segmented, PanelHeader } from "./SettingsShared";

export default function AppearancePanel({ onBack }: { onBack: () => void }) {
  const { appearance, update } = useAppearance();

  const themes: { id: ThemeMode; label: string; icon: string }[] = [
    { id: "dark", label: "Тёмная", icon: "Moon" },
    { id: "light", label: "Светлая", icon: "Sun" },
    { id: "system", label: "Системная", icon: "MonitorSmartphone" },
  ];
  const sizes: { id: TextSize; label: string }[] = [
    { id: "small", label: "Мелкий" },
    { id: "normal", label: "Обычный" },
    { id: "large", label: "Крупный" },
  ];

  return (
    <div className="animate-fade-in">
      <PanelHeader title="Оформление" onBack={onBack} />

      <p className="mb-2 px-1 text-xs font-medium text-fg/30">ТЕМА</p>
      <Segmented value={appearance.theme} onChange={(v) => update({ theme: v })} options={themes} />

      <p className="mb-2 mt-5 px-1 text-xs font-medium text-fg/30">АКЦЕНТНЫЙ ЦВЕТ</p>
      <div className="grid grid-cols-2 gap-2">
        {ACCENTS.map((a) => {
          const active = appearance.accent === a.id;
          return (
            <button
              key={a.id}
              onClick={() => update({ accent: a.id })}
              className={`flex items-center gap-2.5 rounded-2xl border px-3 py-2.5 text-left transition-all ${
                active ? "border-fg/30 bg-fg/[0.08]" : "border-fg/[0.06] bg-fg/[0.03] hover:bg-fg/[0.06]"
              }`}
            >
              <span
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
                style={{ background: `linear-gradient(135deg, ${a.from}, ${a.to})` }}
              >
                {active && <Icon name="Check" size={13} className="text-white" />}
              </span>
              <span className="min-w-0 truncate text-xs font-medium text-fg/80">{a.label}</span>
            </button>
          );
        })}
      </div>

      <p className="mb-2 mt-5 px-1 text-xs font-medium text-fg/30">РАЗМЕР ТЕКСТА</p>
      <Segmented value={appearance.textSize} onChange={(v) => update({ textSize: v })} options={sizes} />

      <p className="mt-4 px-1 text-[11px] leading-relaxed text-fg/30">
        Выбор сохраняется на этом устройстве и применяется ко всему мессенджеру.
      </p>
    </div>
  );
}
