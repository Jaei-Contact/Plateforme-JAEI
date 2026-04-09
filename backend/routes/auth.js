const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const pool = require('../db/connection');
const { verifyToken } = require('../middleware/auth');
const { sendEmail, EMAIL_TEMPLATES } = require('../services/emailService');
const { uploadToCloudinary } = require('../services/cloudinaryService');

// ── Upload avatar — stockage mémoire → Cloudinary ────────────
const uploadAvatar = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files are accepted'));
  },
});

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
        message: 'Email, password and role are required'
      });
    }

    // Vérifie si l'email existe déjà
    const userExists = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    if (userExists.rows.length > 0) {
      return res.status(400).json({
        message: 'This email is already in use'
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

    // Email de bienvenue (non bloquant)
    sendEmail({
      to: user.email,
      ...EMAIL_TEMPLATES.welcome({
        userName: `${fname || ''} ${lname || ''}`.trim() || user.email,
        role: user.role,
      }),
    }).catch(() => {});

    res.status(201).json({
      message: 'Account created successfully',
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
    res.status(500).json({ message: 'Server error during registration' });
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
        error: 'Email and password are required'
      });
    }

    // Cherche l'utilisateur
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        message: 'Incorrect email or password'
      });
    }

    const user = result.rows[0];

    // Vérifie le password
    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) {
      return res.status(401).json({
        message: 'Incorrect email or password'
      });
    }

    // Crée le JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login successful',
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
    res.status(500).json({ message: 'Server error during login' });
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
      return res.status(404).json({ message: 'User not found' });
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
    res.status(500).json({ message: 'Server error' });
  }
});

// ============================================
// ROUTE: POST /api/auth/forgot-password
// Description: Envoyer un lien de réinitialisation par email
// ============================================
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required' });

    const result = await pool.query('SELECT id, first_name, last_name FROM users WHERE email = $1', [email]);
    // Always respond 200 to avoid revealing whether the email exists
    if (result.rows.length === 0) return res.json({ message: 'If this account exists, an email has been sent.' });

    const user = result.rows[0];
    const token = require('crypto').randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 heure

    await pool.query(
      'UPDATE users SET reset_token = $1, reset_token_expires = $2 WHERE id = $3',
      [token, expires, user.id]
    );

    const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${token}`;
    await sendEmail({
      to: email,
      subject: 'Reset your password — JAEI',
      html: `
        <p>Hello ${user.first_name || ''},</p>
        <p>You have requested a password reset on JAEI.</p>
        <p><a href="${resetLink}" style="color:#1E88C8">Click here to reset your password</a></p>
        <p>This link expires in 1 hour. If you did not request this, please ignore this email.</p>
        <p>The JAEI Team</p>
      `,
    });

    res.json({ message: 'If this account exists, an email has been sent.' });
  } catch (err) {
    console.error('POST /forgot-password :', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// ============================================
// ROUTE: POST /api/auth/reset-password
// Description: Réinitialiser le mot de passe via le token reçu par email
// ============================================
router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) return res.status(400).json({ message: 'Token and password are required' });
    if (password.length < 8) return res.status(400).json({ message: 'Password must be at least 8 characters' });

    // Vérifier le token et son expiration
    const result = await pool.query(
      'SELECT id, reset_token_expires FROM users WHERE reset_token = $1',
      [token]
    );
    if (result.rows.length === 0) {
      return res.status(400).json({ message: 'Invalid or already used link' });
    }
    const user = result.rows[0];
    if (new Date() > new Date(user.reset_token_expires)) {
      return res.status(400).json({ message: 'This link has expired. Please request a new one.' });
    }

    // Hacher le nouveau mot de passe et effacer le token
    const hashed = await bcrypt.hash(password, 12);
    await pool.query(
      `UPDATE users
       SET password = $1, reset_token = NULL, reset_token_expires = NULL, updated_at = NOW()
       WHERE id = $2`,
      [hashed, user.id]
    );

    res.json({ message: 'Password updated successfully.' });
  } catch (err) {
    console.error('POST /reset-password :', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// ============================================
// ROUTE: PATCH /api/auth/me
// Description: Mettre à jour le profil de l'utilisateur connecté
// ============================================
router.patch('/me', verifyToken, async (req, res) => {
  try {
    const { first_name, last_name, institution } = req.body;
    const result = await pool.query(
      `UPDATE users SET
        first_name  = COALESCE($1, first_name),
        last_name   = COALESCE($2, last_name),
        institution = COALESCE($3, institution),
        updated_at  = NOW()
       WHERE id = $4
       RETURNING id, email, role, first_name, last_name, institution, created_at`,
      [first_name || null, last_name || null, institution || null, req.user.id]
    );
    const u = result.rows[0];
    res.json({
      user: {
        id:          u.id,
        email:       u.email,
        role:        u.role,
        firstName:   u.first_name,
        lastName:    u.last_name,
        institution: u.institution,
        createdAt:   u.created_at,
      }
    });
  } catch (error) {
    console.error('PATCH /me error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ============================================
// ROUTE: POST /api/auth/me/avatar
// Description: Upload/mise à jour de la photo de profil
// ============================================
router.post('/me/avatar', verifyToken, uploadAvatar.single('avatar'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file received' });
    const cloudinaryResult = await uploadToCloudinary(req.file.buffer, {
      folder: 'jaei/avatars',
      resource_type: 'image',
      public_id: `avatar_${req.user.id}`,
      overwrite: true,
    });
    const avatarUrl = cloudinaryResult.secure_url;
    await pool.query(
      'UPDATE users SET avatar_url = $1, updated_at = NOW() WHERE id = $2',
      [avatarUrl, req.user.id]
    );
    res.json({ avatar_url: avatarUrl });
  } catch (err) {
    console.error('POST /me/avatar :', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// ============================================
// ROUTE: POST /api/auth/logout
// Description: Déconnexion (invalide côté client)
// ============================================
router.post('/logout', verifyToken, (req, res) => {
  // JWT est stateless — la déconnexion se gère côté client
  // On confirme juste la déconnexion
  res.json({ message: 'Logged out successfully' });
});


module.exports = router;