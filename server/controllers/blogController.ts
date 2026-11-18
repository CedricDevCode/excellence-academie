import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import DOMPurify from 'isomorphic-dompurify';
import { sendDirectEmail } from './notificationController';

const asString = (value: string | string[] | undefined): string | undefined => {
  if (Array.isArray(value)) return value[0];
  return value;
};

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

// ─── Blog Posts ────────────────────────────────────────────────

export const getBlogPosts = async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, parseInt(asString(req.query.page) || '1'));
    const limit = Math.min(50, Math.max(1, parseInt(asString(req.query.limit) || '12')));
    const skip = (page - 1) * limit;
    const courseId = asString(req.query.courseId);
    const authorId = asString(req.query.authorId);
    const tag = asString(req.query.tag);
    const sort = asString(req.query.sort);

    const where: any = {};
    if (courseId) where.courseId = courseId;
    if (authorId) where.authorId = authorId;
    if (tag) where.tags = { some: { tag: { name: tag } } };

    const orderBy: any = sort === 'popular'
      ? [{ views: 'desc' }, { createdAt: 'desc' }]
      : { createdAt: 'desc' };

    const [posts, total] = await Promise.all([
      prisma.blogPost.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          author: { select: { id: true, name: true, image: true } },
          course: { select: { id: true, title: true } },
          tags: { include: { tag: true } },
        },
      }),
      prisma.blogPost.count({ where }),
    ]);

    const postsWithCounts = await Promise.all(
      posts.map(async (post) => {
        const [commentCount, exerciseCount] = await Promise.all([
          prisma.blogComment.count({ where: { postId: post.id } }),
          prisma.blogExercise.count({ where: { postId: post.id } }),
        ]);
        return { ...post, _count: { comments: commentCount, exercises: exerciseCount } };
      })
    );

    res.json({ posts: postsWithCounts, total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur lors de la récupération des articles" });
  }
};

export const getBlogPostBySlug = async (req: Request, res: Response) => {
  try {
    const post: any = await prisma.blogPost.findUnique({
      where: { slug: asString(req.params.slug) },
      include: {
        author: { select: { id: true, name: true, image: true } },
        course: { select: { id: true, title: true } },
        tags: { include: { tag: true } },
        comments: {
          orderBy: { createdAt: 'desc' },
          include: { author: { select: { id: true, name: true, image: true } } },
        },
        exercises: {
          include: {},
        },
        ratings: { select: { rating: true, userId: true } },
      },
    });
    if (!post) return res.status(404).json({ message: "Article non trouvé" });

    const ratingCount = post.ratings.length;
    const ratingSum = post.ratings.reduce((s: number, r: any) => s + r.rating, 0);
    const ratingAverage = ratingCount ? Math.round((ratingSum / ratingCount) * 10) / 10 : 0;
    const myRating = (req as any).user ? post.ratings.find((r: any) => r.userId === (req as any).user.id)?.rating || 0 : 0;

    const { ratings, ...rest } = post as any;
    res.json({ ...rest, ratingAverage, ratingCount, myRating });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur lors de la récupération de l'article" });
  }
};

// ─── Journal public (sans authentification, indexable SEO) ─────────────
export const getPublicPosts = async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, parseInt(asString(req.query.page) || '1'));
    const limit = Math.min(24, Math.max(1, parseInt(asString(req.query.limit) || '9')));
    const skip = (page - 1) * limit;

    const where = { published: true, audience: 'PUBLIC' };
    const [posts, total] = await Promise.all([
      prisma.blogPost.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, slug: true, title: true, excerpt: true, coverImage: true,
          views: true, titleStyle: true, createdAt: true, updatedAt: true,
          author: { select: { id: true, name: true, image: true } },
          course: { select: { id: true, title: true } },
          tags: { select: { tag: { select: { id: true, name: true } } } },
          _count: { select: { comments: true, exercises: true } },
        },
      }),
      prisma.blogPost.count({ where }),
    ]);

    res.json({ posts, total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    console.error('getPublicPosts error:', error);
    res.status(500).json({ message: "Erreur lors de la récupération des publications" });
  }
};

export const getPublicPostBySlug = async (req: Request, res: Response) => {
  try {
    const post = await prisma.blogPost.findFirst({
      where: { slug: req.params.slug, audience: 'PUBLIC', published: true },
      select: {
        id: true, slug: true, title: true, excerpt: true, content: true, coverImage: true,
        views: true, titleStyle: true, createdAt: true, updatedAt: true,
        author: { select: { id: true, name: true, image: true } },
        course: { select: { id: true, title: true } },
        tags: { select: { tag: { select: { id: true, name: true } } } },
      },
    });
    if (!post) return res.status(404).json({ message: "Publication non trouvée" });
    res.json(post);
  } catch (error) {
    console.error('getPublicPostBySlug error:', error);
    res.status(500).json({ message: "Erreur lors de la récupération de la publication" });
  }
};

export const getPublicPostsRss = async (_req: Request, res: Response) => {
  try {
    const posts = await prisma.blogPost.findMany({
      where: { published: true, audience: 'PUBLIC' },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        slug: true, title: true, excerpt: true, coverImage: true, createdAt: true,
        author: { select: { name: true } },
      },
    });

    const site = 'https://www.exacademie.net';
    const items = posts.map((p) => `
    <item>
      <title>${escapeXml(p.title)}</title>
      <link>${site}/actualites/${p.slug}</link>
      <guid isPermaLink="true">${site}/actualites/${p.slug}</guid>
      <pubDate>${new Date(p.createdAt).toUTCString()}</pubDate>
      <description>${escapeXml(p.excerpt || p.title)}</description>
      <author>${escapeXml(p.author?.name || 'Excellence Académie')}</author>
    </item>`).join('\n');

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Excellence Académie — Journal</title>
    <link>${site}/actualites</link>
    <atom:link href="${site}/rss.xml" rel="self" type="application/rss+xml" />
    <description>Actualités et publications de l'école de préparation aux concours en Côte d'Ivoire.</description>
    <language>fr-CI</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    ${items}
  </channel>
</rss>`;

    res.setHeader('Content-Type', 'application/rss+xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=900');
    res.status(200).send(xml);
  } catch (error) {
    console.error('RSS error:', error);
    res.status(500).send('<?xml version="1.0"?><error>RSS unavailable</error>');
  }
};

function escapeXml(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// ─── Notification des abonnés alertes ───────────────────────────
async function notifySubscribers(post: { title: string; slug: string; excerpt?: string | null }) {
  try {
    const subscribers = await prisma.blogSubscriber.findMany({ select: { email: true } });
    if (subscribers.length === 0) return;
    const frontendUrl = process.env.FRONTEND_URL || 'https://exacademie.net';
    const articleUrl = `${frontendUrl}/blog/${post.slug}`;
    const html = `<div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;background:#fffdf6;border:1px solid #eee">
      <p style="font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:#c97e00;font-weight:700;margin:0 0 8px">Excellence Académie — Alertes Concours</p>
      <h1 style="font-size:22px;line-height:1.3;color:#1c1d1f;margin:0 0 14px">${post.title}</h1>
      <p style="font-size:14px;line-height:1.6;color:#52565a;margin:0 0 18px">${post.excerpt || 'Un nouvel article vient d’être publié sur le blog de l’académie.'}</p>
      <a href="${articleUrl}" style="display:inline-block;background:#c97e00;color:#fff;text-decoration:none;font-weight:700;font-size:14px;padding:12px 24px;border-radius:8px">Lire l’article</a>
      <p style="font-size:11px;color:#999;margin-top:22px">Vous recevez cet email car vous êtes abonné aux alertes concours d’Excellence Académie. <a href="mailto:ea@exacademie.com?subject=Desabonnement" style="color:#c97e00">Se désabonner</a></p>
    </div>`;
    await Promise.allSettled(subscribers.map((s) => sendDirectEmail(s.email, post.title, html)));
  } catch (err) {
    console.error('notifySubscribers error:', err);
  }
}

export const createBlogPost = async (req: Request, res: Response) => {
  try {
    const { title, content, excerpt, coverImage, published, courseId, tags, titleStyle, audience } = req.body;
    if (!title || !content) return res.status(400).json({ message: "Titre et contenu obligatoires" });

    const sanitizedContent = DOMPurify.sanitize(content);

    let slug = slugify(title);
    const existing = await prisma.blogPost.findUnique({ where: { slug } });
    if (existing) slug = `${slug}-${Date.now()}`;

    const post = await prisma.blogPost.create({
      data: {
        slug,
        title,
        content: sanitizedContent,
        excerpt,
        coverImage,
        views: 0,
        titleStyle: titleStyle || null,
        audience: audience === 'PUBLIC' ? 'PUBLIC' : 'MEMBERS',
        published: published ?? true,
        authorId: req.user!.id,
        courseId: courseId || undefined,
        tags: tags?.length ? {
          create: tags.map((name: string) => ({
            tag: { connectOrCreate: { where: { name }, create: { name } } },
          })),
        } : undefined,
      },
      include: {
        author: { select: { id: true, name: true, image: true } },
        tags: { include: { tag: true } },
      },
    });
    if (post.published) await notifySubscribers(post);
    res.status(201).json(post);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur lors de la création de l'article" });
  }
};

export const updateBlogPost = async (req: Request, res: Response) => {
  try {
    const { title, content, excerpt, coverImage, published, courseId, tags, titleStyle, audience } = req.body;
    const id = req.params.id;
    const existing = await prisma.blogPost.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ message: "Article non trouvé" });

    const data: any = {};
    if (title !== undefined) {
      data.title = title;
      data.slug = slugify(title);
      const slugExists = await prisma.blogPost.findUnique({ where: { slug: data.slug } });
      if (slugExists && slugExists.id !== id) data.slug = `${data.slug}-${Date.now()}`;
    }
    if (content !== undefined) data.content = DOMPurify.sanitize(content);
    if (excerpt !== undefined) data.excerpt = excerpt;
    if (coverImage !== undefined) data.coverImage = coverImage;
    if (titleStyle !== undefined) data.titleStyle = titleStyle || null;
    if (audience !== undefined) data.audience = audience === 'PUBLIC' ? 'PUBLIC' : 'MEMBERS';
    if (published !== undefined) data.published = published;
    if (courseId !== undefined) data.courseId = courseId || null;

    if (tags !== undefined) {
      await prisma.blogPostTag.deleteMany({ where: { postId: id } });
      if (tags.length) {
        await prisma.blogPostTag.createMany({
          data: await Promise.all(tags.map(async (name: string) => {
            const tag = await prisma.blogTag.upsert({ where: { name }, update: {}, create: { name } });
            return { postId: id, tagId: tag.id };
          })),
        });
      }
    }

    const post = await prisma.blogPost.update({
      where: { id },
      data,
      include: {
        author: { select: { id: true, name: true, image: true } },
        course: { select: { id: true, title: true } },
        tags: { include: { tag: true } },
      },
    });
    // Passage en mode publié → notifier les abonnés
    if (published === true && existing.published === false) {
      await notifySubscribers(post);
    }
    res.json(post);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur lors de la mise à jour de l'article" });
  }
};

export const deleteBlogPost = async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    await prisma.blogPost.delete({ where: { id } });
    res.json({ message: "Article supprimé avec succès" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur lors de la suppression de l'article" });
  }
};

// ─── Attachments (Post) ──────────────────────────────────────────

export const uploadPostAttachment = async (req: Request, res: Response) => {
  try {
    if (!req.file) return res.status(400).json({ message: "Fichier requis" });
    const url = `/uploads/blog/${req.file.filename}`;
    res.json({ url });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur lors de l'upload" });
  }
};

// ─── Comments ─────────────────────────────────────────────────────

export const getComments = async (req: Request, res: Response) => {
  try {
    const comments = await prisma.blogComment.findMany({
      where: { postId: req.params.postId },
      orderBy: { createdAt: 'desc' },
      include: { author: { select: { id: true, name: true, image: true } } },
    });
    res.json(comments);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur lors de la récupération des commentaires" });
  }
};

export const createComment = async (req: Request, res: Response) => {
  try {
    const { content } = req.body;
    if (!content) return res.status(400).json({ message: "Contenu obligatoire" });

    const comment = await prisma.blogComment.create({
      data: { content: DOMPurify.sanitize(content), authorId: req.user!.id, postId: req.params.postId },
      include: { author: { select: { id: true, name: true, image: true } } },
    });
    res.status(201).json(comment);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur lors de la création du commentaire" });
  }
};

export const deleteComment = async (req: Request, res: Response) => {
  try {
    const comment = await prisma.blogComment.findUnique({ where: { id: req.params.id } });
    if (!comment) return res.status(404).json({ message: "Commentaire non trouvé" });
    if (comment.authorId !== req.user!.id && !['ADMIN', 'TEACHER', 'SECRETARY'].includes(req.user!.role)) {
      return res.status(403).json({ message: "Non autorisé" });
    }
    await prisma.blogComment.delete({ where: { id: req.params.id } });
    res.json({ message: "Commentaire supprimé" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur lors de la suppression" });
  }
};

// ─── Exercises ────────────────────────────────────────────────────

export const createExercise = async (req: Request, res: Response) => {
  try {
    const { title, description } = req.body;
    if (!title) return res.status(400).json({ message: "Titre obligatoire" });

    const exercise = await prisma.blogExercise.create({
      data: { title, description, postId: req.params.postId },
    });
    res.status(201).json(exercise);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur lors de la création de l'exercice" });
  }
};

export const updateExercise = async (req: Request, res: Response) => {
  try {
    const { title, description } = req.body;
    const exercise = await prisma.blogExercise.update({
      where: { id: req.params.id },
      data: { title, description },
    });
    res.json(exercise);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur lors de la mise à jour" });
  }
};

export const deleteExercise = async (req: Request, res: Response) => {
  try {
    await prisma.blogExercise.delete({ where: { id: req.params.id } });
    res.json({ message: "Exercice supprimé" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur lors de la suppression" });
  }
};

export const uploadExerciseAttachment = async (req: Request, res: Response) => {
  try {
    if (!req.file) return res.status(400).json({ message: "Fichier requis" });
    const url = `/uploads/blog/${req.file.filename}`;
    await prisma.blogExercise.update({ where: { id: req.params.id }, data: { fileUrl: url } });
    res.json({ url });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur lors de l'upload" });
  }
};

// ─── Submissions ───────────────────────────────────────────────────

export const submitExercise = async (req: Request, res: Response) => {
  try {
    const { content } = req.body;
    const exerciseId = req.params.id;
    const studentId = req.user!.id;
    const fileUrl = req.file ? `/uploads/blog/${req.file.filename}` : undefined;

    const existing = await prisma.blogSubmission.findUnique({
      where: { exerciseId_studentId: { exerciseId, studentId } },
    });
    if (existing) return res.status(400).json({ message: "Vous avez déjà soumis pour cet exercice" });

    const submission = await prisma.blogSubmission.create({
      data: { content, fileUrl, studentId, exerciseId },
      include: { student: { select: { id: true, name: true } } },
    });
    res.status(201).json(submission);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur lors de la soumission" });
  }
};

export const getSubmissions = async (req: Request, res: Response) => {
  try {
    const exerciseId = req.params.id;
    const exercise = await prisma.blogExercise.findUnique({
      where: { id: exerciseId },
      select: { post: { select: { authorId: true } } },
    });
    if (!exercise) return res.status(404).json({ message: "Exercice non trouvé" });
    if (exercise.post.authorId !== req.user!.id && req.user!.role !== 'ADMIN') {
      return res.status(403).json({ message: "Non autorisé" });
    }

    const submissions = await prisma.blogSubmission.findMany({
      where: { exerciseId },
      include: { student: { select: { id: true, name: true, image: true, email: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(submissions);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur lors de la récupération" });
  }
};

export const evaluateSubmission = async (req: Request, res: Response) => {
  try {
    const { grade, feedback } = req.body;
    const submission = await prisma.blogSubmission.findUnique({
      where: { id: req.params.id },
      include: { exercise: { include: { post: true } } },
    });
    if (!submission) return res.status(404).json({ message: "Soumission non trouvée" });
    if (submission.exercise.post.authorId !== req.user!.id && req.user!.role !== 'ADMIN') {
      return res.status(403).json({ message: "Non autorisé" });
    }

    const updated = await prisma.blogSubmission.update({
      where: { id: req.params.id },
      data: { grade: grade !== undefined ? Number(grade) : undefined, feedback },
      include: { student: { select: { id: true, name: true } } },
    });
    res.json(updated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur lors de l'évaluation" });
  }
};

// ─── Vues & Notes (likes 5 étoiles) ───────────────────────────
export const incrementBlogView = async (req: Request, res: Response) => {
  try {
    const slug = req.params.slug;
    const post = await prisma.blogPost.update({
      where: { slug },
      data: { views: { increment: 1 } },
      select: { id: true, views: true },
    });
    res.json({ views: post.views });
  } catch (error) {
    res.status(404).json({ message: 'Article non trouvé' });
  }
};

export const rateBlogPost = async (req: Request, res: Response) => {
  try {
    const { rating } = req.body || {};
    const value = Math.round(Number(rating));
    if (!Number.isFinite(value) || value < 1 || value > 5) {
      return res.status(400).json({ message: 'La note doit être un entier entre 1 et 5' });
    }
    const postId = req.params.id;
    const userId = req.user!.id;

    await prisma.blogRating.upsert({
      where: { postId_userId: { postId, userId } },
      update: { rating: value },
      create: { postId, userId, rating: value },
    });

    const agg = await prisma.blogRating.aggregate({
      where: { postId },
      _avg: { rating: true },
      _count: { rating: true },
    });
    res.json({
      ratingAverage: Math.round((agg._avg.rating || 0) * 10) / 10,
      ratingCount: agg._count.rating,
      myRating: value,
    });
  } catch (error) {
    console.error('rateBlogPost error:', error);
    res.status(500).json({ message: "Erreur lors de l'enregistrement de la note" });
  }
};

// ─── Alertes Concours (newsletter) ───────────────────────────
export const subscribeBlog = async (req: Request, res: Response) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ message: 'Adresse email invalide' });
    }
    await prisma.blogSubscriber.upsert({
      where: { email },
      update: {},
      create: { email },
    });
    res.status(201).json({ message: "Inscription aux alertes confirmée !" });
  } catch (error) {
    console.error('subscribeBlog error:', error);
    res.status(500).json({ message: "Erreur lors de l'inscription aux alertes" });
  }
};

// ─── Upload de couverture en base (BYTEA) ─────────────────────
export const uploadBlogCover = async (req: Request, res: Response) => {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ message: 'Image requise' });
    }
    const image = await prisma.blogImage.create({
      data: {
        mimeType: req.file.mimetype || 'image/jpeg',
        data: req.file.buffer as any,
        size: req.file.size || req.file.buffer.length,
      },
    });
    res.status(201).json({ url: `/media/blog-images/${image.id}` });
  } catch (error) {
    console.error('uploadBlogCover error:', error);
    res.status(500).json({ message: "Erreur lors de l'upload de la couverture" });
  }
};
