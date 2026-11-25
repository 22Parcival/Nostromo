import express from 'express';
import session from 'express-session';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import authRoutes from './routes/auth.routes.js';
import postRoutes from './routes/post.routes.js';
import adminRoutes from './routes/admin.routes.js';
import { requireAuth } from './middlewares/auth.middleware.js';
import { initDatabase } from './config/database.js';
import { siteConfigService } from './services/site-config.service.js';

dotenv.config();

initDatabase();

const app = express();
app.set('trust proxy', 1);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Middleware CORS

const ALLOWED_ORIGIN_REGEX = /^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/;
const ALLOWED_ORIGINS = [
  'http:

  'http:

  'http:

  'http://localhost:3000',
  'http:

  'http:

  'http://localhost:5501',
  'http://localhost:5500',
  'https://parcival.fr', 'https://blog.parcival.fr', 'https://panel.parcival.fr', 'https://blog.parcival.fr', 'https://panel.parcival.fr'
];

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && (ALLOWED_ORIGINS.includes(origin) || ALLOWED_ORIGIN_REGEX.test(origin))) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }

  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
  name: 'nostromo_session',
  secret: process.env.SESSION_SECRET || 'nostromo_secret_key_change_in_prod',
  resave: false,
  saveUninitialized: false,
  proxy: true,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    domain: process.env.NODE_ENV === 'production' ? '.parcival.fr' : undefined,
    maxAge: 1000 * 60 * 60 * 24 * 7
  }
}));

// API publique pour parcival.fr (CMS Headless)
app.get('/api/site-config', (req, res) => {
  try {
    const config = siteConfigService.getAll();
    res.json(config);
  } catch (error) {
    console.error('[API ERROR] Get site-config:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération de la configuration du site.' });
  }
});

app.get('/', (req, res, next) => {
  if (req.hostname === 'panel.parcival.fr' || req.headers.host?.startsWith('panel.')) {
    return res.redirect('/admin');
  }
  next();
});

app.use(express.static(path.join(__dirname, '../public')));

// Page de login admin dédiée ou redirection
app.get('/admin/login', (req, res) => {
  if (req.session?.user && req.session.user.id === '751472879421358182') {
    return res.redirect('/admin');
  }
  res.sendFile(path.join(__dirname, '../public/admin/login.html'));
});

// Accès au panel protégé par authentification
app.use('/admin', requireAuth, express.static(path.join(__dirname, '../public/admin')));

app.use('/api/posts', postRoutes);

// Routes d'authentification accessibles sur /auth et /api/auth
app.use('/auth', authRoutes);
app.use('/api/auth', authRoutes);

app.use('/api/admin', requireAuth, adminRoutes);

app.use((req, res) => {
  if (req.accepts('html')) {
    res.status(404).sendFile(path.join(__dirname, '../public/index.html'));
    return;
  }
  res.status(404).json({ error: 'Ressource introuvable' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Nostromo CMS lancé sur http://localhost:${PORT}`);
});
