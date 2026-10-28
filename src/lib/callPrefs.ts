import { registerPlugin } from "@capacitor/core";
import { isNativeApp } from "@/lib/nativePush";
import { API_PUSH } from "@/pages/index/config";

interface CallPrefsPlugin {
  setSession(options: { sessionId: string; api: string }): Promise<void>;
  canUseFullScreen(): Promise<{ allowed: boolean }>;
  openFullScreenSettings(): Promise<void>;
  takePendingCall(): Promise<{ callId: number; accept: boolean }>;
  addListener(
    event: "callAction",
    handler: (data: { callId: number; accept: boolean }) => void
  ): Promise<{ remove: () => Promise<void> }>;
}

const CallPrefs = registerPlugin<CallPrefsPlugin>("CallPrefs");

export async function syncNativeSession(sessionId: string | null): Promise<void> {
  if (!isNativeApp()) return;
  try {
    const api = API_PUSH.startsWith("/") ? `${window.location.origin}${API_PUSH}` : API_PUSH;
    await CallPrefs.setSession({ sessionId: sessionId || "", api });
  } catch {
    return;
  }
}

export async function fullScreenAllowed(): Promise<boolean> {
  if (!isNativeApp()) return true;
  try {
    return (await CallPrefs.canUseFullScreen()).allowed;
  } catch {
    return true;
  }
}

export async function openFullScreenSettings(): Promise<void> {
  if (!isNativeApp()) return;
  try {
    await CallPrefs.openFullScreenSettings();
  } catch {
    return;
  }
}

export async function takePendingCall(): Promise<{ callId: number; accept: boolean } | null> {
  if (!isNativeApp()) return null;
  try {
    const r = await CallPrefs.takePendingCall();
    return r.callId ? r : null;
  } catch {
    return null;
  }
}

export async function onNativeCallAction(
  handler: (data: { callId: number; accept: boolean }) => void
): Promise<() => void> {
  if (!isNativeApp()) return () => undefined;
  try {
    const sub = await CallPrefs.addListener("callAction", handler);
    return () => {
      sub.remove();
    };
  } catch {
    return () => undefined;
  }
}
