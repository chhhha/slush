// 슬러시 알림용 Service Worker
// 모바일 브라우저(삼성 인터넷 등)에서 푸시 알림을 지원하기 위해 필요

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  // 알림 클릭 시 앱으로 포커스
  event.waitUntil(
    clients.matchAll({ type: "window" }).then((clientList) => {
      for (const client of clientList) {
        if (client.url && "focus" in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow("/admin");
      }
    })
  );
});
