import { Request, Response } from 'express';
import multer from 'multer';
import prisma from '../utils/prisma';
import { generateSignedContractPdf } from '../utils/contractPdf';
import { sendNotification, sendNotificationToRole } from './notificationController';

export const contractUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
});

const DOCUMENT_META = {
  id: true,
  fileName: true,
  mimeType: true,
  size: true,
  version: true,
  uploadedById: true,
  createdAt: true,
  updatedAt: true,
} as const;

const latestDocument = () =>
  prisma.contractDocument.findFirst({
    orderBy: [{ version: 'desc' }, { createdAt: 'desc' }],
  });

export const getContractDocument = async (_req: Request, res: Response) => {
  try {
    const doc = await prisma.contractDocument.findFirst({
      orderBy: [{ version: 'desc' }, { createdAt: 'desc' }],
      select: DOCUMENT_META,
    });
    res.json(doc || null);
  } catch (error: any) {
    console.error('Get contract document error:', error?.message || error);
    res.status(500).json({ error: 'Erreur lors de la récupération du contrat officiel' });
  }
};

export const getContractDocumentFile = async (req: Request, res: Response) => {
  try {
    const id = req.query.id ? String(req.query.id) : undefined;
    const doc = id
      ? await prisma.contractDocument.findUnique({ where: { id } })
      : await latestDocument();
    if (!doc) {
      return res.status(404).json({ error: "Le contrat officiel n'est pas encore disponible" });
    }

    const buffer = Buffer.from(doc.data as any);
    res.setHeader('Content-Type', doc.mimeType);
    res.setHeader('Content-Length', String(buffer.length));
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(doc.fileName)}"`);
    res.setHeader('Cache-Control', 'no-cache');
    res.status(200).end(buffer);
  } catch (error: any) {
    console.error('Get contract document file error:', error?.message || error);
    res.status(500).json({ error: 'Erreur lors de la lecture du contrat officiel' });
  }
};

export const uploadContractDocument = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Fichier PDF requis' });
    }
    const mimeType = req.file.mimetype || 'application/pdf';
    if (mimeType !== 'application/pdf') {
      return res.status(400).json({ error: 'Seuls les fichiers PDF sont acceptés' });
    }

    const previous = await prisma.contractDocument.findFirst({
      orderBy: [{ version: 'desc' }],
      select: { version: true },
    });
    const doc = await prisma.contractDocument.create({
      data: {
        fileName: req.file.originalname || 'contrat.pdf',
        mimeType,
        data: req.file.buffer as any,
        size: req.file.size || req.file.buffer.length,
        version: (previous?.version || 0) + 1,
        uploadedById: req.user.id,
      },
      select: DOCUMENT_META,
    });

    res.status(201).json(doc);
  } catch (error: any) {
    console.error('Upload contract document error:', error?.message || error);
    res.status(500).json({ error: "Erreur lors de l'import du contrat officiel" });
  }
};

export const signContract = async (req: Request, res: Response) => {
  try {
    const { signatureData, paymentId } = req.body;
    const userId = req.user.id;

    if (!signatureData) {
      return res.status(400).json({ error: 'La signature est requise' });
    }

    const existing = await prisma.contract.findFirst({ where: { userId } });
    if (existing?.signatureData) {
      return res.status(400).json({ error: 'Vous avez déjà signé le contrat' });
    }

    const document = await latestDocument();
    if (!document) {
      return res.status(400).json({ error: "Le contrat officiel n'est pas encore disponible" });
    }

    const signatureFields = {
      signatureData,
      contractDocumentId: document.id,
      ipAddress: req.ip || '',
      userAgent: req.headers['user-agent'] || '',
      signedAt: new Date(),
    };

    const contract = existing
      ? await prisma.contract.update({
        where: { id: existing.id },
        data: { ...signatureFields, paymentId: paymentId || existing.paymentId },
      })
      : await prisma.contract.create({
        data: { userId, paymentId: paymentId || null, ...signatureFields },
      });

    // Send in-app notifications
    try {
      const student = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
      await sendNotification(userId, "Contrat de formation validé", "Votre contrat de formation a été signé électroniquement avec succès.");
      await sendNotificationToRole("ADMIN", "Nouveau contrat signé", `L'étudiant(e) ${student?.name || 'Un apprenant'} a validé et signé son contrat de formation.`);
    } catch (e) {
      console.error('Notification error on contract signing:', e);
    }

    res.status(201).json({ success: true, contract });
  } catch (error: any) {
    console.error('Contract sign error:', error?.message || error);
    res.status(500).json({ error: 'Erreur lors de la signature du contrat' });
  }
};

export const getMyContract = async (req: Request, res: Response) => {
  try {
    const contract = await prisma.contract.findFirst({
      where: { userId: req.user.id },
    });
    res.json(contract || null);
  } catch (error: any) {
    console.error('Get my contract error:', error?.message || error);
    res.status(500).json({ error: 'Erreur lors de la récupération du contrat' });
  }
};

export const getAllContracts = async (req: Request, res: Response) => {
  try {
    const contracts = await prisma.contract.findMany({
      include: {
        user: { select: { id: true, name: true, email: true, matricule: true, telephone: true, pays: true, ville: true } },
      },
      orderBy: { signedAt: 'desc' },
    });
    res.json(contracts);
  } catch (error: any) {
    console.error('Get all contracts error:', error?.message || error);
    res.status(500).json({ error: 'Erreur lors de la récupération des contrats' });
  }
};

export const getContractByUserId = async (req: Request, res: Response) => {
  try {
    const userId = req.params.userId as string;
    const contract = await prisma.contract.findFirst({
      where: { userId },
      include: {
        user: { select: { id: true, name: true, email: true, matricule: true, telephone: true, pays: true, ville: true } },
      },
    });
    if (!contract) {
      return res.status(404).json({ error: 'Contrat introuvable pour cet étudiant' });
    }
    res.json(contract);
  } catch (error: any) {
    console.error('Get contract by user error:', error?.message || error);
    res.status(500).json({ error: 'Erreur lors de la récupération du contrat' });
  }
};

export const getSignedPdf = async (req: Request, res: Response) => {
  try {
    const contractId = req.params.id as string;
    const contract = await prisma.contract.findUnique({
      where: { id: contractId },
      include: { user: { select: { name: true } } },
    });

    if (!contract) {
      return res.status(404).json({ error: 'Contrat introuvable' });
    }

    // Seul le titulaire ou un membre du personnel peut télécharger le PDF signé
    const staffRoles = ['ADMIN', 'ACCOUNTANT', 'SECRETARY'];
    if (contract.userId !== req.user.id && !staffRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Accès refusé à ce contrat' });
    }

    if (!contract.signatureData) {
      return res.status(400).json({ error: 'Aucune signature trouvée pour ce contrat' });
    }

    const document = contract.contractDocumentId
      ? await prisma.contractDocument.findUnique({ where: { id: contract.contractDocumentId } })
      : await latestDocument();
    if (!document) {
      return res.status(404).json({ error: 'Document contractuel indisponible' });
    }

    const pdfBytes = await generateSignedContractPdf(
      Buffer.from(document.data as any),
      contract.signatureData,
      contract.user?.name || undefined,
    );

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="contrat-signe-${contractId.slice(0, 8)}.pdf"`);
    res.send(Buffer.from(pdfBytes));
  } catch (error: any) {
    console.error('Generate signed PDF error:', error?.message || error);
    res.status(500).json({ error: 'Erreur lors de la génération du PDF signé' });
  }
};
