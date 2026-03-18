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

// Routes Auth (on va les créer juste après)
const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);

// Démarrage du serveur
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📡 Health check: http://localhost:${PORT}/api/health`);
});