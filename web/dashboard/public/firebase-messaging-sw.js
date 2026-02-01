// Firebase Cloud Messaging Service Worker
importScripts('https://www.gstatic.com/firebasejs/12.4.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.4.0/firebase-messaging-compat.js');

// Initialize Firebase app in service worker
firebase.initializeApp({
  apiKey: "AIzaSyDBdv4WiEWj_EwdPOY3gWEXhI8WY-SqNxc",
  authDomain: "mail-reader-433802.firebaseapp.com",
  projectId: "mail-reader-433802",
  storageBucket: "mail-reader-433802.firebasestorage.app",
  messagingSenderId: "720071149950",
  appId: "1:720071149950:web:5c85f45ff0efdcc6a25ff6"
});

const messaging = firebase.messaging();

// Handle background messages (when app is not in focus)
messaging.onBackgroundMessage((payload) => {
  console.log('[SW] Background message received:', payload);

  const notificationTitle = payload.notification?.title || 'Recordatorio de Pagos';
  const notificationOptions = {
    body: payload.notification?.body || 'Tienes pagos pendientes',
    icon: '/icon-192.png',
    badge: '/badge-72.png',
    tag: 'payment-reminder',
    requireInteraction: true,
    data: {
      url: payload.fcmOptions?.link || '/monthly-control'
    }
  };

  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked');
  event.notification.close();

  const url = event.notification.data?.url || '/monthly-control';

  event.waitUntil(
    clients.openWindow(url)
  );
});
