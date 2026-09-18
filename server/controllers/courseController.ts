import { Request, Response } from 'express';
import prisma from '../utils/prisma';

const asString = (value: string | string[] | undefined): string | undefined => {
  if (Array.isArray(value)) return value[0];
  return value;
};

async function retryWithNeonWakeup<T>(fn: () => Promise<T>, retries = 2, delayMs = 2000): Promise<T> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      const isConnectionError =
        err?.code === 'P1001' ||
        err?.code === 'P1017' ||
        err?.message?.includes('ECONNREFUSED') ||
        err?.message?.includes('连接') ||
        err?.message?.includes('timeout');
      if (isConnectionError && attempt < retries) {
        console.warn(`⚠️ [Neon Wakeup] Tentative ${attempt + 1}/${retries + 1} échouée, retry dans ${delayMs}ms...`);
        await new Promise(r => setTimeout(r, delayMs));
        continue;
      }
      throw err;
    }
  }
  throw new Error('Unreachable');
}

export const getAllCourses = async (req: Request, res: Response) => {
  try {
    const { category } = req.query;
    const where: any = {};
    if (category && typeof category === 'string' && category.trim() !== '') {
      where.category = category.trim();
    }

    const courses = await retryWithNeonWakeup(() =>
      prisma.course.findMany({
        where,
        orderBy: [{ category: 'asc' }, { title: 'asc' }],
        include: {
          _count: {
            select: {
              subscriptions: true,
              payments: true,
            }
          }
        }
      })
    );
    res.json(courses);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur lors de la récupération des formations" });
  }
};

export const createCourse = async (req: Request, res: Response) => {
  try {
    const {
      title, description, price, category,
      registrationFee, registrationFeeInterieur, registrationFeeDiaspora,
      monthlyFee, monthlyFeeInterieur, monthlyFeeDiaspora,
      hasPresentiel, hasOnline,
    } = req.body;

    if (!title) {
      return res.status(400).json({ message: "Le titre est obligatoire" });
    }

    // Abidjan / en ligne = registrationFee (45 000 par défaut)
    const regFee = registrationFee !== undefined ? Number(registrationFee) : (price !== undefined ? Number(price) : 45000);
    // Intérieur CI = registrationFeeInterieur (35 000 par défaut)
    const regFeeInt = registrationFeeInterieur !== undefined ? Number(registrationFeeInterieur) : 35000;
    // Diaspora = registrationFeeDiaspora (100 000 par défaut)
    const regFeeDias = registrationFeeDiaspora !== undefined ? Number(registrationFeeDiaspora) : 100000;
    const mFee = monthlyFee !== undefined ? Number(monthlyFee) : 30000;
    const mFeeInt = monthlyFeeInterieur !== undefined ? Number(monthlyFeeInterieur) : 25000;
    const mFeeDias = monthlyFeeDiaspora !== undefined ? Number(monthlyFeeDiaspora) : 35000;

    const course = await retryWithNeonWakeup(() =>
      prisma.course.create({
        data: {
          title: title.trim(),
          description: description ? description.trim() : null,
          price: regFee,
          registrationFee: regFee,
          registrationFeeInterieur: regFeeInt,
          registrationFeeDiaspora: regFeeDias,
          monthlyFee: mFee,
          monthlyFeeInterieur: mFeeInt,
          monthlyFeeDiaspora: mFeeDias,
          hasPresentiel: hasPresentiel !== undefined ? Boolean(hasPresentiel) : true,
          hasOnline: hasOnline !== undefined ? Boolean(hasOnline) : true,
          category: category && category.trim() ? category.trim() : "Général",
        },
      })
    );
    res.status(201).json(course);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur lors de la création de la formation" });
  }
};

export const updateCourse = async (req: Request, res: Response) => {
  try {
    const rawId = (req.params as any).id as string | string[] | undefined;
    const id = asString(rawId);

    if (!id) {
      return res.status(400).json({ message: "id de la formation requis" });
    }
    const {
      title, description, price, category,
      registrationFee, registrationFeeInterieur, registrationFeeDiaspora,
      monthlyFee, monthlyFeeInterieur, monthlyFeeDiaspora,
      hasPresentiel, hasOnline,
    } = req.body;

    const regFee = registrationFee !== undefined ? Number(registrationFee) : (price !== undefined ? Number(price) : undefined);
    const regFeeInt = registrationFeeInterieur !== undefined ? Number(registrationFeeInterieur) : undefined;
    const regFeeDias = registrationFeeDiaspora !== undefined ? Number(registrationFeeDiaspora) : undefined;
    const mFee = monthlyFee !== undefined ? Number(monthlyFee) : undefined;
    const mFeeInt = monthlyFeeInterieur !== undefined ? Number(monthlyFeeInterieur) : undefined;
    const mFeeDias = monthlyFeeDiaspora !== undefined ? Number(monthlyFeeDiaspora) : undefined;

    const course = await retryWithNeonWakeup(() =>
      prisma.course.update({
        where: { id },
        data: {
          title: title !== undefined ? title.trim() : undefined,
          description: description !== undefined ? description.trim() : undefined,
          price: regFee !== undefined ? regFee : undefined,
          registrationFee: regFee !== undefined ? regFee : undefined,
          registrationFeeInterieur: regFeeInt !== undefined ? regFeeInt : undefined,
          registrationFeeDiaspora: regFeeDias !== undefined ? regFeeDias : undefined,
          monthlyFee: mFee !== undefined ? mFee : undefined,
          monthlyFeeInterieur: mFeeInt !== undefined ? mFeeInt : undefined,
          monthlyFeeDiaspora: mFeeDias !== undefined ? mFeeDias : undefined,
          hasPresentiel: hasPresentiel !== undefined ? Boolean(hasPresentiel) : undefined,
          hasOnline: hasOnline !== undefined ? Boolean(hasOnline) : undefined,
          category: category !== undefined ? (category ? category.trim() : "Général") : undefined,
        },
      })
    );
    res.json(course);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur lors de la mise à jour de la formation" });
  }
};

export const deleteCourse = async (req: Request, res: Response) => {
  try {
    const rawId = (req.params as any).id as string | string[] | undefined;
    const id = asString(rawId);

    if (!id) {
      return res.status(400).json({ message: "id de la formation requis" });
    }

    await retryWithNeonWakeup(() => prisma.course.delete({ where: { id } }));
    res.json({ message: "Formation supprimée avec succès" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur lors de la suppression de la formation" });
  }
};
