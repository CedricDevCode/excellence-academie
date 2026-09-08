import { useEffect, useRef } from 'react';
import { useToast } from '../components/Toast';

export interface LiveNotificationData {
  id?: string;
  userId?: string;
  title: string;
  message: string;
  createdAt?: string;
}

export function useLiveNotifications(onNewNotification?: (notif: LiveNotificationData) => void) {
  const { toast } = useToast();
  const onNewNotifRef = useRef(onNewNotification);
  onNewNotifRef.current = onNewNotification;

  useEffect(() => {
    let controller = new AbortController();
    let isCancelled = false;
    let reconnectTimeout: any = null;

    async function startStream() {
      try {
        const response = await fetch('/api/notifications/stream', {
          signal: controller.signal,
          credentials: 'include',
        });

        if (!response.ok || !response.body) {
          throw new Error(`HTTP error ${response.status}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (!isCancelled) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith('data: ')) {
              try {
                const parsed = JSON.parse(trimmed.slice(6));
                if (parsed.type === 'notification') {
                  // Show instant toast
                  toast('info', `🔔 ${parsed.title}: ${parsed.message}`);

                  // Dispatch global event for open dashboards to update badge counts
                  window.dispatchEvent(new CustomEvent('newNotificationReceived', { detail: parsed }));

                  // Call local callback if provided
                  onNewNotifRef.current?.(parsed);
                }
              } catch (err) {
                // Ignore parse errors on keepalive
              }
            }
          }
        }
      } catch (err: any) {
        if (err?.name === 'AbortError' || isCancelled) return;
        // Auto-reconnect after 8s on network failure
        reconnectTimeout = setTimeout(() => {
          if (!isCancelled) startStream();
        }, 8000);
      }
    }

    startStream();

    return () => {
      isCancelled = true;
      controller.abort();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
    };
  }, [toast]);
}
