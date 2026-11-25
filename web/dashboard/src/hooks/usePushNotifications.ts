import { useState, useEffect } from 'react';
import { getToken, deleteToken, onMessage } from 'firebase/messaging';
import { messaging, VAPID_PUBLIC_KEY } from '../lib/firebase-messaging';
import { foregroundNotification, subscriptionsForToken } from '../lib/push-device';
import { useAuth } from '../contexts/AuthContext';
import {
  createPushSubscription,
  deactivatePushSubscription,
  getActivePushSubscriptions,
} from '../api/supabase-data-client';

const SW_PATH = '/firebase-messaging-sw.js';

const pushSupported = () => 'Notification' in window && 'serviceWorker' in navigator;

// FCM token of this browser. getToken returns it from cache after the first call.
async function deviceToken(): Promise<string> {
  const registration = await navigator.serviceWorker.register(SW_PATH);
  await navigator.serviceWorker.ready;
  return getToken(messaging, {
    vapidKey: VAPID_PUBLIC_KEY,
    serviceWorkerRegistration: registration,
  });
}

/**
 * Shows pushes that arrive while the dashboard has focus, on every page. It goes
 * through the service worker registration because Android Chrome has no
 * Notification constructor.
 */
export const useForegroundPush = (enabled: boolean) => {
  useEffect(() => {
    if (!enabled || !pushSupported()) return;
    let stopListening: (() => void) | undefined;
    try {
      stopListening = onMessage(messaging, async (payload) => {
        if (Notification.permission !== 'granted') return;
        try {
          const registration = await navigator.serviceWorker.ready;
          const { title, options } = foregroundNotification(payload);
          await registration.showNotification(title, options);
        } catch (err) {
          console.error('Error showing foreground notification:', err);
        }
      });
    } catch (err) {
      console.error('Error listening for foreground messages:', err);
    }
    return stopListening;
  }, [enabled]);
};

export const usePushNotifications = () => {
  const { user } = useAuth();
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(true);

  // Check browser support
  useEffect(() => {
    if (!pushSupported()) {
      setIsSupported(false);
      console.warn('Browser does not support notifications or service workers');
    }
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  // Subscribed means this device, not any device of the user.
  useEffect(() => {
    const userEmail = user?.email;
    if (!userEmail || !pushSupported()) return;
    let cancelled = false;

    const checkSubscription = async () => {
      // Without permission this device holds no subscription, and asking for a
      // token now would prompt the user.
      if (Notification.permission !== 'granted') {
        setIsSubscribed(false);
        return;
      }
      try {
        const [token, result] = await Promise.all([
          deviceToken(),
          getActivePushSubscriptions({ userEmail }),
        ]);
        const mine = subscriptionsForToken(result.data.pushSubscriptions, token);
        if (!cancelled) setIsSubscribed(mine.length > 0);
      } catch (err) {
        console.error('Error checking subscription:', err);
      }
    };

    checkSubscription();
    return () => {
      cancelled = true;
    };
  }, [user?.email]);

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
      // Asked first, while the click still counts as a user gesture.
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== 'granted') {
        throw new Error('Permiso de notificaciones denegado');
      }

      const token = await deviceToken();
      if (!token) {
        throw new Error('No se pudo obtener el token de FCM');
      }

      // One row per device: activating again on the same browser adds nothing.
      const result = await getActivePushSubscriptions({ userEmail: user.email });
      if (subscriptionsForToken(result.data.pushSubscriptions, token).length === 0) {
        await createPushSubscription({
          userEmail: user.email,
          endpoint: token,
          keys: JSON.stringify({ fcmToken: token }),
          userAgent: navigator.userAgent,
        });
      }

      setIsSubscribed(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      setError(message);
      console.error('Error subscribing:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Turns off this device only. The user's other devices keep their subscription.
  const unsubscribe = async () => {
    if (!user?.email) {
      setError('Debes estar autenticado');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const token = await deviceToken();
      const result = await getActivePushSubscriptions({ userEmail: user.email });
      const mine = subscriptionsForToken(result.data.pushSubscriptions, token);
      await Promise.all(mine.map((sub) => deactivatePushSubscription({ id: sub.id })));

      await deleteToken(messaging);
      setIsSubscribed(false);
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
