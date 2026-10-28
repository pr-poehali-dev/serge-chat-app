import { useEffect, useState } from "react";
import Icon from "@/components/ui/icon";
import { Switch } from "@/components/ui/switch";
import { AuthUser } from "../types";
import { API_CHATS } from "@/pages/index/config";
import { Row, Segmented, PanelHeader } from "./SettingsShared";

interface PrivacySettings {
  showOnline: boolean;
  showTyping: boolean;
  readReceipts: boolean;
  whoCanMessage: "all" | "contacts";
}

export default function PrivacyPanel({ authUser, onBack }: { authUser: AuthUser | null; onBack: () => void }) {
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
