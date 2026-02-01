import { useState, useEffect } from 'react';
import { getToken, deleteToken, onMessage } from 'firebase/messaging';
import { messaging, VAPID_PUBLIC_KEY } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import {
  createPushSubscription,
  deactivatePushSubscription,
  getActivePushSubscriptions,
  getMaxPushSubscriptionId,
} from '../api/dataconnect-client';

export const usePushNotifications = () => {
  const { user } = useAuth();
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(true);

  // Check browser support
  useEffect(() => {
    if (!('Notification' in window) || !('serviceWorker' in navigator)) {
      setIsSupported(false);
      console.warn('Browser does not support notifications or service workers');
    }
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  // Check existing subscription
  useEffect(() => {
    const checkSubscription = async () => {
      if (!user?.email) return;

      try {
        const result = await getActivePushSubscriptions({ userEmail: user.email });
        const hasActiveSubscription = result.data.pushSubscriptions.length > 0;
        setIsSubscribed(hasActiveSubscription);
        console.log('Subscription check:', hasActiveSubscription ? 'Active' : 'Inactive');
      } catch (err) {
        console.error('Error checking subscription:', err);
      }
    };

    checkSubscription();
  }, [user]);

  const subscribe = async () => {
    if (!user?.email) {
      setError('Debes estar autenticado para activar notificaciones');
      return;
    }

    if (!isSupported) {
      setError('Tu navegador no soporta notificaciones push');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log('Starting subscription process...');

      // 1. Register service worker
      console.log('Registering service worker...');
      const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
      await navigator.serviceWorker.ready;
      console.log('Service worker registered successfully');

      // 2. Request permission
      console.log('Requesting notification permission...');
      const perm = await Notification.requestPermission();
      setPermission(perm);
      console.log('Notification permission:', perm);

      if (perm !== 'granted') {
        throw new Error('Permiso de notificaciones denegado');
      }

      // 3. Get FCM token
      console.log('Getting FCM token...');
      const token = await getToken(messaging, {
        vapidKey: VAPID_PUBLIC_KEY,
        serviceWorkerRegistration: registration,
      });

      if (!token) {
        throw new Error('No se pudo obtener el token de FCM');
      }
      console.log('FCM token obtained:', token.substring(0, 20) + '...');

      // 4. Get next ID for push subscription
      console.log('Getting next subscription ID...');
      const maxIdResult = await getMaxPushSubscriptionId();
      const nextId = (maxIdResult.data.pushSubscriptions?.[0]?.id || 0) + 1;
      console.log('Next subscription ID:', nextId);

      // 5. Save to database
      console.log('Saving subscription to database...');
      const subscriptionData = {
        endpoint: token, // FCM uses token as endpoint
        keys: JSON.stringify({ fcmToken: token }), // Store as JSON
      };

      await createPushSubscription({
        id: nextId,
        userEmail: user.email,
        endpoint: subscriptionData.endpoint,
        keys: subscriptionData.keys,
        userAgent: navigator.userAgent,
      });
      console.log('Subscription saved successfully');

      // 6. Listen for foreground messages
      onMessage(messaging, (payload) => {
        console.log('Foreground message received:', payload);
        // Show browser notification even in foreground
        if (Notification.permission === 'granted') {
          new Notification(payload.notification?.title || 'Recordatorio', {
            body: payload.notification?.body,
            icon: '/icon-192.png',
          });
        }
      });

      setIsSubscribed(true);
      console.log('Successfully subscribed to push notifications');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      setError(message);
      console.error('Error subscribing:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const unsubscribe = async () => {
    if (!user?.email) {
      setError('Debes estar autenticado');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log('Starting unsubscribe process...');

      // 1. Delete FCM token
      console.log('Deleting FCM token...');
      await deleteToken(messaging);
      console.log('FCM token deleted');

      // 2. Deactivate all user's subscriptions in database
      console.log('Fetching active subscriptions...');
      const result = await getActivePushSubscriptions({ userEmail: user.email });
      const subscriptions = result.data.pushSubscriptions;
      console.log(`Found ${subscriptions.length} subscriptions to deactivate`);

      await Promise.all(
        subscriptions.map((sub) => {
          console.log('Deactivating subscription ID:', sub.id);
          return deactivatePushSubscription({ id: sub.id });
        })
      );

      setIsSubscribed(false);
      console.log('Successfully unsubscribed from push notifications');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      setError(message);
      console.error('Error unsubscribing:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isSupported,
    permission,
    isSubscribed,
    isLoading,
    error,
    subscribe,
    unsubscribe,
  };
};
