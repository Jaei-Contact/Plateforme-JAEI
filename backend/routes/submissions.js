const express = require('express');
const router = express.Router();
const multer = require('multer');
const pool = require('../db/connection');
const { verifyToken } = require('../middleware/auth');
const { sendEmail, EMAIL_TEMPLATES } = require('../services/emailService');
const { generateArticleSummary } = require('../services/aiService');
const { uploadToCloudinary } = require('../services/cloudinaryService');

// ── Upload fichier (PDF ou Word) — stockage mémoire → Cloudinary
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 Mo max
  fileFilter: (req, file, cb) => {
    const allowed = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Only PDF and Word (.docx) files are accepted'));
  },
});

// ── Middleware rôle ──────────────────────────────────────────
const requireRole = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ message: 'Access denied — insufficient role' });
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
      return res.status(400).json({ message: 'Title, abstract, keywords and research area are required' });
    }
    if (!req.file) {
      return res.status(400).json({ message: 'A PDF or Word file is required' });
    }

    // Upload vers Cloudinary
    const cloudinaryResult = await uploadToCloudinary(req.file.buffer, {
      folder: 'jaei/submissions',
      resource_type: 'raw',
      public_id: `submission_${Date.now()}`,
      use_filename: false,
    });
    const pdf_url = cloudinaryResult.secure_url;

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

    // Notifier l'admin de la nouvelle soumission
    if (process.env.ADMIN_EMAIL) {
      const authorForAdmin = authorResult.rows[0];
      sendEmail({
        to: process.env.ADMIN_EMAIL,
        ...EMAIL_TEMPLATES.newSubmissionAlert({
          authorName: authorForAdmin
            ? `${authorForAdmin.first_name} ${authorForAdmin.last_name}`
            : 'Auteur inconnu',
          articleTitle: title,
          submissionId: result.rows[0].id,
        }),
      }).catch(() => {});
    }

    res.status(201).json({
      message: 'Article submitted successfully',
      submission: result.rows[0],
    });
  } catch (err) {
    console.error('POST /submissions :', err.message);
    res.status(500).json({ message: 'Server error during submission' });
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
    res.status(500).json({ message: 'Server error' });
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
      return res.status(404).json({ message: 'Submission not found' });
    }

    const sub = result.rows[0];

    // An author can only view their own articles
    if (role === 'author' && sub.author_id !== userId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json({ submission: sub });
  } catch (err) {
    console.error('GET /submissions/:id :', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// ────────────────────────────────────────────────────────────
// PATCH /api/submissions/:id/status  — Changer le statut
//   Admin uniquement
// ────────────────────────────────────────────────────────────
const VALID_STATUSES = ['pending', 'submitted', 'under_review', 'revision_needed', 'revised', 'accepted', 'rejected', 'published'];

router.patch('/:id/status', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { status, editor_comment } = req.body;

    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({ message: `Invalid status. Accepted values: ${VALID_STATUSES.join(', ')}` });
    }

    const result = await pool.query(
      `UPDATE submissions
         SET status = $1,
             editor_comment = COALESCE($2, editor_comment),
             updated_at = NOW()
       WHERE id = $3
       RETURNING id, title, status, updated_at`,
      [status, editor_comment || null, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Submission not found' });
    }

    const submission = result.rows[0];

    // Récupérer les infos auteur pour les notifications
    const authorResult = await pool.query(
      `SELECT u.email, u.first_name, u.last_name
       FROM submissions s JOIN users u ON u.id = s.author_id
       WHERE s.id = $1`,
      [id]
    );

    if (authorResult.rows.length > 0) {
      const author = authorResult.rows[0];
      const authorName = `${author.first_name} ${author.last_name}`;

      if (status === 'published') {
        // Email publication spécifique
        sendEmail({
          to: author.email,
          ...EMAIL_TEMPLATES.articlePublished({
            authorName,
            articleTitle: submission.title,
            articleId: id,
          }),
        }).catch(() => {});
      } else if (['accepted', 'rejected', 'revision_needed', 'under_review', 'revised'].includes(status)) {
        // Email générique changement de statut
        sendEmail({
          to: author.email,
          ...EMAIL_TEMPLATES.statusChanged({
            authorName,
            articleTitle: submission.title,
            status,
            editorComment: editor_comment || null,
          }),
        }).catch(() => {});
      }
    }

    res.json({ message: 'Status updated', submission });
  } catch (err) {
    console.error('PATCH /submissions/:id/status :', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
