const express = require('express');
const cors = require('cors');
require('dotenv').config();
require('./db/connection'); // Test connexion DB au démarrage

const app = express();
const PORT = process.env.PORT || 5000;

// CORS — autoriser uniquement les origines connues du frontend
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:5173',
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

// ⚠️  Le webhook Stripe doit être monté AVANT express.json() pour que
//     req.body reste un Buffer brut (nécessaire à stripe.webhooks.constructEvent)
app.use('/api/payments', paymentRoutes);

// Body parser JSON global (après le webhook)
app.use(express.json());

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

// Servir les PDFs uploadés
const path = require('path');
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Démarrage du serveur
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📡 Health check: http://localhost:${PORT}/api/health`);
  console.log(`📧 ADMIN_EMAIL: ${process.env.ADMIN_EMAIL || '(non défini)'}`);
});