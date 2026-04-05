const express = require('express');
const cors = require('cors');
require('dotenv').config();
require('./db/connection'); // Test connexion DB au démarrage

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Route de test
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'JAEI Backend is running man !',
    timestamp: new Date()
  });
});

// Routes
const authRoutes          = require('./routes/auth');
const submissionsRoutes   = require('./routes/submissions');
const usersRoutes         = require('./routes/users');
const reviewsRoutes       = require('./routes/reviews');
const articlesRoutes      = require('./routes/articles');
const editorialRoutes     = require('./routes/editorial');

app.use('/api/auth',             authRoutes);
app.use('/api/submissions',      submissionsRoutes);
app.use('/api/users',            usersRoutes);
app.use('/api/reviews',          reviewsRoutes);
app.use('/api/articles',         articlesRoutes);
app.use('/api/editorial-board',  editorialRoutes);

// Servir les PDFs uploadés
const path = require('path');
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Démarrage du serveur
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📡 Health check: http://localhost:${PORT}/api/health`);
});