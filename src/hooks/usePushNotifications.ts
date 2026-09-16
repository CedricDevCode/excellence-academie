import { useState, useEffect, useCallback } from 'react';
import { API_BASE_URL, authFetch } from '../utils/api';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

export function usePushNotifications() {
  const [supported, setSupported] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setLoading(false);
      return;
    }
    setSupported(true);
    navigator.serviceWorker.ready.then((reg) => {
      reg.pushManager.getSubscription().then((sub) => {
        setSubscribed(!!sub);
        setLoading(false);
      });
    });
  }, []);

  const subscribe = useCallback(async () => {
    if (!supported) return false;
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') return false;

      const res = await authFetch(`${API_BASE_URL}/push/vapid-key`);
      const { publicKey, enabled } = await res.json();
      if (!enabled || !publicKey) return false;

      const reg = await navigator.serviceWorker.ready;
      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      const subJSON = subscription.toJSON();
      await authFetch(`${API_BASE_URL}/push/subscribe`, {
        method: 'POST',
        body: JSON.stringify({
          subscription: { endpoint: subJSON.endpoint, keys: subJSON.keys },
          userAgent: navigator.userAgent,
        }),
      });

      setSubscribed(true);
      return true;
    } catch (err) {
      console.error('Erreur abonnement push:', err);
      return false;
    }
  }, [supported]);

  const unsubscribe = useCallback(async () => {
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await authFetch(`${API_BASE_URL}/push/unsubscribe`, {
          method: 'POST',
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
        setSubscribed(false);
      }
    } catch (err) {
      console.error('Erreur désabonnement push:', err);
    }
  }, []);

  return { supported, subscribed, loading, subscribe, unsubscribe };
}
