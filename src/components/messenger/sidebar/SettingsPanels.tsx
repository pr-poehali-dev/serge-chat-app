import { ReactNode, useEffect, useState } from "react";
import Icon from "@/components/ui/icon";
import { Switch } from "@/components/ui/switch";
import { ACCENTS, TextSize, ThemeMode, useAppearance } from "@/hooks/use-appearance";
import { AuthUser } from "../types";

const API_CHATS = "https://functions.poehali.dev/50b38462-4054-480e-85a6-3d1d593be5fb";
const NOTIFY_KEY = "trindelka_notify_prefs";

export type SettingsSection = "notifications" | "privacy" | "appearance";

interface PrivacySettings {
  showOnline: boolean;
  showTyping: boolean;
  readReceipts: boolean;
  whoCanMessage: "all" | "contacts";
}

interface NotifyPrefs {
  inApp: boolean;
  sound: boolean;
  browser: boolean;
}

const DEFAULT_NOTIFY: NotifyPrefs = { inApp: true, sound: true, browser: false };

export function readNotifyPrefs(): NotifyPrefs {
  try {
    return { ...DEFAULT_NOTIFY, ...(JSON.parse(localStorage.getItem(NOTIFY_KEY) || "{}") as Partial<NotifyPrefs>) };
  } catch {
    return DEFAULT_NOTIFY;
  }
}

function Row({
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

function Segmented<T extends string>({
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

function PanelHeader({ title, onBack }: { title: string; onBack: () => void }) {
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

function NotificationsPanel({ onBack }: { onBack: () => void }) {
  const [prefs, setPrefs] = useState<NotifyPrefs>(readNotifyPrefs);
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">(
    typeof Notification === "undefined" ? "unsupported" : Notification.permission
  );

  useEffect(() => {
    try {
      localStorage.setItem(NOTIFY_KEY, JSON.stringify(prefs));
    } catch {
      return;
    }
  }, [prefs]);

  const toggleBrowser = async (on: boolean) => {
    if (!on) {
      setPrefs((p) => ({ ...p, browser: false }));
      return;
    }
    if (typeof Notification === "undefined") return;
    const result = Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
    setPermission(result);
    setPrefs((p) => ({ ...p, browser: result === "granted" }));
  };

  return (
    <div className="animate-fade-in">
      <PanelHeader title="Уведомления" onBack={onBack} />
      <div className="space-y-2">
        <Row icon="Bell" title="В колокольчике" desc="Новые сообщения появляются в разделе уведомлений">
          <Switch checked={prefs.inApp} onCheckedChange={(v) => setPrefs((p) => ({ ...p, inApp: v }))} />
        </Row>
        <Row icon="Volume2" title="Звук" desc="Короткий сигнал при новом сообщении">
          <Switch checked={prefs.sound} onCheckedChange={(v) => setPrefs((p) => ({ ...p, sound: v }))} />
        </Row>
        <Row
          icon="MonitorSmartphone"
          title="Уведомления браузера"
          desc={
            permission === "unsupported"
              ? "Этот браузер не поддерживает уведомления"
              : permission === "denied"
              ? "Запрещено в настройках браузера"
              : "Показывать, когда вкладка в фоне"
          }
        >
          <Switch
            checked={prefs.browser && permission === "granted"}
            disabled={permission === "unsupported" || permission === "denied"}
            onCheckedChange={toggleBrowser}
          />
        </Row>
      </div>
      <p className="mt-4 px-1 text-[11px] leading-relaxed text-fg/30">
        Настройки уведомлений сохраняются на этом устройстве.
      </p>
    </div>
  );
}

function PrivacyPanel({ authUser, onBack }: { authUser: AuthUser | null; onBack: () => void }) {
  const [settings, setSettings] = useState<PrivacySettings | null>(null);
  const [error, setError] = useState("");
  const headers: Record<string, string> = authUser ? { "X-Session-Id": authUser.sessionId } : {};

  useEffect(() => {
    if (!authUser) return;
    fetch(`${API_CHATS}?action=settings`, { headers })
      .then((r) => r.json())
      .then((d) => setSettings(d.settings || null))
      .catch(() => setError("Не удалось загрузить настройки"));
  }, [authUser?.sessionId]);

  const save = async (patch: Partial<PrivacySettings>) => {
    if (!settings) return;
    const previous = settings;
    setSettings({ ...settings, ...patch });
    setError("");
    try {
      const res = await fetch(`${API_CHATS}?action=update-settings`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify(patch),
      });
      const data = await res.json();
      if (!res.ok) throw new Error();
      setSettings(data.settings);
    } catch {
      setSettings(previous);
      setError("Не удалось сохранить, попробуйте ещё раз");
    }
  };

  return (
    <div className="animate-fade-in">
      <PanelHeader title="Приватность" onBack={onBack} />
      {!settings ? (
        <div className="flex justify-center py-10">
          {error ? (
            <p className="text-xs text-red-400">{error}</p>
          ) : (
            <Icon name="Loader" size={18} className="animate-spin text-fg/30" />
          )}
        </div>
      ) : (
        <div className="space-y-2">
          <Row icon="CircleDot" title="Статус «в сети»" desc="Другие видят, когда вы онлайн">
            <Switch checked={settings.showOnline} onCheckedChange={(v) => save({ showOnline: v })} />
          </Row>
          <Row icon="Keyboard" title="Индикатор «печатает…»" desc="Собеседник видит, что вы набираете текст">
            <Switch checked={settings.showTyping} onCheckedChange={(v) => save({ showTyping: v })} />
          </Row>
          <Row icon="CheckCheck" title="Отметки о прочтении" desc="Показывать, что вы прочитали сообщение">
            <Switch checked={settings.readReceipts} onCheckedChange={(v) => save({ readReceipts: v })} />
          </Row>

          <div className="rounded-2xl bg-fg/[0.04] border border-fg/[0.06] p-3">
            <div className="mb-2.5 flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-fg/[0.05] text-fg/60">
                <Icon name="MessageSquare" size={16} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-fg/85">Кто может писать первым</p>
                <p className="text-xs text-fg/40 leading-snug">Новые личные чаты</p>
              </div>
            </div>
            <Segmented
              value={settings.whoCanMessage}
              onChange={(v) => save({ whoCanMessage: v })}
              options={[
                { id: "all", label: "Все" },
                { id: "contacts", label: "Только контакты" },
              ]}
            />
          </div>
          {error && <p className="px-1 text-xs text-red-400">{error}</p>}
        </div>
      )}
      <div className="mt-4 flex items-start gap-2 rounded-2xl bg-emerald-400/[0.08] border border-emerald-400/20 px-3 py-2.5">
        <Icon name="ShieldCheck" size={14} className="mt-0.5 shrink-0 text-emerald-400" />
        <p className="text-[11px] leading-relaxed text-fg/55">
          Если отключить «в сети» или отметки о прочтении, вы тоже перестанете видеть их у других — как в большинстве мессенджеров.
        </p>
      </div>
    </div>
  );
}

function AppearancePanel({ onBack }: { onBack: () => void }) {
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

interface SettingsPanelsProps {
  section: SettingsSection;
  authUser: AuthUser | null;
  onBack: () => void;
}

export default function SettingsPanels({ section, authUser, onBack }: SettingsPanelsProps) {
  if (section === "notifications") return <NotificationsPanel onBack={onBack} />;
  if (section === "privacy") return <PrivacyPanel authUser={authUser} onBack={onBack} />;
  return <AppearancePanel onBack={onBack} />;
}
