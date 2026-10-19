self.addEventListener("push", event => {
  let notice = {};
  try { notice = event.data?.json() ?? {}; } catch { /* ignore invalid payloads */ }
  event.waitUntil(self.registration.showNotification(notice.title || "Zero", { body: notice.body || "Você tem um novo aviso.", icon: "/favicon.png", badge: "/favicon.png", tag: "zero-reminder", data: { path: "/chat" } }));
});
self.addEventListener("notificationclick", event => {
  event.notification.close();
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const client of windows) {
      if (new URL(client.url).origin === self.location.origin) { await client.navigate("/chat"); return client.focus(); }
    }
    return self.clients.openWindow("/chat");
  })());
});