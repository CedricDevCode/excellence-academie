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
import siteConfigRoutes from './routes/siteConfigRoutes';
import categoryRoutes from './routes/categoryRoutes';
import pushRoutes from './routes/pushRoutes';
import appSettingsRoutes from './routes/appSettingsRoutes';
import { seedFormations } from './seed-courses';
import { ensureSessionTables } from './controllers/sessionController';
import { ensureCategoryTable } from './controllers/categoryController';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Ajoute les colonnes pricing manquantes à la table Course si elles n'existent pas (migration manquante) */
async function ensureCourseColumns() {
  // Vérifier si la table Course existe
  const tableCheck: any[] = await prisma.$queryRaw`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_name = 'Course' AND table_schema = 'public'
    ) AS exists
  `;
  if (!tableCheck[0]?.exists) {
    console.log('⚠️ Table Course introuvable, skip colonnes pricing');
    return;
  }

  // Récupérer les colonnes existantes de la table Course
  const existingCols: any[] = await prisma.$queryRaw`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'Course' AND table_schema = 'public'
  `;
  const existingNames = new Set(existingCols.map((c: any) => c.column_name));

  const columns: { name: string; definition: string }[] = [
    { name: 'category', definition: `TEXT DEFAULT 'Général'` },
    { name: 'registrationFee', definition: `DOUBLE PRECISION DEFAULT 45000` },
    { name: 'registrationFeeInterieur', definition: `DOUBLE PRECISION DEFAULT 35000` },
    { name: 'registrationFeeDiaspora', definition: `DOUBLE PRECISION DEFAULT 100000` },
    { name: 'monthlyFee', definition: `DOUBLE PRECISION DEFAULT 30000` },
    { name: 'monthlyFeeInterieur', definition: `DOUBLE PRECISION DEFAULT 25000` },
    { name: 'monthlyFeeOnline', definition: `DOUBLE PRECISION DEFAULT 25000` },
    { name: 'monthlyFeeBoth', definition: `DOUBLE PRECISION DEFAULT 35000` },
    { name: 'monthlyFeeDiaspora', definition: `DOUBLE PRECISION DEFAULT 35000` },
    { name: 'hasPresentiel', definition: `BOOLEAN NOT NULL DEFAULT true` },
    { name: 'hasOnline', definition: `BOOLEAN NOT NULL DEFAULT true` },
  ];

  let added = 0;
  for (const col of columns) {
    if (existingNames.has(col.name)) continue;
    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE "Course" ADD COLUMN "${col.name}" ${col.definition}`);
      added++;
      console.log(`  ➕ Colonne Course."${col.name}" ajoutée`);
    } catch (err: any) {
      // Erreur 42710 = duplicate column (concurrente) — ignorer
      if (err?.code !== '42710') {
        console.warn(`⚠️ [CourseColumns] Colonne ${col.name} :`, err?.message || err);
      }
    }
  }
  if (added > 0) {
    console.log(`✅ ${added} colonne(s) pricing ajoutée(s) à la table Course`);
  } else {
    console.log('✅ Toutes les colonnes pricing de la table Course existent déjà');
  }
}

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
  max: 100, // 100 requêtes auth par fenêtre (GET /me, login, etc.)
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Ne compter que les échecs
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

// ─── Garde de disponibilité (initialisation Prisma) ───────────────────────────
let dbReady = false;

// Le port écoute dès le lancement (voir startServer) : plus jamais d'ECONNREFUSED.
// Tant que `initDatabaseDefaults` n'est pas terminé, on répond 503 + Retry-After
// au lieu de laisser les requêtes partir vers une base pas encore prête.
app.use('/api', (_req, res, next) => {
  if (!dbReady) {
    res.set('Retry-After', '2');
    return res.status(503).json({
      error: 'Le backend est en cours de démarrage. Veuillez réessayer dans un instant.',
    });
  }
  next();
});

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
      // Le navigateur d'un client distant ne peut jamais envoyer un Origin localhost :
      // autoriser n'importe quel port local est donc sûr, en dev comme en dev*Vite
      // dont le port peut dériver (5174 occupé → 5175, 5176…).
      /^https?:\/\/localhost:\d+$/.test(origin);

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
app.use('/api/siteconfig', siteConfigRoutes);
app.use('/api/app-settings', appSettingsRoutes);

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

    // Ajouter les colonnes manquantes à la table Course (migration manquante)
    await ensureCourseColumns();

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

    // Créer la table SiteConfig si elle n'existe pas
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "SiteConfig" (
        "id" TEXT NOT NULL,
        "key" TEXT NOT NULL DEFAULT 'home',
        "content" TEXT NOT NULL DEFAULT '{}',
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "SiteConfig_pkey" PRIMARY KEY ("id")
      )
    `);
    await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "SiteConfig_key_key" ON "SiteConfig"("key")`);
    await prisma.siteConfig.upsert({
      where: { key: 'home' },
      update: {},
      create: { key: 'home', content: '{}' },
    });
    console.log('✅ Table SiteConfig vérifiée/créée');

    // Créer la table AppSettings si elle n'existe pas
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "AppSettings" (
        "id" TEXT NOT NULL,
        "key" TEXT NOT NULL DEFAULT 'global',
        "additionalCourseAmount" DOUBLE PRECISION NOT NULL DEFAULT 10000,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "AppSettings_pkey" PRIMARY KEY ("id")
      )
    `);
    await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "AppSettings_key_key" ON "AppSettings"("key")`);
    await prisma.appSettings.upsert({
      where: { key: 'global' },
      update: {},
      create: { key: 'global', additionalCourseAmount: 10000 },
    });
    console.log('✅ Table AppSettings vérifiée/créée');

    // Créer les bannières « À la une » par défaut en base (pas de contenu en dur
    // côté front) — modifiables depuis le tableau de bord (Actualités À la une).
    // On ne seed que si aucune bannière « À la une » n'a sa propre image
    // (les bannières boutique sans image propre ne peuplent pas le carrousel).
    const featuredWithImage = await prisma.shopBanner.count({
      where: { featured: true, isActive: true, imageUrl: { not: null } },
    });
    if (featuredWithImage === 0) {
      const defaultHomeBanners = [
        { title: 'Sessions Préparatoires aux Concours Directs', subtitle: 'Inscriptions ouvertes pour toutes les filières', imageUrl: '/images/image2.jpeg', displayOrder: 1 },
        { title: 'Encadrement par les Magistrats et Formateurs Experts', subtitle: 'Méthodologie et sujets types décryptés', imageUrl: '/images/image1.jpeg', displayOrder: 2 },
        { title: 'Formations En ligne & Présentiel', subtitle: 'Cours du soir, week-ends et suivi sur mesure', imageUrl: '/images/image3.jpeg', displayOrder: 3 },
        { title: "Excellence Académie à vos côtés", subtitle: "L'école de référence pour votre réussite", imageUrl: '/images/images4.jpeg', displayOrder: 4 },
      ];
      for (const b of defaultHomeBanners) {
        await prisma.shopBanner.create({ data: { ...b, featured: true, isActive: true } });
      }
      console.log('✅ Bannières « À la une » par défaut créées en base');
    }

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
  } finally {
    dbReady = true;
    console.log('✅ Backend prêt à recevoir les requêtes API.');
  }
}

// ─── Keep-Alive Neon (connexion poolée maintenue chaude) ─────────────────────
async function keepAlive() {
  const t0 = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    const ms = Date.now() - t0;
    if (ms > 1000) console.log(`[Neon Keep-Alive] OK (${ms}ms)`);
  } catch (err: any) {
    console.warn('⚠️ [Neon Keep-Alive] Ping DB :', err?.message || err?.code || String(err));
  }
}

// ─── Démarrage du serveur ─────────────────────────────────────────────────────
// Crucial : on écoute le port IMMÉDIATEMENT, sans attendre l'init DB.
// Sinon, pendant les secondes d'initialisation (allers-retours Neon ~5s chacun),
// le port 3001 est fermé → le proxy Vite reçoit ECONNREFUSED →
// "Erreur de connexion au serveur" côté front. Le garde 503 ci-dessus couvre ce
// laps de temps avec une vraie réponse HTTP.
app.listen(port, () => {
  console.log(`🚀 Serveur démarré sur le port ${port} [${isProduction ? 'PRODUCTION' : 'DÉVELOPPEMENT'}]`);

  // Warm-up : ping immédiat pour réveiller la connexion Neon poolée
  keepAlive();
  // Puis ping toutes les 3 minutes pour la maintenir chaude
  setInterval(keepAlive, 180 * 1000);

  // Initialisation de la base + comptes/formations par défaut (en arrière-plan)
  initDatabaseDefaults();
}).on('error', (err: any) => {
  if (err?.code === 'EADDRINUSE') {
    console.error(`❌ Le port ${port} est déjà utilisé. Un autre process écoute déjà dessus ?`);
  } else {
    console.error('❌ Erreur au démarrage du serveur:', err);
  }
  process.exit(1);
});
