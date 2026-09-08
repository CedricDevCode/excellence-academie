import { useEffect, useRef } from 'react';
import { useToast } from '../components/Toast';

export interface LiveNotificationData {
  id?: string;
  userId?: string;
  title: string;
  message: string;
  createdAt?: string;
}

const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || '/api';

function playNotificationChime() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.08); // A5
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  } catch (e) {
    // Audio might be blocked if user has not interacted with DOM yet
  }
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
        const response = await fetch(`${API_BASE_URL}/notifications/stream`, {
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
                  // Play gentle pleasant chime
                  playNotificationChime();

                  // Show instant toast notification
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
