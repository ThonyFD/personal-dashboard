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
  // Messages with a notification payload (payment reminders, budget alerts) are
  // already shown by the FCM SDK with the sender's webpush tag, icon and link.
  // Showing another one here duplicated every push and forced all of them onto
  // the payment-reminder tag, so a budget alert replaced the payment reminder.
  if (payload.notification) return;

  // Data-only messages: build the notification from the data fields.
  const data = payload.data || {};
  return self.registration.showNotification(data.title || 'Personal Dashboard', {
    body: data.body || '',
    icon: '/logo.svg',
    badge: '/badge-72.png',
    tag: data.tag || 'payment-reminder',
    data: { url: data.link || '/monthly-control' },
  });
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  // Notifications shown by the FCM SDK carry FCM_MSG; the SDK opens their link.
  if (event.notification.data && event.notification.data.FCM_MSG) return;

  event.notification.close();

  const url = event.notification.data?.url || '/monthly-control';

  event.waitUntil(
    clients.openWindow(url)
  );
});
