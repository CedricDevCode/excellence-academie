import { Request, Response } from 'express';
import multer from 'multer';
import prisma from '../utils/prisma';
import { logger } from '../utils/logger';

export const chatUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});
export const libraryUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
});

// ─── Conversations ──────────────────────────────────────────────────────────

async function requireMembership(req: Request, conversationId: string) {
  if (!req.user?.id) return null;
  const member = await prisma.conversationMember.findUnique({
    where: { conversationId_userId: { conversationId, userId: req.user.id } },
  });
  return member;
}

export const listConversations = async (req: Request, res: Response) => {
  try {
    const memberships = await prisma.conversationMember.findMany({
      where: { userId: req.user.id },
      select: { conversationId: true },
    });
    const ids = memberships.map(m => m.conversationId);
    if (ids.length === 0) return res.json([]);

    const conversations = await prisma.conversation.findMany({
      where: { id: { in: ids } },
      orderBy: { updatedAt: 'desc' },
      include: {
        members: {
          include: { user: { select: { id: true, name: true, email: true, image: true, role: true } } },
        },
        messages: {
          where: { hiddenBy: { none: { userId: req.user.id } } },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        _count: { select: { messages: true } },
      },
    });

    res.json(conversations.map(c => ({
      id: c.id,
      title: c.title,
      type: c.type,
      updatedAt: c.updatedAt,
      members: c.members.map(m => m.user),
      lastMessage: c.messages[0]?.content || null,
      lastMessageAt: c.messages[0]?.createdAt || c.updatedAt,
      messageCount: c._count.messages,
    })));
  } catch (error: any) {
    logger.error('listConversations error', 'chat', error);
    res.status(500).json({ error: 'Erreur lors du chargement des conversations' });
  }
};

export const createConversation = async (req: Request, res: Response) => {
  try {
    const { type, title, memberIds } = req.body || {};
    const ids: string[] = Array.isArray(memberIds) ? [...new Set(memberIds.map(String))] : [];
    if (!req.user?.id) return res.status(401).json({ error: 'Non authentifié' });
    if (!ids.includes(req.user.id)) ids.push(req.user.id);
    if (ids.length < 2) return res.status(400).json({ error: 'Au moins un autre membre est requis' });

    const convType = type === 'PROJECT' ? 'PROJECT' : 'DIRECT';
    const t = convType === 'PROJECT' ? String(title || '').trim() : null;
    if (convType === 'PROJECT' && !t) return res.status(400).json({ error: 'Le nom du projet est requis' });

    const conversation = await prisma.conversation.create({
      data: {
        title: t || null,
        type: convType,
        members: { create: ids.map(userId => ({ userId })) },
      },
      include: {
        members: { include: { user: { select: { id: true, name: true, email: true, image: true, role: true } } } },
      },
    });

    res.status(201).json(conversation);
  } catch (error: any) {
    logger.error('createConversation error', 'chat', error);
    res.status(500).json({ error: 'Erreur lors de la création de la conversation' });
  }
};

// ─── Répertoire léger pour l'écran de création (équipe + camarades) ───
export const listContactableUsers = async (req: Request, res: Response) => {
  try {
    const myId = req.user.id;
    // Les membres de l'équipe
    const staff = await prisma.user.findMany({
      where: { role: { in: ['ADMIN', 'TEACHER', 'SECRETARY', 'ACCOUNTANT'] }, isActive: true },
      select: { id: true, name: true, email: true, role: true, image: true },
      take: 200,
    });

    // Les camarades qui partagent au moins une formation
    const mySubs = await prisma.subscription.findMany({
      where: { userId: myId, status: 'ACTIVE' },
      select: { courseId: true },
    });
    const courseIds = mySubs.map(s => s.courseId);
    let classmates: any[] = [];
    if (courseIds.length > 0) {
      const mateSubs = await prisma.subscription.findMany({
        where: { courseId: { in: courseIds }, status: 'ACTIVE', userId: { not: myId } },
        select: { userId: true },
        distinct: ['userId'],
        take: 200,
      });
      const mateIds = mateSubs.map(s => s.userId);
      if (mateIds.length > 0) {
        classmates = await prisma.user.findMany({
          where: { id: { in: mateIds }, isActive: true },
          select: { id: true, name: true, email: true, role: true, image: true },
          take: 200,
        });
      }
    }

    const seen = new Set<string>();
    res.json([...staff, ...classmates].filter(u => { if (seen.has(u.id)) return false; seen.add(u.id); return true; }));
  } catch (error: any) {
    logger.error('listContactableUsers error', 'chat', error);
    res.status(500).json({ error: 'Erreur lors du chargement des contacts' });
  }
};

export const listMessages = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    if (!(await requireMembership(req, id))) return res.status(403).json({ error: 'Accès refusé' });

    const requestedLimit = parseInt(String(req.query.limit ?? ''), 10);
    const limit = Number.isFinite(requestedLimit) && requestedLimit > 0 ? Math.min(100, requestedLimit) : 50;
    const parsedBefore = req.query.before ? new Date(String(req.query.before)) : undefined;
    const before = parsedBefore && !Number.isNaN(parsedBefore.getTime()) ? parsedBefore : undefined;

    const messages = await prisma.message.findMany({
      where: {
        conversationId: id,
        hiddenBy: { none: { userId: req.user.id } },
        ...(before ? { createdAt: { lt: before } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        sender: { select: { id: true, name: true, image: true, role: true } },
        attachments: { select: { id: true, fileName: true, mimeType: true, size: true } },
      },
    });

    res.json(messages.reverse());
  } catch (error: any) {
    logger.error('listMessages error', 'chat', error);
    res.status(500).json({ error: 'Erreur lors du chargement des messages' });
  }
};

export const postMessage = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    if (!(await requireMembership(req, id))) return res.status(403).json({ error: 'Accès refusé' });

    const content = String(req.body?.content || '').trim();
    if (!content) return res.status(400).json({ error: 'Message vide' });

    const message = await prisma.message.create({
      data: { conversationId: id, senderId: req.user.id, content },
      include: {
        sender: { select: { id: true, name: true, image: true, role: true } },
        attachments: true,
      },
    });

    await prisma.conversation.update({ where: { id }, data: { updatedAt: new Date() } });
    res.status(201).json(message);
  } catch (error: any) {
    logger.error('postMessage error', 'chat', error);
    res.status(500).json({ error: 'Erreur lors de l’envoi du message' });
  }
};

export const uploadChatAttachment = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    if (!(await requireMembership(req, id))) return res.status(403).json({ error: 'Accès refusé' });
    if (!req.file) return res.status(400).json({ error: 'Fichier requis' });

    const caption = String(req.body?.caption || '').trim();
    const message = await prisma.message.create({
      data: {
        conversationId: id,
        senderId: req.user.id,
        content: caption || null,
        attachments: {
          create: {
            fileName: req.file.originalname || 'fichier',
            mimeType: req.file.mimetype || 'application/octet-stream',
            data: req.file.buffer as any,
            size: req.file.size || req.file.buffer.length,
          },
        },
      },
      include: {
        sender: { select: { id: true, name: true, image: true, role: true } },
        attachments: { select: { id: true, fileName: true, mimeType: true, size: true } },
      },
    });
    await prisma.conversation.update({ where: { id }, data: { updatedAt: new Date() } });
    res.status(201).json(message);
  } catch (error: any) {
    logger.error('uploadChatAttachment error', 'chat', error);
    res.status(500).json({ error: 'Erreur lors de l’envoi du fichier' });
  }
};

export const downloadAttachment = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const attachment = await prisma.messageAttachment.findUnique({ where: { id } });
    if (!attachment) return res.status(404).json({ error: 'Fichier introuvable' });

    const message = await prisma.message.findUnique({
      where: { id: attachment.messageId },
      select: { conversationId: true },
    });
    if (!message || !(await requireMembership(req, message.conversationId))) {
      return res.status(403).json({ error: 'Accès refusé' });
    }

    const buffer = Buffer.from(attachment.data as any);
    res.setHeader('Content-Type', attachment.mimeType);
    res.setHeader('Content-Length', String(buffer.length));
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(attachment.fileName)}"`);
    res.setHeader('Cache-Control', 'private, max-age=3600');
    res.status(200).end(buffer);
  } catch (error: any) {
    logger.error('downloadAttachment error', 'chat', error);
    res.status(500).json({ error: 'Erreur lors du téléchargement' });
  }
};

const EDIT_WINDOW_MS = 15 * 60 * 1000;

export const editMessage = async (req: Request, res: Response) => {
  try {
    const conversationId = String(req.params.conversationId);
    const messageId = String(req.params.messageId);
    if (!(await requireMembership(req, conversationId))) return res.status(403).json({ error: 'Accès refusé' });

    const message = await prisma.message.findFirst({ where: { id: messageId, conversationId } });
    if (!message) return res.status(404).json({ error: 'Message introuvable' });
    if (message.senderId !== req.user.id) return res.status(403).json({ error: 'Vous ne pouvez modifier que vos messages' });
    if (Date.now() - new Date(message.createdAt).getTime() > EDIT_WINDOW_MS) {
      return res.status(400).json({ error: 'Délai de modification dépassé (15 minutes)' });
    }

    const content = String(req.body?.content || '').trim();
    if (!content) return res.status(400).json({ error: 'Message vide' });
    if (content.length > 4000) return res.status(400).json({ error: 'Message trop long' });

    const updated = await prisma.message.update({
      where: { id: messageId },
      data: { content, editedAt: new Date() },
      include: {
        sender: { select: { id: true, name: true, image: true, role: true } },
        attachments: { select: { id: true, fileName: true, mimeType: true, size: true } },
      },
    });
    res.json(updated);
  } catch (error: any) {
    logger.error('editMessage error', 'chat', error);
    res.status(500).json({ error: 'Erreur lors de la modification' });
  }
};

export const deleteMessage = async (req: Request, res: Response) => {
  try {
    const conversationId = String(req.params.conversationId);
    const messageId = String(req.params.messageId);
    if (!(await requireMembership(req, conversationId))) return res.status(403).json({ error: 'Accès refusé' });

    const message = await prisma.message.findFirst({ where: { id: messageId, conversationId } });
    if (!message) return res.status(404).json({ error: 'Message introuvable' });

    const mode = req.query.mode === 'everyone' ? 'everyone' : 'me';
    if (mode === 'everyone') {
      if (message.senderId !== req.user.id) return res.status(403).json({ error: 'Vous ne pouvez supprimer que vos messages' });
      if (Date.now() - new Date(message.createdAt).getTime() > EDIT_WINDOW_MS) {
        return res.status(400).json({ error: 'Délai dépassé : supprimez ce message pour vous uniquement' });
      }
      await prisma.message.delete({ where: { id: messageId } });
    } else {
      await prisma.hiddenMessage.upsert({
        where: { messageId_userId: { messageId, userId: req.user.id } },
        create: { messageId, userId: req.user.id },
        update: {},
      });
    }
    res.json({ ok: true, mode, messageId });
  } catch (error: any) {
    logger.error('deleteMessage error', 'chat', error);
    res.status(500).json({ error: 'Erreur lors de la suppression' });
  }
};

export const deleteConversation = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    if (!(await requireMembership(req, id))) return res.status(403).json({ error: 'Accès refusé' });

    await prisma.hiddenMessage.deleteMany({
      where: { userId: req.user.id, message: { conversationId: id } },
    });
    await prisma.conversationMember.delete({
      where: { conversationId_userId: { conversationId: id, userId: req.user.id } },
    });
    const remaining = await prisma.conversationMember.count({ where: { conversationId: id } });
    if (remaining === 0) await prisma.conversation.delete({ where: { id } });

    res.json({ ok: true });
  } catch (error: any) {
    logger.error('deleteConversation error', 'chat', error);
    res.status(500).json({ error: 'Erreur lors de la suppression de la discussion' });
  }
};
