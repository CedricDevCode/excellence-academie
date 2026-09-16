import { useEffect } from 'react';
import { usePushNotifications } from '../hooks/usePushNotifications';
import { getMe } from '../utils/api';

export default function PushAutoSubscribe() {
  const { supported, subscribed, subscribe } = usePushNotifications();

  useEffect(() => {
    if (!supported || subscribed) return;

    getMe()
      .then((user) => {
        if (user && Notification.permission === 'granted') {
          subscribe();
        }
      })
      .catch(() => {});
  }, [supported, subscribed, subscribe]);

  return null;
}
