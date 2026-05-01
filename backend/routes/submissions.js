const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const pool = require('../db/connection');
const { verifyToken } = require('../middleware/auth');
const { sendEmail, EMAIL_TEMPLATES } = require('../services/emailService');
const { generateArticleSummary } = require('../services/aiService');

// ── Détection Cloudinary (optionnel) ─────────────────────────
const CLOUDINARY_CONFIGURED =
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET;

const { uploadToCloudinary } = CLOUDINARY_CONFIGURED
  ? require('../services/cloudinaryService')
  : { uploadToCloudinary: null };

// ── Stockage disque local (fallback PDF) ─────────────────────
const SUBMISSIONS_DIR = path.join(__dirname, '../uploads/submissions');
if (!fs.existsSync(SUBMISSIONS_DIR)) fs.mkdirSync(SUBMISSIONS_DIR, { recursive: true });

// Upload fichier (PDF ou Word) — stockage mémoire (buffer utilisé ensuite)
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

/**
 * Upload un fichier soumission et retourne son URL publique.
 * Cloudinary si configuré, sinon disque local.
 */
const handleFileUpload = async (file) => {
  if (CLOUDINARY_CONFIGURED) {
    const result = await uploadToCloudinary(file.buffer, {
      folder: 'jaei/submissions',
      resource_type: 'raw',
      public_id: `submission_${Date.now()}`,
      use_filename: false,
    });
    return result.secure_url;
  } else {
    const ext = path.extname(file.originalname) || '.pdf';
    const filename = `submission_${Date.now()}${ext}`;
    fs.writeFileSync(path.join(SUBMISSIONS_DIR, filename), file.buffer);
    const base = process.env.BACKEND_URL || 'http://localhost:5000';
    return `${base}/uploads/submissions/${filename}`;
  }
};

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
    const { title, abstract, keywords, research_area, co_authors,
            article_type, cover_letter, ai_declaration } = req.body;

    if (!title || !abstract || !keywords || !research_area) {
      return res.status(400).json({ message: 'Title, abstract, keywords and research area are required' });
    }
    if (!article_type) {
      return res.status(400).json({ message: 'Article type is required' });
    }
    if (!req.file) {
      return res.status(400).json({ message: 'A PDF or Word file is required' });
    }

    // Upload du fichier (Cloudinary ou disque local)
    const pdf_url = await handleFileUpload(req.file);

    const aiDecl = ai_declaration === '1' || ai_declaration === true || ai_declaration === 'true';

    const result = await pool.query(
      `INSERT INTO submissions
        (title, abstract, keywords, research_area, co_authors,
         article_type, cover_letter, ai_declaration,
         pdf_url, author_id, status, submitted_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'pending', NOW())
       RETURNING id, title, status, submitted_at`,
      [title, abstract, keywords, research_area, co_authors || null,
       article_type, cover_letter || null, aiDecl,
       pdf_url, req.user.id]
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
// PATCH /api/submissions/:id  — Modifier une soumission (auteur)
//   Autorisé uniquement si statut = pending | submitted
// ────────────────────────────────────────────────────────────
router.patch('/:id', verifyToken, requireRole('author'), async (req, res) => {
  try {
    const { id } = req.params;
    const { title, abstract, keywords, research_area, co_authors } = req.body;

    // Vérifier que la soumission appartient à l'auteur
    const check = await pool.query(
      'SELECT id, status FROM submissions WHERE id = $1 AND author_id = $2',
      [id, req.user.id]
    );
    if (check.rows.length === 0) {
      return res.status(404).json({ message: 'Submission not found or access denied' });
    }

    const { status } = check.rows[0];
    if (!['pending', 'submitted', 'revision_needed'].includes(status)) {
      return res.status(403).json({ message: 'This submission can no longer be edited — it is already under review.' });
    }

    const result = await pool.query(
      `UPDATE submissions SET
        title         = COALESCE($1, title),
        abstract      = COALESCE($2, abstract),
        keywords      = COALESCE($3, keywords),
        research_area = COALESCE($4, research_area),
        co_authors    = COALESCE($5, co_authors),
        updated_at    = NOW()
       WHERE id = $6
       RETURNING id, title, abstract, keywords, research_area, co_authors, status, submitted_at, updated_at`,
      [title || null, abstract || null, keywords || null, research_area || null, co_authors ?? null, id]
    );

    res.json({ message: 'Submission updated successfully', submission: result.rows[0] });
  } catch (err) {
    console.error('PATCH /submissions/:id :', err.message);
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

// ────────────────────────────────────────────────────────────
// DELETE /api/submissions/:id  — Supprimer une soumission
//   • Auteur : seulement ses articles en statut pending | submitted
//   • Admin  : n'importe quel article, à n'importe quel stade
// ────────────────────────────────────────────────────────────
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { role, id: userId } = req.user;

    // Vérifier que l'article existe
    const check = await pool.query(
      'SELECT id, title, status, author_id, pdf_url FROM submissions WHERE id = $1',
      [id]
    );

    if (check.rows.length === 0) {
      return res.status(404).json({ message: 'Submission not found' });
    }

    const submission = check.rows[0];

    if (role === 'author') {
      // L'auteur ne peut supprimer que ses propres articles non encore évalués
      if (submission.author_id !== userId) {
        return res.status(403).json({ message: 'Access denied' });
      }
      if (!['pending', 'submitted'].includes(submission.status)) {
        return res.status(403).json({ message: 'This submission can no longer be deleted — it is already under editorial process.' });
      }
    }
    // Admin : aucune restriction de statut

    // Supprimer les reviews associées d'abord (contrainte FK)
    await pool.query('DELETE FROM reviews WHERE submission_id = $1', [id]);

    // Supprimer les paiements associés
    await pool.query('DELETE FROM payments WHERE submission_id = $1', [id]).catch(() => {});

    // Supprimer la soumission
    await pool.query('DELETE FROM submissions WHERE id = $1', [id]);

    // Nettoyage fichier local (si stockage disque)
    if (submission.pdf_url && submission.pdf_url.includes('/uploads/submissions/')) {
      const filename = submission.pdf_url.split('/uploads/submissions/').pop();
      const filepath = path.join(SUBMISSIONS_DIR, filename);
      if (fs.existsSync(filepath)) {
        fs.unlinkSync(filepath);
      }
    }

    console.log(`🗑️  Soumission #${id} "${submission.title}" supprimée par ${role} #${userId}`);
    res.json({ message: 'Submission deleted successfully' });
  } catch (err) {
    console.error('DELETE /submissions/:id :', err.message);
    res.status(500).json({ message: 'Server error during deletion' });
  }
});

module.exports = router;
