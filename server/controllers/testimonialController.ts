import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const uploadTestimonialImage = async (req: Request, res: Response) => {
  try {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'Aucune image fournie.' });
    }
    const urls = files.map(f => `/uploads/testimonials/${f.filename}`);
    res.json({ urls });
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de l\'upload des images.' });
  }
};

// Public: get active testimonials only
export const getTestimonials = async (req: Request, res: Response) => {
  try {
    const testimonials = await prisma.testimonial.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' }
    });

    // If no testimonials exist in DB yet, return some mock ones
    if (testimonials.length === 0) {
      const mockTestimonials = [
        {
          id: '1',
          name: 'Sarah K.',
          course: 'Magistrature (Admise 2024)',
          message: 'Grâce à Excellence Académie, j\'ai pu réussir mon concours dès la première tentative. Les formateurs sont excellents.',
          rating: 5,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: '2',
          name: 'Marc A.',
          course: 'ENA Cycle Moyen',
          message: 'La plateforme en ligne m\'a permis de réviser depuis Yamoussoukro à mon propre rythme. Je recommande vivement.',
          rating: 5,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: '3',
          name: 'Alice B.',
          course: 'Greffe (Admise 2023)',
          message: 'Les examens blancs réguliers font vraiment la différence. On arrive le jour J avec beaucoup moins de stress.',
          rating: 4,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];
      return res.json(mockTestimonials);
    }

    res.json(testimonials);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch testimonials' });
  }
};

// Public: create a testimonial (from visitors/students)
export const createTestimonial = async (req: Request, res: Response) => {
  try {
    const { name, course, message, rating, images } = req.body;

    if (!name || !course || !message) {
      return res.status(400).json({ error: 'Nom, formation et message sont requis.' });
    }

    if (message.length > 500) {
      return res.status(400).json({ error: 'Le message ne peut pas dépasser 500 caractères.' });
    }

    const ratingValue = Math.min(5, Math.max(1, Number(rating) || 5));
    const imageUrls: string[] = Array.isArray(images) ? images.slice(0, 3) : [];

    const testimonial = await prisma.testimonial.create({
      data: {
        name: name.trim(),
        course: course.trim(),
        message: message.trim(),
        rating: ratingValue,
        isActive: false, // Requires admin approval
      }
    });

    res.status(201).json(testimonial);
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la soumission de l\'avis.' });
  }
};

// Admin: get ALL testimonials (active + inactive)
export const getAllTestimonials = async (req: Request, res: Response) => {
  try {
    const testimonials = await prisma.testimonial.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json(testimonials);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch testimonials' });
  }
};

// Admin: toggle isActive
export const updateTestimonial = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { isActive } = req.body;

    const testimonial = await prisma.testimonial.update({
      where: { id },
      data: { isActive }
    });

    res.json(testimonial);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update testimonial' });
  }
};

// Admin: delete testimonial
export const deleteTestimonial = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    await prisma.testimonial.delete({ where: { id } });
    res.json({ message: 'Testimonial deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete testimonial' });
  }
};
