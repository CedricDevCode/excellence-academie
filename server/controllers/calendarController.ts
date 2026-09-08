import { Request, Response } from 'express';
import prisma from '../utils/prisma';

export const getEvents = async (req: Request, res: Response) => {
  try {
    const { courseId, teacherId, type } = req.query;
    const where: any = {};
    if (courseId) where.courseId = courseId as string;
    if (teacherId) where.teacherId = teacherId as string;
    if (type) where.type = type as string;

    const events = await prisma.calendarEvent.findMany({
      where,
      include: {
        course: { select: { id: true, title: true } },
        teacher: { select: { id: true, name: true } },
      },
      orderBy: { startTime: 'asc' },
    });
    res.json(events);
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
};

export const createEvent = async (req: Request, res: Response) => {
  try {
    const { title, description, startTime, endTime, location, type, color, courseId, teacherId } = req.body;

    if (!title || !startTime) {
      return res.status(400).json({ error: 'Le titre et la date de début sont requis' });
    }

    const event = await prisma.calendarEvent.create({
      data: {
        title,
        description,
        startTime: new Date(startTime),
        endTime: endTime ? new Date(endTime) : null,
        location,
        type: type || 'COURSE',
        color,
        courseId: courseId || null,
        teacherId: teacherId || req.user.id,
      },
    });

    res.status(201).json(event);
  } catch (error) {
    console.error('Error creating event:', error);
    res.status(500).json({ error: 'Failed to create event' });
  }
};

export const updateEvent = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { title, description, startTime, endTime, location, type, color, courseId } = req.body;

    const event = await prisma.calendarEvent.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(description !== undefined && { description }),
        ...(startTime && { startTime: new Date(startTime) }),
        ...(endTime !== undefined && { endTime: endTime ? new Date(endTime) : null }),
        ...(location !== undefined && { location }),
        ...(type && { type }),
        ...(color !== undefined && { color }),
        ...(courseId !== undefined && { courseId: courseId || null }),
      },
    });

    res.json(event);
  } catch (error) {
    console.error('Error updating event:', error);
    res.status(500).json({ error: 'Failed to update event' });
  }
};

export const deleteEvent = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    await prisma.calendarEvent.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting event:', error);
    res.status(500).json({ error: 'Failed to delete event' });
  }
};
