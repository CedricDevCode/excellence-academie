import './env';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import bcrypt from 'bcrypt';
import { prisma } from './utils/prisma';

import userRoutes from './routes/userRoutes';
import paymentRoutes from './routes/paymentRoutes';
import authRoutes from './routes/authRoutes';
import notificationRoutes from './routes/notificationRoutes';
import expenseRoutes from './routes/expenseRoutes';
import statsRoutes from './routes/statsRoutes';
import receiptRoutes from './routes/receiptRoutes';
import testimonialRoutes from './routes/testimonialRoutes';
import courseRoutes from './routes/courseRoutes';
import calendarRoutes from './routes/calendarRoutes';
import evaluationRoutes from './routes/evaluationRoutes';
import cityRoutes from './routes/cityRoutes';
import sessionRoutes from './routes/sessionRoutes';
import subscriptionRoutes from './routes/subscriptionRoutes';
import contractRoutes from './routes/contractRoutes';
import shopRoutes from './routes/shopRoutes';
import bannerRoutes from './routes/bannerRoutes';
import blogRoutes from './routes/blogRoutes';
import categoryRoutes from './routes/categoryRoutes';
import pushRoutes from './routes/pushRoutes';
import { seedFormations } from './seed-courses';
import { ensureSessionTables } from './controllers/sessionController';
import { ensureCategoryTable } from './controllers/categoryController';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const port = process.env.PORT || 3001;
const isProduction = process.env.NODE_ENV === 'production';

// ─── Trust proxy (derrière un reverse proxy Hostinger) ────────────────────────
app.set('trust proxy', 1);

// ─── Vérification critique des variables d'environnement ──────────────────────
if (!process.env.JWT_SECRET) {
  console.error('❌ FATAL: JWT_SECRET est manquant dans les variables d\'environnement.');
  process.exit(1);
}

// ─── Rate Limiting global ─────────────────────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // 200 requêtes par fenêtre
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Trop de requêtes. Réessayez dans 15 minutes.' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20, // 20 tentatives d'auth par fenêtre
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Trop de tentatives. Réessayez dans 15 minutes.' },
});

const webhookLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 30, // 30 webhooks par minute
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Trop de requêtes webhook.' },
});

const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20, // 20 uploads par heure
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Trop d\'uploads. Réessayez dans une heure.' },
});

// ─── Origines CORS autorisées ─────────────────────────────────────────────────
const defaultOrigins = [
  'https://exacademie.net',
  'https://www.exacademie.net',
  'http://exacademie.net',
  'http://www.exacademie.net',
  'http://localhost:5173',
  'http://localhost:4173',
  'http://localhost:5174',
  'http://localhost:3000',
  'https://coral-stork-926590.hostingersite.com',
];

const envOrigins = process.env.CORS_ORIGINS?.split(',').map(s => s.trim()).filter(Boolean) || [];
const frontendUrl = process.env.FRONTEND_URL?.trim();
const allowedOrigins = Array.from(new Set([
  ...defaultOrigins,
  ...envOrigins,
  ...(frontendUrl ? [frontendUrl] : [])
]));

// ─── Security Headers (Helmet) ────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
      workerSrc: ["'self'", 'blob:'],
      connectSrc: ["'self'", 'https://exacademie.net', 'https://www.exacademie.net', 'https://*.hostingersite.com', ...(frontendUrl ? [frontendUrl] : [])],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// ─── Compression ──────────────────────────────────────────────────────────────
app.use(compression());

// ─── Rate Limiting global ─────────────────────────────────────────────────────
app.use('/api', globalLimiter);

// ─── CORS ─────────────────────────────────────────────────────────────────────
app.use(cors({
  origin: (origin, callback) => {
    // Requêtes sans header origin (même origine, curl, serveurs)
    if (!origin) {
      return callback(null, true);
    }
    const isAllowed =
      allowedOrigins.includes(origin) ||
      origin.endsWith('.exacademie.net') ||
      origin.endsWith('.hostingersite.com') ||
      (!isProduction && /^https?:\/\/localhost:\d+$/.test(origin));

    if (isAllowed) {
      return callback(null, true);
    }
    console.warn(`[CORS] Origine bloquée: ${origin}`);
    // callback(null, false) refuse l'accès sans déclencher d'exception 500 interne Express
    return callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

// ─── Webhook GeniusPay — doit être avant express.json() ───────────────────────
app.use('/api/payments/webhook', express.raw({ type: 'application/json' }), (req, _res, next) => {
  if (Buffer.isBuffer(req.body)) {
    (req as any).rawBody = req.body.toString('utf8');
    try {
      req.body = JSON.parse((req as any).rawBody);
    } catch { }
  }
  next();
});

// ─── Body parsers ─────────────────────────────────────────────────────────────
// Limite à 2mb par défaut — évite les attaques DoS par payload surdimensionné
// Les routes nécessitant plus (ex: signature de contrat) gèrent leur propre limite
app.use(express.json({ limit: '2mb' }));
app.use(cookieParser());

// ─── Routes API ───────────────────────────────────────────────────────────────
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/receipts', receiptRoutes);
app.use('/api/testimonials', testimonialRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/push', pushRoutes);
app.use('/api/calendar', calendarRoutes);
app.use('/api/evaluations', evaluationRoutes);
app.use('/api/cities', cityRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/contracts', contractRoutes);
app.use('/api/shop', shopRoutes);
app.use('/api/banners', bannerRoutes);
app.use('/api/blog', blogRoutes);

// ─── Health Check ─────────────────────────────────────────────────────────────
// Protégé par un header secret optionnel en production
app.get('/api/health', async (req, res) => {
  // En production, on peut sécuriser avec un header secret
  const healthSecret = process.env.HEALTH_SECRET;
  if (isProduction && healthSecret) {
    const provided = req.headers['x-health-secret'];
    if (provided !== healthSecret) {
      // Retourner un statut minimal sans révéler d'infos sensibles
      try {
        await prisma.$queryRaw`SELECT 1`;
        return res.status(200).json({ status: 'ok' });
      } catch {
        return res.status(503).json({ status: 'error' });
      }
    }
  }

  try {
    await prisma.$queryRaw`SELECT 1`;
    const userCount = await prisma.user.count();
    const courseCount = await prisma.course.count();
    res.status(200).json({
      status: 'ok',
      database: 'connected',
      userCount,
      courseCount,
      message: 'Backend et base de données opérationnels',
    });
  } catch (err: any) {
    console.error('Health check DB error:', err);
    // Ne pas exposer les détails d'erreur DB en production
    res.status(500).json({
      status: 'error',
      database: 'disconnected',
      message: isProduction
        ? 'Erreur de connexion à la base de données'
        : err?.message || String(err),
    });
  }
});

// ─── Répertoires d'uploads ────────────────────────────────────────────────────
const projectRoot = process.cwd();
const rootUploads = path.resolve(projectRoot, 'uploads');
const serverUploads = path.resolve(projectRoot, 'server', 'uploads');
for (const sub of ['products', 'testimonials', 'blog', 'users', 'sessions', 'categories']) {
  fs.mkdirSync(path.join(rootUploads, sub), { recursive: true });
}

// ─── Fichiers statiques ────────────────────────────────────────────────────────
const candidateDistPaths = [
  path.resolve(projectRoot, 'dist'),
  path.resolve(__dirname, '..', 'dist'),
  path.resolve(__dirname, 'dist'),
];
const distPath = candidateDistPaths.find(p => fs.existsSync(p)) || candidateDistPaths[0];

app.use(express.static(distPath));
// Servir aussi le dossier public/doc (contrat PDF)
const publicDocPath = path.resolve(projectRoot, 'public', 'doc');
if (fs.existsSync(publicDocPath)) {
  app.use('/doc', express.static(publicDocPath));
}
if (fs.existsSync(rootUploads)) {
  app.use('/uploads', express.static(rootUploads));
}
if (fs.existsSync(serverUploads)) {
  app.use('/uploads', express.static(serverUploads));
}
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ─── Fallback SPA ─────────────────────────────────────────────────────────────
app.use((req, res, next) => {
  if (req.method !== 'GET') return next();
  if (req.path.startsWith('/api/')) return next();
  const indexPath = path.join(distPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    return res.sendFile(indexPath);
  }
  next();
});

// ─── Initialisation de la base de données ────────────────────────────────────
async function initDatabaseDefaults() {
  try {
    console.log('🔄 Établissement de la connexion Prisma...');
    await prisma.$connect();
    console.log('✅ Connexion Prisma active.');

    // Initialiser les tables de sessions personnalisées en toute sécurité
    await ensureSessionTables();

    // Initialiser la table Category si elle n'existe pas
    await ensureCategoryTable();

    // Créer la table PendingRegistration si elle n'existe pas
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "PendingRegistration" (
        "id" TEXT NOT NULL,
        "token" TEXT NOT NULL,
        "email" TEXT NOT NULL,
        "passwordHash" TEXT NOT NULL,
        "name" TEXT,
        "telephone" TEXT,
        "pays" TEXT,
        "ville" TEXT,
        "courseIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
        "mode" TEXT,
        "coursParticuliers" BOOLEAN NOT NULL DEFAULT false,
        "monthlyAmount" DOUBLE PRECISION,
        "dateNaissance" TEXT,
        "geniusPhone" TEXT,
        "expiresAt" TIMESTAMP(3) NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "PendingRegistration_pkey" PRIMARY KEY ("id")
      )
    `);
    await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "PendingRegistration_token_key" ON "PendingRegistration"("token")`);
    console.log('✅ Table PendingRegistration vérifiée/créée');

    const adminExists = await prisma.user.findUnique({
      where: { email: 'admin@excellence.ci' },
    });

    if (!adminExists) {
      console.log('🔄 Initialisation des comptes par défaut en cours...');
      // Générer un mot de passe aléatoire fort pour le compte admin initial
      const initialPassword = process.env.ADMIN_INITIAL_PASSWORD;
      if (!initialPassword) {
        console.warn(
          '⚠️  ADMIN_INITIAL_PASSWORD non défini dans .env. ' +
          'Le compte admin ne sera PAS créé automatiquement. ' +
          'Ajoutez ADMIN_INITIAL_PASSWORD dans votre .env puis redémarrez.'
        );
        return;
      }
      const password = await bcrypt.hash(initialPassword, 12);
      const defaultUsers = [
        { email: 'admin@excellence.ci', name: 'Administrateur', role: 'ADMIN' as const, password },
        { email: 'accountant@excellence.ci', name: 'Comptable', role: 'ACCOUNTANT' as const, password },
        { email: 'teacher@excellence.ci', name: 'Enseignant', role: 'TEACHER' as const, password },
        { email: 'student@excellence.ci', name: 'Étudiant Test', role: 'STUDENT' as const, password },
      ];
      for (const u of defaultUsers) {
        await prisma.user.upsert({
          where: { email: u.email },
          update: {},
          create: u,
        });
      }
      // Ne PAS logger le mot de passe
      console.log('✅ Comptes par défaut créés. Mot de passe : voir ADMIN_INITIAL_PASSWORD dans .env');
    }

    const courseCount = await prisma.course.count();
    if (courseCount === 0) {
      console.log('🔄 Initialisation des formations par défaut...');
      await seedFormations();
      console.log('✅ Formations par défaut créées avec succès');
    }
  } catch (err) {
    console.error('Erreur initialisation admin / formations :', err);
  }
}

// ─── Démarrage du serveur ─────────────────────────────────────────────────────
async function startServer() {
  await initDatabaseDefaults();

  app.listen(port, () => {
    console.log(`🚀 Serveur démarré sur le port ${port} [${isProduction ? 'PRODUCTION' : 'DÉVELOPPEMENT'}]`);

    // 🌟 Neon PostgreSQL Keep-Alive (ping toutes les 3 minutes)
    setInterval(async () => {
      try {
        await prisma.$queryRaw`SELECT 1`;
      } catch (err: any) {
        console.warn('⚠️ [Neon Keep-Alive] Ping DB :', err?.message || err);
      }
    }, 180 * 1000);
  });
}

startServer().catch((err) => {
  console.error('❌ Erreur fatale au démarrage du serveur:', err);
  process.exit(1);
});
