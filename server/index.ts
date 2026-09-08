import './env';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';

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
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const port = process.env.PORT || 3001;

const defaultOrigins = ['http://localhost:5173', 'http://localhost:4173', 'http://localhost:5174'];
const envOrigins = process.env.CORS_ORIGINS?.split(',').map(s => s.trim()).filter(Boolean) || [];
const frontendUrl = process.env.FRONTEND_URL?.trim();
const allowedOrigins = Array.from(new Set([
  ...defaultOrigins,
  ...envOrigins,
  ...(frontendUrl ? [frontendUrl] : [])
]));

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
      return callback(null, true);
    }
    // Allow requests in production if coming from custom domain
    return callback(null, true);
  },
  credentials: true
}));

app.use('/api/payments/webhook', express.raw({ type: 'application/json' }), (req, _res, next) => {
  if (Buffer.isBuffer(req.body)) {
    (req as any).rawBody = req.body.toString('utf8');
    try {
      req.body = JSON.parse((req as any).rawBody);
    } catch { }
  }
  next();
});
app.use(express.json({ limit: '50mb' }));
app.use(cookieParser());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/receipts', receiptRoutes);
app.use('/api/testimonials', testimonialRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/calendar', calendarRoutes);
app.use('/api/evaluations', evaluationRoutes);
app.use('/api/cities', cityRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/contracts', contractRoutes);
app.use('/api/shop', shopRoutes);
app.use('/api/banners', bannerRoutes);
app.use('/api/blog', blogRoutes);
// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Backend is running' });
});

// Ensure uploads directories exist
const projectRoot = process.cwd();
const rootUploads = path.resolve(projectRoot, 'uploads');
const serverUploads = path.resolve(projectRoot, 'server', 'uploads');
for (const sub of ['products', 'testimonials', 'blog', 'users', 'sessions']) {
  fs.mkdirSync(path.join(rootUploads, sub), { recursive: true });
}

// Serve static files (client bundle & uploads)
const candidateDistPaths = [
  path.resolve(projectRoot, 'dist'),
  path.resolve(__dirname, '..', 'dist'),
  path.resolve(__dirname, 'dist')
];
const distPath = candidateDistPaths.find(p => fs.existsSync(p)) || candidateDistPaths[0];

app.use(express.static(distPath));
if (fs.existsSync(rootUploads)) {
  app.use('/uploads', express.static(rootUploads));
}
if (fs.existsSync(serverUploads)) {
  app.use('/uploads', express.static(serverUploads));
}
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Client-side routing fallback : serve index.html for all non-API routes
app.use((req, res, next) => {
  if (req.method !== 'GET') return next();
  if (req.path.startsWith('/api/')) return next();
  const indexPath = path.join(distPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    return res.sendFile(indexPath);
  }
  next();
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
