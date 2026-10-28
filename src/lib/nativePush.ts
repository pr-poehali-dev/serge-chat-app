import { Capacitor } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";
import { API_PUSH } from "@/pages/index/config";

const TOKEN_KEY = "trindelka_fcm_token";

export const isNativeApp = () => Capacitor.isNativePlatform();

let started = false;

async function sendToken(token: string, sessionId: string) {
  try {
    const res = await fetch(`${API_PUSH}?action=register-token`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Session-Id": sessionId },
      body: JSON.stringify({ token, platform: "android" }),
    });
    if (res.ok) localStorage.setItem(TOKEN_KEY, token);
  } catch {
    return;
  }
}

export async function startNativePush(
  sessionId: string,
  onOpen: (info: { chatId: number | null; type: string }) => void
): Promise<{ ok: boolean; error?: string }> {
  if (!isNativeApp()) return { ok: false, error: "not-native" };
  try {
    let perm = await PushNotifications.checkPermissions();
    if (perm.receive === "prompt" || perm.receive === "prompt-with-rationale") {
      perm = await PushNotifications.requestPermissions();
    }
    if (perm.receive !== "granted") return { ok: false, error: "Уведомления запрещены в настройках телефона" };

    await PushNotifications.createChannel({
      id: "messages",
      name: "Сообщения",
      description: "Новые сообщения в чатах",
      importance: 4,
      visibility: 0,
      vibration: true,
    });
    await PushNotifications.createChannel({
      id: "messages_quiet",
      name: "Сообщения в тихие часы",
      description: "Сообщения без звука и вибрации",
      importance: 2,
      visibility: 0,
      vibration: false,
    });
    await PushNotifications.createChannel({
      id: "calls",
      name: "Звонки",
      description: "Входящие голосовые и видеозвонки",
      importance: 5,
      visibility: 1,
      vibration: true,
    });

    if (!started) {
      started = true;
      await PushNotifications.addListener("registration", (t) => sendToken(t.value, sessionId));
      await PushNotifications.addListener("registrationError", () => undefined);
      await PushNotifications.addListener("pushNotificationActionPerformed", (a) => {
        const d = (a.notification.data || {}) as Record<string, string>;
        onOpen({ chatId: d.chatId ? Number(d.chatId) : null, type: d.type || "message" });
      });
    }
    await PushNotifications.register();
    return { ok: true };
  } catch {
    return { ok: false, error: "Не удалось включить уведомления в приложении" };
  }
}

export async function stopNativePush(sessionId: string): Promise<void> {
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) return;
  try {
    await fetch(`${API_PUSH}?action=unregister-token`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Session-Id": sessionId },
      body: JSON.stringify({ token }),
    });
  } finally {
    localStorage.removeItem(TOKEN_KEY);
  }
}
