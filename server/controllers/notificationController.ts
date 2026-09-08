import { Request, Response } from 'express';
import nodemailer from 'nodemailer';
import prisma from '../utils/prisma';
import { EventEmitter } from 'events';

export const notificationEvents = new EventEmitter();
notificationEvents.setMaxListeners(100);

export const streamNotifications = (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  // Send initial connection event
  res.write(`data: ${JSON.stringify({ type: 'connected', time: Date.now() })}\n\n`);

  const userId = req.user?.id;
  const userRole = req.user?.role;

  const onNotification = (data: { userId?: string; role?: string; title: string; message: string; id?: string }) => {
    if (!data.userId || data.userId === userId || (data.role && data.role === userRole)) {
      res.write(`data: ${JSON.stringify({ type: 'notification', ...data })}\n\n`);
    }
  };

  notificationEvents.on('notification', onNotification);

  const heartbeat = setInterval(() => {
    res.write(': keepalive\n\n');
  }, 25000);

  req.on('close', () => {
    clearInterval(heartbeat);
    notificationEvents.off('notification', onNotification);
  });
};

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.ethereal.email',
  port: parseInt(process.env.SMTP_PORT || '587'),
  auth: {
    user: process.env.SMTP_USER || 'ethereal.user@ethereal.email',
    pass: process.env.SMTP_PASS || 'ethereal.pass',
  },
});

export const sendDirectEmail = async (to: string, subject: string, html: string) => {
  try {
    const fromAddress = process.env.SMTP_FROM || 'noreply@excellence-academie.ci';
    await transporter.sendMail({
      from: `"Excellence Académie" <${fromAddress}>`,
      to,
      subject,
      html,
    });
  } catch (error) {
    console.error('Error sending direct email:', error);
  }
};

export const getNotifications = async (req: Request, res: Response) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' }
    });
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
};

export const markAsRead = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const notification = await prisma.notification.updateMany({
      where: { id, userId: req.user.id },
      data: { isRead: true }
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update notification' });
  }
};

// Internal function to create a notification and send email
export const sendNotification = async (userId: string, title: string, message: string) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return;

    // 1. Create In-App Notification
    const notif = await prisma.notification.create({
      data: {
        userId,
        title,
        message
      }
    });

    // 1b. Emit real-time notification
    notificationEvents.emit('notification', {
      id: notif.id,
      userId,
      title,
      message,
      createdAt: notif.createdAt
    });

    // 2. Send Email Notification
    const fromAddress = process.env.SMTP_FROM || 'noreply@excellence-academie.ci';
    await transporter.sendMail({
      from: `"Excellence Académie" <${fromAddress}>`,
      to: user.email,
      subject: title,
      html: `
        <div style="font-family: sans-serif; padding: 20px; background: #f4f7f6;">
          <h2 style="color: #0056B3;">${title}</h2>
          <p>${message}</p>
          <hr />
          <p style="font-size: 12px; color: #888;">Ceci est un message automatique, merci de ne pas y répondre.</p>
        </div>
      `
    });
  } catch (error) {
    console.error('Error sending notification:', error);
  }
};

export const sendBulkNotification = async (req: Request, res: Response) => {
  try {
    const { userIds, title, message } = req.body;
    
    if (!userIds || !Array.isArray(userIds) || !title || !message) {
      return res.status(400).json({ error: 'Paramètres manquants ou invalides' });
    }

    // Process each user
    for (const userId of userIds) {
      await sendNotification(userId, title, message);
    }

    res.json({ success: true, count: userIds.length });
  } catch (error) {
    console.error('Error sending bulk notifications:', error);
    res.status(500).json({ error: 'Erreur lors de l\'envoi des notifications groupées' });
  }
};
