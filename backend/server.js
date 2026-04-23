const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();
require('./db/connection'); // Test connexion DB au démarrage
const initDB = require('./db/init'); // Initialisation automatique des tables

const app = express();
const PORT = process.env.PORT || 5000;

// CORS — autoriser les origines connues du frontend
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:5173',
    'https://jaei-frontend.onrender.com',
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

// Fichiers statiques — avatars uploadés localement
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

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
app.use('/api/articles',         articlesRoutes);
app.use('/api/editorial-board',  editorialRoutes);
app.use('/api/ai',               aiRoutes);
app.use('/api/admin',            adminRoutes);

// Démarrage du serveur
app.listen(PORT, async () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📡 Health check: http://localhost:${PORT}/api/health`);
  console.log(`📧 ADMIN_EMAIL: ${process.env.ADMIN_EMAIL || '(non défini)'}`);
  await initDB(); // Créer les tables si elles n'existent pas
});