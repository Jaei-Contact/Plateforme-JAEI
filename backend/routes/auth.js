const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../db/connection');
const { verifyToken } = require('../middleware/auth');

// ============================================
// ROUTE: POST /api/auth/register
// Description: Créer un nouveau compte utilisateur
// ============================================
router.post('/register', async (req, res) => {
  try {
    const { email, password, role, first_name, last_name, firstName, lastName } = req.body;
    const fname = first_name || firstName || null;
    const lname = last_name  || lastName  || null;

    // Validation
    if (!email || !password || !role) {
      return res.status(400).json({
        message: 'Email, password et role sont requis'
      });
    }

    // Vérifie si l'email existe déjà
    const userExists = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    if (userExists.rows.length > 0) {
      return res.status(400).json({
        message: 'Cet email est déjà utilisé'
      });
    }

    // Hash du password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Crée l'utilisateur
    const result = await pool.query(
      `INSERT INTO users (email, password, role, first_name, last_name)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, email, role, first_name, last_name, created_at`,
      [email, hashedPassword, role, fname, lname]
    );

    const user = result.rows[0];

    // Crée le JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'Compte créé avec succès',
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        firstName: user.first_name,
        lastName: user.last_name,
        createdAt: user.created_at
      },
      token
    });

  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ message: 'Erreur serveur lors de l\'inscription' });
  }
});

// ============================================
// ROUTE: POST /api/auth/login
// Description: Se connecter avec email/password
// ============================================
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({ 
        error: 'Email et password sont requis' 
      });
    }

    // Cherche l'utilisateur
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        message: 'Email ou mot de passe incorrect'
      });
    }

    const user = result.rows[0];

    // Vérifie le password
    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) {
      return res.status(401).json({
        message: 'Email ou mot de passe incorrect'
      });
    }

    // Crée le JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Connexion réussie',
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        firstName: user.first_name,
        lastName: user.last_name
      },
      token
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Erreur serveur lors de la connexion' });
  }
});


// ============================================
// ROUTE: GET /api/auth/me
// Description: Retourner l'utilisateur connecté via son token
// ============================================
router.get('/me', verifyToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, email, role, first_name, last_name, created_at FROM users WHERE id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Utilisateur introuvable' });
    }

    const user = result.rows[0];
    res.json({
      user: {
        id:        user.id,
        email:     user.email,
        role:      user.role,
        firstName: user.first_name,
        lastName:  user.last_name,
        createdAt: user.created_at,
      }
    });
  } catch (error) {
    console.error('Me error:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// ============================================
// ROUTE: POST /api/auth/logout
// Description: Déconnexion (invalide côté client)
// ============================================
router.post('/logout', verifyToken, (req, res) => {
  // JWT est stateless — la déconnexion se gère côté client
  // On confirme juste la déconnexion
  res.json({ message: 'Déconnexion réussie' });
});


module.exports = router;