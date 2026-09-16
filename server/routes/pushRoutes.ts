import { Router } from 'express';
import { authenticateToken } from '../middleware/authMiddleware';
import { savePushSubscription, removePushSubscription, getVapidPublicKey, isPushEnabled } from '../utils/push';

const router = Router();

router.get('/vapid-key', (_req, res) => {
  res.json({ publicKey: getVapidPublicKey(), enabled: isPushEnabled() });
});

router.post('/subscribe', authenticateToken, async (req: any, res) => {
  try {
    const { subscription, userAgent } = req.body;
    if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
      return res.status(400).json({ error: 'Subscription invalide' });
    }
    await savePushSubscription(req.user.id, {
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
    }, userAgent || navigator?.userAgent);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/unsubscribe', authenticateToken, async (req: any, res) => {
  try {
    const { endpoint } = req.body;
    if (!endpoint) return res.status(400).json({ error: 'Endpoint requis' });
    await removePushSubscription(endpoint);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
