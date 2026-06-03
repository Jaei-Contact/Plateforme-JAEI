const express = require('express');
const cors    = require('cors');
const helmet  = require('helmet');
const path    = require('path');
const jwt     = require('jsonwebtoken');
require('dotenv').config();
const pool = require('./db/connection'); // Test connexion DB au démarrage
const initDB = require('./db/init');     // Initialisation automatique des tables

const app  = express();
const PORT = process.env.PORT || 5000;

// ── Confiance au proxy inverse (Render, nginx…) ───────────────
// CRITIQUE : sans cela, tous les utilisateurs partagent l'IP du
// proxy → les rate limiters bloquent tout le monde en même temps.
app.set('trust proxy', 1);

// ── Sécurité HTTP headers (XSS, clickjacking, MIME sniffing…) ─
app.use(helmet({
  // Désactiver CSP ici — le frontend est servi séparément (Render static)
  contentSecurityPolicy: false,
  // Autoriser les iframes pour les visionneuses PDF intégrées (si besoin)
  frameguard: { action: 'sameorigin' },
}));

// CORS — autoriser les origines connues du frontend
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:5173',
    'https://jaei-frontend.onrender.com',
    'https://jaei-journal.org',
    'https://www.jaei-journal.org',
    ...(process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : []),
  ],
  credentials: true,
}));

// Routes
const authRoutes          = require('./routes/auth');
const submissionsRoutes   = require('./routes/submissions');
const usersRoutes         = require('./routes/users');
const reviewsRoutes       = require('./routes/reviews');
const articlesRoutes      = require('./routes/articles');
const editorialRoutes     = require('./routes/editorial');
const aiRoutes            = require('./routes/ai');
const paymentRoutes       = require('./routes/payments');
const adminRoutes         = require('./routes/admin');
const { publicApiLimiter } = require('./middleware/rateLimiter');

// ── Avatars : accès public ────────────────────────────────────
app.use('/uploads/avatars', express.static(path.join(__dirname, 'uploads/avatars')));

// ── PDFs soumissions : accès contrôlé par le statut ──────────
// - Publié   → accès libre
// - Autre    → auteur, reviewer assigné, ou admin uniquement
// Note: en production, les fichiers sont sur Cloudinary (URL externe).
// Ce middleware protège uniquement le stockage disque local (dev).
app.use('/uploads/submissions', async (req, res, next) => {
  const filename = path.basename(req.path);

  // N'autoriser que les noms de fichiers sûrs (alphanumériques + tirets + extension)
  if (!/^[\w-]+\.(pdf|docx)$/i.test(filename)) {
    return res.status(400).end();
  }

  try {
    const subResult = await pool.query(
      "SELECT status, author_id FROM submissions WHERE pdf_url LIKE $1 LIMIT 1",
      [`%${filename}`]
    );

    if (subResult.rows.length === 0) return res.status(404).end();
    const sub = subResult.rows[0];

    // Articles publiés → accès public
    if (sub.status === 'published') return next();

    // Tous les autres statuts → authentification requise
    const authHeader = req.headers['authorization'];
    const tokenStr   = authHeader && authHeader.split(' ')[1];
    if (!tokenStr) return res.status(401).json({ message: 'Authentication required' });

    let decoded;
    try {
      decoded = jwt.verify(tokenStr, process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }

    // Admin → accès total
    if (decoded.role === 'admin') return next();
    // Auteur de la soumission → accès autorisé
    if (decoded.id === sub.author_id) return next();

    // Reviewer assigné → accès autorisé
    const revCheck = await pool.query(
      `SELECT r.id FROM reviews r
       JOIN submissions s ON s.id = r.submission_id
       WHERE s.pdf_url LIKE $1 AND r.reviewer_id = $2 LIMIT 1`,
      [`%${filename}`, decoded.id]
    );
    if (revCheck.rows.length > 0) return next();

    return res.status(403).json({ message: 'Access denied' });
  } catch (err) {
    console.error('PDF access control error:', err.message);
    return res.status(500).json({ message: 'Server error' });
  }
}, express.static(path.join(__dirname, 'uploads/submissions')));

// Body parser JSON global
app.use(express.json());

// Routes paiements
// ⚠️  Si un webhook Stripe est ajouté plus tard, le monter AVANT express.json()
//     avec express.raw({ type: 'application/json' }) sur la route webhook uniquement
app.use('/api/payments', paymentRoutes);

// Route de test
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'JAEI Backend is running man !',
    timestamp: new Date()
  });
});

app.use('/api/auth',             authRoutes);
app.use('/api/submissions',      submissionsRoutes);
app.use('/api/users',            usersRoutes);
app.use('/api/reviews',          reviewsRoutes);
// Routes publiques — limiteur doux contre scraping & DDoS applicatif
app.use('/api/articles',         publicApiLimiter, articlesRoutes);
app.use('/api/editorial-board',  publicApiLimiter, editorialRoutes);
app.use('/api/ai',               aiRoutes);
app.use('/api/admin',            adminRoutes);

// ── Gestionnaire d'erreurs global ────────────────────────────
// Intercepte tout ce qui n'a pas été géré par les routes
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.message, err.stack);
  const status = err.status || err.statusCode || 500;
  const message = process.env.NODE_ENV === 'production'
    ? 'Internal server error'
    : err.message;
  res.status(status).json({ message });
});

// Démarrage du serveur
app.listen(PORT, async () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📡 Health check: http://localhost:${PORT}/api/health`);
  console.log(`📧 ADMIN_EMAIL: ${process.env.ADMIN_EMAIL || '(non défini)'}`);
  await initDB(); // Créer les tables si elles n'existent pas
});