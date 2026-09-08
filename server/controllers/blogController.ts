import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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

    const where: any = {};
    if (courseId) where.courseId = courseId;
    if (authorId) where.authorId = authorId;
    if (tag) where.tags = { some: { tag: { name: tag } } };

    const [posts, total] = await Promise.all([
      prisma.blogPost.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          author: { select: { id: true, name: true, image: true } },
          course: { select: { id: true, title: true } },
          tags: { include: { tag: true } },
          _count: { select: { comments: true, exercises: true } },
        },
      }),
      prisma.blogPost.count({ where }),
    ]);

    res.json({ posts, total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur lors de la récupération des articles" });
  }
};

export const getBlogPostBySlug = async (req: Request, res: Response) => {
  try {
    const post = await prisma.blogPost.findUnique({
      where: { slug: req.params.slug },
      include: {
        author: { select: { id: true, name: true, image: true } },
        course: { select: { id: true, title: true } },
        tags: { include: { tag: true } },
        comments: {
          orderBy: { createdAt: 'desc' },
          include: { author: { select: { id: true, name: true, image: true } } },
        },
        exercises: {
          include: {
            _count: { select: { submissions: true } },
          },
        },
      },
    });
    if (!post) return res.status(404).json({ message: "Article non trouvé" });
    res.json(post);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur lors de la récupération de l'article" });
  }
};

export const createBlogPost = async (req: Request, res: Response) => {
  try {
    const { title, content, excerpt, coverImage, published, courseId, tags } = req.body;
    if (!title || !content) return res.status(400).json({ message: "Titre et contenu obligatoires" });

    let slug = slugify(title);
    const existing = await prisma.blogPost.findUnique({ where: { slug } });
    if (existing) slug = `${slug}-${Date.now()}`;

    const post = await prisma.blogPost.create({
      data: {
        slug,
        title,
        content,
        excerpt,
        coverImage,
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
    res.status(201).json(post);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur lors de la création de l'article" });
  }
};

export const updateBlogPost = async (req: Request, res: Response) => {
  try {
    const { title, content, excerpt, coverImage, published, courseId, tags } = req.body;
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
    if (content !== undefined) data.content = content;
    if (excerpt !== undefined) data.excerpt = excerpt;
    if (coverImage !== undefined) data.coverImage = coverImage;
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
      data: { content, authorId: req.user!.id, postId: req.params.postId },
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
