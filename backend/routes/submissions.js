const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const pool = require('../db/connection');
const { verifyToken } = require('../middleware/auth');
const { sendEmail, EMAIL_TEMPLATES } = require('../services/emailService');
const { generateArticleSummary } = require('../services/aiService');

// ── Upload fichier (PDF ou Word) ─────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../uploads')),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 Mo max
  fileFilter: (req, file, cb) => {
    const allowed = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Seuls les fichiers PDF et Word (.docx) sont acceptés'));
  },
});

// ── Middleware rôle ──────────────────────────────────────────
const requireRole = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ message: 'Accès refusé — rôle insuffisant' });
  }
  next();
};

// ────────────────────────────────────────────────────────────
// POST /api/submissions  — Soumettre un article (auteur)
// ────────────────────────────────────────────────────────────
router.post('/', verifyToken, requireRole('author'), upload.single('pdf'), async (req, res) => {
  try {
    const { title, abstract, keywords, research_area, co_authors } = req.body;

    if (!title || !abstract || !keywords || !research_area) {
      return res.status(400).json({ message: 'Titre, résumé, mots-clés et domaine sont obligatoires' });
    }
    if (!req.file) {
      return res.status(400).json({ message: 'Le fichier PDF ou Word est obligatoire' });
    }

    const pdf_url = `/uploads/${req.file.filename}`;

    const result = await pool.query(
      `INSERT INTO submissions
        (title, abstract, keywords, research_area, co_authors, pdf_url, author_id, status, submitted_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', NOW())
       RETURNING id, title, status, submitted_at`,
      [title, abstract, keywords, research_area, co_authors || null, pdf_url, req.user.id]
    );

    // Génération IA du résumé (non bloquant — en arrière-plan)
    const submissionId = result.rows[0].id;
    generateArticleSummary({ title, abstract, keywords, researchArea: research_area })
      .then(aiSummary => {
        if (aiSummary) {
          pool.query(
            'UPDATE submissions SET ai_summary = $1 WHERE id = $2',
            [aiSummary, submissionId]
          ).catch(e => console.error('IA update DB:', e.message));
        }
      })
      .catch(() => {});

    // Email de confirmation à l'auteur (non bloquant)
    const authorResult = await pool.query(
      'SELECT email, first_name, last_name FROM users WHERE id = $1',
      [req.user.id]
    );
    if (authorResult.rows.length > 0) {
      const author = authorResult.rows[0];
      sendEmail({
        to: author.email,
        ...EMAIL_TEMPLATES.submissionReceived({
          authorName: `${author.first_name} ${author.last_name}`,
          articleTitle: title,
        }),
      }).catch(() => {});
    }

    res.status(201).json({
      message: 'Article soumis avec succès',
      submission: result.rows[0],
    });
  } catch (err) {
    console.error('POST /submissions :', err.message);
    res.status(500).json({ message: 'Erreur serveur lors de la soumission' });
  }
});

// ────────────────────────────────────────────────────────────
// GET /api/submissions  — Lister les soumissions
//   • Auteur : ses articles seulement
//   • Reviewer : les articles qui lui sont assignés
//   • Admin : tous les articles
// ────────────────────────────────────────────────────────────
router.get('/', verifyToken, async (req, res) => {
  try {
    const { role, id: userId } = req.user;
    const { status } = req.query;

    let query, params;

    if (role === 'admin') {
      query = `
        SELECT s.*, u.first_name || ' ' || u.last_name AS author_name, u.email AS author_email
        FROM submissions s
        JOIN users u ON u.id = s.author_id
        ${status ? 'WHERE s.status = $1' : ''}
        ORDER BY s.submitted_at DESC
      `;
      params = status ? [status] : [];

    } else if (role === 'reviewer') {
      query = `
        SELECT s.*, u.first_name || ' ' || u.last_name AS author_name
        FROM submissions s
        JOIN users u ON u.id = s.author_id
        JOIN reviews r ON r.submission_id = s.id
        WHERE r.reviewer_id = $1
        ${status ? 'AND s.status = $2' : ''}
        ORDER BY s.submitted_at DESC
      `;
      params = status ? [userId, status] : [userId];

    } else {
      // author
      query = `
        SELECT * FROM submissions
        WHERE author_id = $1
        ${status ? 'AND status = $2' : ''}
        ORDER BY submitted_at DESC
      `;
      params = status ? [userId, status] : [userId];
    }

    const result = await pool.query(query, params);
    res.json({ submissions: result.rows });
  } catch (err) {
    console.error('GET /submissions :', err.message);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// ────────────────────────────────────────────────────────────
// GET /api/submissions/:id  — Détail d'une soumission
// ────────────────────────────────────────────────────────────
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { role, id: userId } = req.user;

    const result = await pool.query(
      `SELECT s.*, u.first_name || ' ' || u.last_name AS author_name, u.email AS author_email
       FROM submissions s
       JOIN users u ON u.id = s.author_id
       WHERE s.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Soumission introuvable' });
    }

    const sub = result.rows[0];

    // Un auteur ne peut voir que ses propres articles
    if (role === 'author' && sub.author_id !== userId) {
      return res.status(403).json({ message: 'Accès refusé' });
    }

    res.json({ submission: sub });
  } catch (err) {
    console.error('GET /submissions/:id :', err.message);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// ────────────────────────────────────────────────────────────
// PATCH /api/submissions/:id/status  — Changer le statut
//   Admin uniquement
// ────────────────────────────────────────────────────────────
const VALID_STATUSES = ['pending', 'under_review', 'revised', 'accepted', 'rejected', 'published'];

router.patch('/:id/status', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({ message: `Statut invalide. Valeurs acceptées : ${VALID_STATUSES.join(', ')}` });
    }

    const result = await pool.query(
      `UPDATE submissions SET status = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING id, title, status, updated_at`,
      [status, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Soumission introuvable' });
    }

    // Email à l'auteur si publication
    if (status === 'published') {
      const authorResult = await pool.query(
        `SELECT u.email, u.first_name, u.last_name
         FROM submissions s JOIN users u ON u.id = s.author_id
         WHERE s.id = $1`,
        [id]
      );
      if (authorResult.rows.length > 0) {
        const author = authorResult.rows[0];
        sendEmail({
          to: author.email,
          ...EMAIL_TEMPLATES.articlePublished({
            authorName: `${author.first_name} ${author.last_name}`,
            articleTitle: result.rows[0].title,
            articleId: id,
          }),
        }).catch(() => {});
      }
    }

    res.json({ message: 'Statut mis à jour', submission: result.rows[0] });
  } catch (err) {
    console.error('PATCH /submissions/:id/status :', err.message);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

module.exports = router;
