self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { title: "Трынделка", body: event.data ? event.data.text() : "" };
  }
  if (data.type === "call-cancel") {
    event.waitUntil(
      self.registration.getNotifications({ tag: data.tag || undefined }).then((list) => list.forEach((n) => n.close()))
    );
    return;
  }
  const isCall = data.type === "call";

  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      if (windows.some((w) => w.visibilityState === "visible")) return;
      await self.registration.showNotification(data.title || "Трынделка", {
        body: data.body || "",
        tag: data.tag || undefined,
        renotify: !!data.tag,
        icon: "/icons/icon-192.png",
        badge: "/icons/icon-192.png",
        silent: !!data.silent,
        vibrate: data.silent ? undefined : isCall ? [400, 200, 400, 200, 400] : [150],
        requireInteraction: isCall,
        data: { type: data.type || "message", chatId: data.chatId || null, callId: data.callId || null },
      });
    })()
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const info = event.notification.data || {};
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      if (windows.length > 0) {
        const target = windows[0];
        await target.focus();
        target.postMessage({ type: "open-chat", chatId: info.chatId });
        return;
      }
      await self.clients.openWindow(info.chatId ? "/app?chat=" + info.chatId : "/app");
    })()
  );
});
