import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { generateSignedContractPdf } from '../utils/contractPdf';
import { sendNotification, sendNotificationToRole } from './notificationController';

export const signContract = async (req: Request, res: Response) => {
  try {
    const { signatureData, paymentId } = req.body;
    const userId = req.user.id;

    if (!signatureData) {
      return res.status(400).json({ error: 'La signature est requise' });
    }

    const existing = await prisma.contract.findFirst({ where: { userId } });
    if (existing) {
      return res.status(400).json({ error: 'Vous avez déjà signé le contrat' });
    }

    const contract = await prisma.contract.create({
      data: {
        userId,
        paymentId: paymentId || null,
        signatureData,
        ipAddress: req.ip || '',
        userAgent: req.headers['user-agent'] || '',
      },
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

    if (!contract.signatureData) {
      return res.status(400).json({ error: 'Aucune signature trouvée pour ce contrat' });
    }

    const pdfBytes = await generateSignedContractPdf(contract.signatureData, contract.user?.name || undefined);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="contrat-signe-${contractId.slice(0, 8)}.pdf"`);
    res.send(Buffer.from(pdfBytes));
  } catch (error: any) {
    console.error('Generate signed PDF error:', error?.message || error);
    res.status(500).json({ error: 'Erreur lors de la génération du PDF signé' });
  }
};
