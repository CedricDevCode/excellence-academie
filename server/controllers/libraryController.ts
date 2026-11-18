import { Request, Response } from 'express';
import multer from 'multer';
import prisma from '../utils/prisma';
import { logger } from '../utils/logger';

export const libraryUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
});

// ─── Bibliothèque en ligne (réservée aux inscrits + équipe) ─────────

const STAFF_ROLES = ['ADMIN', 'TEACHER', 'SECRETARY', 'ACCOUNTANT'];

export const listLibraryDocuments = async (req: Request, res: Response) => {
  try {
    const { q, courseId } = req.query;
    const where: any = {};
    if (courseId && String(courseId) !== 'all') where.courseId = String(courseId);
    if (q) where.title = { contains: String(q), mode: 'insensitive' };

    const documents = await prisma.libraryDocument.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 200,
      select: {
        id: true, title: true, description: true, courseId: true, courseTitle: true,
        fileName: true, mimeType: true, size: true, uploadedById: true, createdAt: true,
      },
    });
    res.json(documents);
  } catch (error: any) {
    logger.error('listLibraryDocuments error', 'library', error);
    res.status(500).json({ error: 'Erreur lors du chargement de la bibliothèque' });
  }
};

export const uploadLibraryDocument = async (req: Request, res: Response) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Fichier requis' });
    const { title, description, courseId, courseTitle } = req.body || {};
    if (!title) return res.status(400).json({ error: 'Le titre est requis' });

    const doc = await prisma.libraryDocument.create({
      data: {
        title: String(title),
        description: description ? String(description) : null,
        courseId: courseId ? String(courseId) : null,
        courseTitle: courseTitle ? String(courseTitle) : null,
        fileName: req.file.originalname || 'document',
        mimeType: req.file.mimetype || 'application/octet-stream',
        data: req.file.buffer as any,
        size: req.file.size || req.file.buffer.length,
        uploadedById: req.user.id,
      },
      select: {
        id: true, title: true, description: true, courseId: true, courseTitle: true,
        fileName: true, mimeType: true, size: true, uploadedById: true, createdAt: true,
      },
    });

    res.status(201).json(doc);
  } catch (error: any) {
    logger.error('uploadLibraryDocument error', 'library', error);
    res.status(500).json({ error: "Erreur lors de l'ajout du document" });
  }
};

export const downloadLibraryDocument = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const doc = await prisma.libraryDocument.findUnique({ where: { id } });
    if (!doc) return res.status(404).json({ error: 'Document introuvable' });

    const buffer = Buffer.from(doc.data as any);
    res.setHeader('Content-Type', doc.mimeType);
    res.setHeader('Content-Length', String(buffer.length));
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(doc.fileName)}"`);
    res.setHeader('Cache-Control', 'private, max-age=3600');
    res.status(200).end(buffer);
  } catch (error: any) {
    logger.error('downloadLibraryDocument error', 'library', error);
    res.status(500).json({ error: 'Erreur lors du téléchargement' });
  }
};

export const deleteLibraryDocument = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const doc = await prisma.libraryDocument.findUnique({ where: { id } });
    if (!doc) return res.status(404).json({ error: 'Document introuvable' });

    const isAdmin = req.user?.role === 'ADMIN';
    const isUploader = doc.uploadedById === req.user?.id;
    if (!isAdmin && !isUploader) return res.status(403).json({ error: 'Accès refusé' });

    await prisma.libraryDocument.delete({ where: { id } });
    res.json({ message: 'Document supprimé' });
  } catch (error: any) {
    logger.error('deleteLibraryDocument error', 'library', error);
    res.status(500).json({ error: 'Erreur lors de la suppression' });
  }
};
