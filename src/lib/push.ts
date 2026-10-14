import { API_PUSH } from "@/pages/index/config";

const URL_KEY = "trindelka_push_endpoint";

export type PushSupport = "supported" | "unsupported" | "needs-install";

export function pushSupport(): PushSupport {
  const ua = navigator.userAgent;
  const isIos = /iPad|iPhone|iPod/.test(ua);
  const standalone =
    window.matchMedia?.("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;
  if (isIos && !standalone) return "needs-install";
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || typeof Notification === "undefined") {
    return "unsupported";
  }
  return "supported";
}

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) return null;
  try {
    return await navigator.serviceWorker.register("/sw.js");
  } catch {
    return null;
  }
}

export async function getExistingSubscription(): Promise<PushSubscription | null> {
  if (pushSupport() !== "supported") return null;
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    return reg ? await reg.pushManager.getSubscription() : null;
  } catch {
    return null;
  }
}

export async function enablePush(sessionId: string): Promise<{ ok: boolean; error?: string }> {
  if (pushSupport() !== "supported") return { ok: false, error: "Это устройство не поддерживает уведомления" };
  const permission = Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
  if (permission !== "granted") return { ok: false, error: "Уведомления запрещены в настройках браузера" };
  try {
    const reg = (await registerServiceWorker()) || (await navigator.serviceWorker.ready);
    await navigator.serviceWorker.ready;
    const keyRes = await fetch(`${API_PUSH}?action=key`);
    const keyData = await keyRes.json();
    if (!keyRes.ok || !keyData.publicKey) return { ok: false, error: "Сервер уведомлений недоступен" };

    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(keyData.publicKey),
      });
    }
    const res = await fetch(`${API_PUSH}?action=subscribe`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Session-Id": sessionId },
      body: JSON.stringify({ subscription: sub.toJSON() }),
    });
    if (!res.ok) return { ok: false, error: "Не удалось сохранить подписку на сервере" };
    localStorage.setItem(URL_KEY, sub.endpoint);
    return { ok: true };
  } catch {
    return { ok: false, error: "Не удалось включить уведомления на этом устройстве" };
  }
}

export async function disablePush(sessionId: string): Promise<void> {
  try {
    const sub = await getExistingSubscription();
    if (sub) {
      await fetch(`${API_PUSH}?action=unsubscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Session-Id": sessionId },
        body: JSON.stringify({ endpoint: sub.endpoint }),
      });
      await sub.unsubscribe();
    }
  } finally {
    localStorage.removeItem(URL_KEY);
  }
}
