import webPush from 'web-push';
import prisma from './prisma';

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || '';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '';
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:contact@exacademie.net';

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webPush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

export function isPushEnabled(): boolean {
  return !!(VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY);
}

export function getVapidPublicKey(): string {
  return VAPID_PUBLIC_KEY;
}

export async function savePushSubscription(userId: string, subscription: { endpoint: string; p256dh: string; auth: string }, userAgent?: string) {
  if (!isPushEnabled()) return;
  try {
    await prisma.pushSubscription.upsert({
      where: { userId_endpoint: { userId, endpoint: subscription.endpoint } },
      update: { p256dh: subscription.p256dh, auth: subscription.auth, userAgent },
      create: { userId, endpoint: subscription.endpoint, p256dh: subscription.p256dh, auth: subscription.auth, userAgent },
    });
  } catch (err) {
    console.error('Erreur sauvegarde push subscription:', err);
  }
}

export async function removePushSubscription(endpoint: string) {
  if (!isPushEnabled()) return;
  try {
    await prisma.pushSubscription.deleteMany({ where: { endpoint } });
  } catch {}
}

export async function sendPushNotification(userId: string, title: string, body: string, url?: string, icon?: string) {
  if (!isPushEnabled()) return;

  const subscriptions = await prisma.pushSubscription.findMany({ where: { userId } });
  if (subscriptions.length === 0) return;

  const payload = JSON.stringify({
    title,
    body,
    icon: icon || '/images/logo exacademy.jpeg',
    badge: '/images/logo exacademy.jpeg',
    url: url || '/',
    timestamp: Date.now(),
  });

  const results = await Promise.allSettled(
    subscriptions.map(async (sub) => {
      try {
        await webPush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload,
        );
      } catch (err: any) {
        if (err.statusCode === 404 || err.statusCode === 410) {
          await prisma.pushSubscription.deleteMany({ where: { endpoint: sub.endpoint } });
        }
        throw err;
      }
    })
  );

  const failed = results.filter(r => r.status === 'rejected').length;
  if (failed > 0) {
    console.warn(`Push notifications: ${failed}/${subscriptions.length} échouées pour userId ${userId}`);
  }
}

export async function sendPushToRole(role: string, title: string, body: string, url?: string) {
  if (!isPushEnabled()) return;
  const users = await prisma.user.findMany({ where: { role }, select: { id: true } });
  await Promise.allSettled(users.map(u => sendPushNotification(u.id, title, body, url)));
}

export async function sendPushToMultiple(userIds: string[], title: string, body: string, url?: string) {
  if (!isPushEnabled()) return;
  await Promise.allSettled(userIds.map(id => sendPushNotification(id, title, body, url)));
}
