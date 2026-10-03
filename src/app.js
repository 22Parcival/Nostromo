import express from 'express';
import session from 'express-session';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import authRoutes from './routes/auth.routes.js';
import postRoutes from './routes/post.routes.js';
import adminRoutes from './routes/admin.routes.js';
import { requireAdmin } from './middlewares/auth.middleware.js';
import { initDatabase } from './config/database.js';

dotenv.config();

// Initialisation de la base de données au démarrage
initDatabase();

const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Middleware pour parser le JSON et les formulaires URL-encoded
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configuration des sessions
app.use(session({
  name: 'nostromo_session',
  secret: process.env.SESSION_SECRET || 'nostromo_secret_key_change_in_prod',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 1000 * 60 * 60 * 24 * 7 // 7 jours
  }
}));

// Routes API Publiques (Articles)
app.use('/api/posts', postRoutes);

// Routes d'authentification (Discord OAuth2)
app.use('/auth', authRoutes);

// Routes API Administration (protégées par liste blanche)
app.use('/api/admin', requireAdmin, adminRoutes);

// Panel d'administration statique (protégé par liste blanche)
app.use('/admin', requireAdmin, express.static(path.join(__dirname, '../public/admin')));

// Site web public statique
app.use(express.static(path.join(__dirname, '../public')));

// Gestion des erreurs 404 globales
app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, '../public/index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Nostromo CMS lancé sur http://localhost:${PORT}`);
});
