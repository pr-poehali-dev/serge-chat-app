import { useEffect, useState } from "react";
import { Switch } from "@/components/ui/switch";
import { AuthUser, Chat } from "../types";
import { disablePush, enablePush, getExistingSubscription, pushSupport } from "@/lib/push";
import { isNativeApp, startNativePush, stopNativePush } from "@/lib/nativePush";
import { fullScreenAllowed, openFullScreenSettings } from "@/lib/callPrefs";
import { API_CHATS } from "@/pages/index/config";
import { Row, PanelHeader } from "./SettingsShared";

const NOTIFY_KEY = "trindelka_notify_prefs";

interface NotifyPrefs {
  inApp: boolean;
  sound: boolean;
  browser: boolean;
  quietEnabled: boolean;
  quietFrom: number;
  quietTo: number;
}

const DEFAULT_NOTIFY: NotifyPrefs = { inApp: true, sound: true, browser: false, quietEnabled: false, quietFrom: 1380, quietTo: 480 };

export function isQuietNow(prefs: NotifyPrefs, now: Date = new Date()): boolean {
  if (!prefs.quietEnabled || prefs.quietFrom === prefs.quietTo) return false;
  const minutes = now.getHours() * 60 + now.getMinutes();
  if (prefs.quietFrom < prefs.quietTo) return minutes >= prefs.quietFrom && minutes < prefs.quietTo;
  return minutes >= prefs.quietFrom || minutes < prefs.quietTo;
}

const minutesToTime = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
const timeToMinutes = (v: string) => {
  const [h, m] = v.split(":").map(Number);
  return Number.isFinite(h) && Number.isFinite(m) ? h * 60 + m : null;
};

export function readNotifyPrefs(): NotifyPrefs {
  try {
    return { ...DEFAULT_NOTIFY, ...(JSON.parse(localStorage.getItem(NOTIFY_KEY) || "{}") as Partial<NotifyPrefs>) };
  } catch {
    return DEFAULT_NOTIFY;
  }
}

export default function NotificationsPanel({
  onBack,
  authUser,
  chats,
  onSetChatNotify,
}: {
  onBack: () => void;
  authUser: AuthUser | null;
  chats: Chat[];
  onSetChatNotify: (chatId: number, enabled: boolean) => void;
}) {
  const [prefs, setPrefs] = useState<NotifyPrefs>(readNotifyPrefs);
  const native = isNativeApp();
  const support = native ? "supported" : pushSupport();
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">(
    native ? "default" : typeof Notification === "undefined" ? "unsupported" : Notification.permission
  );
  const [pushOn, setPushOn] = useState(native ? !!localStorage.getItem("trindelka_fcm_token") : false);
  const [pushBusy, setPushBusy] = useState(false);
  const [pushError, setPushError] = useState("");
  const [fullScreenOk, setFullScreenOk] = useState(true);
  const [quietError, setQuietError] = useState("");

  useEffect(() => {
    if (!authUser) return;
    let alive = true;
    fetch(`${API_CHATS}?action=settings`, { headers: { "X-Session-Id": authUser.sessionId } })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => {
        const st = d.settings;
        if (!alive || !st || typeof st.quietEnabled !== "boolean") return;
        setPrefs((p) => ({ ...p, quietEnabled: st.quietEnabled, quietFrom: st.quietFrom, quietTo: st.quietTo }));
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [authUser?.sessionId]);

  const saveQuiet = async (patch: Partial<Pick<NotifyPrefs, "quietEnabled" | "quietFrom" | "quietTo">>) => {
    const previous = prefs;
    setPrefs((p) => ({ ...p, ...patch }));
    setQuietError("");
    if (!authUser) return;
    try {
      const res = await fetch(`${API_CHATS}?action=update-settings`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Session-Id": authUser.sessionId },
        body: JSON.stringify({ ...patch, quietTz: -new Date().getTimezoneOffset() }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setPrefs(previous);
      setQuietError("Не удалось сохранить тихие часы, попробуйте ещё раз");
    }
  };

  useEffect(() => {
    if (!native) return;
    fullScreenAllowed().then(setFullScreenOk);
  }, [native, pushOn]);

  useEffect(() => {
    try {
      localStorage.setItem(NOTIFY_KEY, JSON.stringify(prefs));
    } catch {
      return;
    }
  }, [prefs]);

  useEffect(() => {
    if (native) return;
    let alive = true;
    getExistingSubscription().then((sub) => {
      if (alive) setPushOn(!!sub && Notification.permission === "granted");
    });
    return () => {
      alive = false;
    };
  }, []);

  const togglePush = async (on: boolean) => {
    if (!authUser) return;
    setPushBusy(true);
    setPushError("");
    if (native) {
      if (on) {
        const r = await startNativePush(authUser.sessionId, () => undefined);
        setPushOn(r.ok);
        if (!r.ok) setPushError(r.error || "Не удалось включить");
      } else {
        await stopNativePush(authUser.sessionId);
        setPushOn(false);
      }
      setPushBusy(false);
      return;
    }
    if (on) {
      const r = await enablePush(authUser.sessionId);
      setPushOn(r.ok);
      if (!r.ok) setPushError(r.error || "Не удалось включить");
      if (typeof Notification !== "undefined") setPermission(Notification.permission);
    } else {
      await disablePush(authUser.sessionId);
      setPushOn(false);
    }
    setPushBusy(false);
  };

  const pushDesc =
    support === "needs-install"
      ? "На iPhone сначала добавьте сайт на экран «Домой» (Поделиться → На экран «Домой»), затем откройте его оттуда"
      : support === "unsupported"
      ? "Этот браузер не поддерживает уведомления"
      : permission === "denied"
      ? "Запрещено в настройках браузера"
      : "Приходят, даже когда приложение или вкладка закрыты";

  const realChats = chats.filter((c) => c.id > 0 && !c.isBot);

  return (
    <div className="animate-fade-in">
      <PanelHeader title="Уведомления" onBack={onBack} />
      <div className="space-y-2">
        <Row icon="BellRing" title="Уведомления на устройстве" desc={pushDesc}>
          <Switch
            checked={pushOn}
            disabled={support !== "supported" || permission === "denied" || pushBusy}
            onCheckedChange={togglePush}
          />
        </Row>
        {pushError && <p className="px-1 text-xs text-red-400">{pushError}</p>}
        {native && pushOn && !fullScreenOk && (
          <Row icon="Smartphone" title="Звонки на весь экран" desc="Android 14 требует разрешить это отдельно. Без него звонок придёт обычным уведомлением">
            <button
              onClick={() => openFullScreenSettings()}
              className="rounded-xl gradient-btn px-3 py-1.5 text-xs font-medium text-white"
            >
              Разрешить
            </button>
          </Row>
        )}
        <Row icon="Bell" title="В колокольчике" desc="Новые сообщения появляются в разделе уведомлений">
          <Switch checked={prefs.inApp} onCheckedChange={(v) => setPrefs((p) => ({ ...p, inApp: v }))} />
        </Row>
        <Row icon="Volume2" title="Звук" desc="Короткий сигнал при новом сообщении">
          <Switch checked={prefs.sound} onCheckedChange={(v) => setPrefs((p) => ({ ...p, sound: v }))} />
        </Row>
        <Row
          icon="MoonStar"
          title="Тихие часы"
          desc="В это время сообщения приходят без звука и вибрации"
        >
          <Switch checked={prefs.quietEnabled} disabled={!authUser} onCheckedChange={(v) => saveQuiet({ quietEnabled: v })} />
        </Row>
        {prefs.quietEnabled && (
          <div className="rounded-2xl border border-fg/[0.06] bg-fg/[0.04] px-3 py-3 animate-fade-in">
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="mb-1 block text-[11px] font-medium text-fg/45">С</span>
                <input
                  type="time"
                  value={minutesToTime(prefs.quietFrom)}
                  onChange={(e) => {
                    const m = timeToMinutes(e.target.value);
                    if (m !== null) saveQuiet({ quietFrom: m });
                  }}
                  className="w-full rounded-xl border border-fg/[0.08] bg-fg/[0.06] px-3 py-2 text-sm text-fg/85 outline-none focus:border-purple-500/40"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-[11px] font-medium text-fg/45">До</span>
                <input
                  type="time"
                  value={minutesToTime(prefs.quietTo)}
                  onChange={(e) => {
                    const m = timeToMinutes(e.target.value);
                    if (m !== null) saveQuiet({ quietTo: m });
                  }}
                  className="w-full rounded-xl border border-fg/[0.08] bg-fg/[0.06] px-3 py-2 text-sm text-fg/85 outline-none focus:border-purple-500/40"
                />
              </label>
            </div>
            <p className="mt-2 text-[11px] leading-snug text-fg/35">
              {prefs.quietFrom === prefs.quietTo
                ? "Начало и конец совпадают, тихие часы не действуют"
                : `Тишина с ${minutesToTime(prefs.quietFrom)} до ${minutesToTime(prefs.quietTo)}${
                    prefs.quietFrom > prefs.quietTo ? " (через полночь)" : ""
                  }. Уведомления всё равно приходят, но молча.`}
            </p>
            {quietError && <p className="mt-1 text-xs text-red-400">{quietError}</p>}
          </div>
        )}
      </div>

      <h4 className="mb-2 mt-6 px-1 text-xs font-semibold uppercase tracking-wider text-fg/35">Уведомления по чатам</h4>
      {realChats.length === 0 ? (
        <p className="px-1 text-xs text-fg/35">Чатов пока нет</p>
      ) : (
        <div className="space-y-2">
          {realChats.map((c) => (
            <div key={c.id} className="flex items-center gap-3 rounded-2xl bg-fg/[0.04] border border-fg/[0.06] px-3 py-2.5">
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-bold text-white"
                style={{ background: `linear-gradient(135deg, ${c.color}, ${c.color}88)` }}
              >
                {c.avatar}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-fg/85">{c.name}</p>
                <p className="text-[11px] text-fg/35">{c.isGroup ? "Группа" : "Личный чат"}</p>
              </div>
              <Switch checked={c.notifyEnabled !== false} onCheckedChange={(v) => onSetChatNotify(c.id, v)} />
            </div>
          ))}
        </div>
      )}
      <p className="mt-4 px-1 text-[11px] leading-relaxed text-fg/30">
        Уведомления устройства включаются отдельно на каждом телефоне или компьютере. Переключатели чатов действуют на все ваши
        устройства.
      </p>
    </div>
  );
}
