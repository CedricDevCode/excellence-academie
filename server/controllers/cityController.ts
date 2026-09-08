import { Request, Response } from 'express';
import prisma from '../utils/prisma';

export const getCities = async (_req: Request, res: Response) => {
  try {
    const cities = await prisma.city.findMany({
      orderBy: { name: 'asc' }
    });
    res.json(cities);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch cities' });
  }
};

export const createCity = async (req: Request, res: Response) => {
  try {
    const { name, country } = req.body;
    const existing = await prisma.city.findUnique({ where: { name } });
    if (existing) {
      return res.status(400).json({ error: 'Cette ville existe déjà' });
    }
    const city = await prisma.city.create({
      data: { name, country: country || "Côte d'Ivoire" }
    });
    res.status(201).json(city);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create city' });
  }
};

export const updateCity = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, country, isActive } = req.body;
    const data: any = {};
    if (name !== undefined) data.name = name;
    if (country !== undefined) data.country = country;
    if (isActive !== undefined) data.isActive = isActive;
    const city = await prisma.city.update({ where: { id }, data });
    res.json(city);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update city' });
  }
};

export const deleteCity = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.city.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete city' });
  }
};
