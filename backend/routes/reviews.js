const express = require('express');
const router = express.Router();
const pool = require('../db/connection');
const { verifyToken } = require('../middleware/auth');
const { sendEmail, EMAIL_TEMPLATES } = require('../services/emailService');

const requireRole = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ message: 'Access denied — insufficient role' });
  }
  next();
};

// ── Upload du fichier de review (DOC/DOCX/PDF) — Cloudinary ou disque local ──
const multer = require('multer');
const path   = require('path');
const fs     = require('fs');
const CLOUDINARY_CONFIGURED =
  process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET;
const { uploadToCloudinary } = CLOUDINARY_CONFIGURED
  ? require('../services/cloudinaryService')
  : { uploadToCloudinary: null };
const REVIEW_DIR = path.join(__dirname, '../uploads/reviews');
if (!fs.existsSync(REVIEW_DIR)) fs.mkdirSync(REVIEW_DIR, { recursive: true });

const reviewUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = [
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/pdf',
    ];
    ok.includes(file.mimetype) ? cb(null, true) : cb(new Error('Only DOC, DOCX or PDF files are accepted'));
  },
});

const uploadReviewFile = async (file) => {
  const SAFE_EXTS = { '.doc': 1, '.docx': 1, '.pdf': 1 };
  const rawExt = path.extname(file.originalname).toLowerCase();
  const ext = SAFE_EXTS[rawExt] ? rawExt : '.pdf';
  if (CLOUDINARY_CONFIGURED) {
    const result = await uploadToCloudinary(file.buffer, {
      folder: 'jaei/reviews', resource_type: 'raw',
      public_id: `review_${Date.now()}${ext}`, use_filename: false,
    });
    return result.secure_url;
  }
  const filename = `review_${Date.now()}${ext}`;
  fs.writeFileSync(path.join(REVIEW_DIR, filename), file.buffer);
  const base = process.env.BACKEND_URL || 'http://localhost:5000';
  return `${base}/uploads/reviews/${filename}`;
};

// ────────────────────────────────────────────────────────────
// POST /api/reviews/assign
// Assigner un reviewer à une soumission (admin uniquement)
// Body: { submission_id, reviewer_id }
// ────────────────────────────────────────────────────────────
router.post('/assign', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const { submission_id, reviewer_id } = req.body;

    if (!submission_id || !reviewer_id) {
      return res.status(400).json({ message: 'submission_id and reviewer_id are required' });
    }

    // Vérifier que la soumission existe
    const subResult = await pool.query(
      'SELECT id, title, author_id, status FROM submissions WHERE id = $1',
      [submission_id]
    );
    if (subResult.rows.length === 0) {
      return res.status(404).json({ message: 'Submission not found' });
    }

    // Vérifier que le reviewer existe et a le bon rôle
    const revResult = await pool.query(
      'SELECT id, email, first_name, last_name FROM users WHERE id = $1 AND role = $2',
      [reviewer_id, 'reviewer']
    );
    if (revResult.rows.length === 0) {
      return res.status(404).json({ message: 'Reviewer not found' });
    }

    // Éviter les doublons d'assignation
    const existing = await pool.query(
      'SELECT id FROM reviews WHERE submission_id = $1 AND reviewer_id = $2',
      [submission_id, reviewer_id]
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({ message: 'This reviewer is already assigned to this article' });
    }

    // Créer l'assignation
    const result = await pool.query(
      `INSERT INTO reviews (submission_id, reviewer_id, status, created_at)
       VALUES ($1, $2, 'assigned', NOW())
       RETURNING id, submission_id, reviewer_id, status, created_at`,
      [submission_id, reviewer_id]
    );

    // Passer la soumission en "under_review"
    await pool.query(
      `UPDATE submissions SET status = 'under_review', updated_at = NOW() WHERE id = $1`,
      [submission_id]
    );

    // Notifier le reviewer par email
    const submission = subResult.rows[0];
    const reviewer = revResult.rows[0];
    await sendEmail({
      to: reviewer.email,
      ...EMAIL_TEMPLATES.reviewAssigned({
        reviewerName: `${reviewer.first_name} ${reviewer.last_name}`,
        articleTitle: submission.title,
      }),
    });

    // Notifier l'auteur que son article passe en évaluation — uniquement à la 1ʳᵉ
    // assignation (statut précédent ≠ under_review), pour ne pas le spammer à chaque
    // reviewer supplémentaire.
    if (submission.status !== 'under_review') {
      try {
        const authorRows = await pool.query(
          'SELECT email, first_name, last_name FROM users WHERE id = $1',
          [submission.author_id]
        );
        if (authorRows.rows.length > 0) {
          const a = authorRows.rows[0];
          sendEmail({
            to: a.email,
            ...EMAIL_TEMPLATES.statusChanged({
              authorName: `${a.first_name} ${a.last_name}`,
              articleTitle: submission.title,
              status: 'under_review',
              editorComment: '',
            }),
          }).catch(() => {});
        }
      } catch (e) { console.error('author notify (assign):', e.message); }
    }

    res.status(201).json({
      message: 'Reviewer assigned successfully',
      review: result.rows[0],
    });
  } catch (err) {
    console.error('POST /reviews/assign :', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// ────────────────────────────────────────────────────────────
// POST /api/reviews/:id/submit
// Soumettre une évaluation (reviewer uniquement)
// Body: { comments, recommendation }
// Recommandations : accept | minor_revision | major_revision | reject
// ────────────────────────────────────────────────────────────
const VALID_RECOMMENDATIONS = ['accept', 'reject', 'revise'];

router.post('/:id/submit', verifyToken, requireRole('reviewer'), reviewUpload.single('review_file'), async (req, res) => {
  try {
    const { id } = req.params;
    const { comments, recommendation, confidential_comments } = req.body;

    if (!recommendation) {
      return res.status(400).json({ message: 'A recommendation is required' });
    }
    // Au moins des commentaires OU un fichier de review pour l'auteur
    if ((!comments || !comments.trim()) && !req.file) {
      return res.status(400).json({ message: 'Please provide comments for the author(s) or upload a review file' });
    }
    if (comments && comments.length > 20000) {
      return res.status(400).json({ message: 'Comments must be under 20000 characters' });
    }
    if (confidential_comments && confidential_comments.length > 20000) {
      return res.status(400).json({ message: 'Confidential comments must be under 20000 characters' });
    }
    if (!VALID_RECOMMENDATIONS.includes(recommendation)) {
      return res.status(400).json({
        message: `Invalid recommendation. Accepted values: ${VALID_RECOMMENDATIONS.join(', ')}`,
      });
    }

    // Vérifier que cette révision appartient bien à ce reviewer
    const reviewResult = await pool.query(
      `SELECT r.*, s.title, s.author_id,
              u.email AS author_email, u.first_name AS author_first_name, u.last_name AS author_last_name
       FROM reviews r
       JOIN submissions s ON s.id = r.submission_id
       JOIN users u ON u.id = s.author_id
       WHERE r.id = $1 AND r.reviewer_id = $2`,
      [id, req.user.id]
    );

    if (reviewResult.rows.length === 0) {
      return res.status(404).json({ message: 'Review not found or access denied' });
    }

    const review = reviewResult.rows[0];

    // Bloquer la re-soumission d'une review déjà complétée
    if (review.status === 'completed') {
      return res.status(409).json({ message: 'This review has already been submitted and cannot be modified' });
    }

    // Upload du fichier de review (optionnel)
    let reviewFileUrl = null;
    if (req.file) {
      try { reviewFileUrl = await uploadReviewFile(req.file); }
      catch (e) { console.error('review file upload:', e.message); }
    }

    // Enregistrer l'évaluation (commentaires auteur + confidentiels éditeur + fichier)
    const updated = await pool.query(
      `UPDATE reviews
       SET comments = $1, recommendation = $2, confidential_comments = $3,
           review_file_url = COALESCE($4, review_file_url),
           status = 'completed', reviewed_at = NOW()
       WHERE id = $5
       RETURNING id, submission_id, recommendation, status, reviewed_at`,
      [comments || null, recommendation, confidential_comments || null, reviewFileUrl, id]
    );

    // Statut de la soumission : "revise" → revision_needed ; accept/reject → inchangé (l'admin tranche)
    if (recommendation === 'revise') {
      await pool.query(
        `UPDATE submissions SET status = 'revision_needed', updated_at = NOW() WHERE id = $1`,
        [review.submission_id]
      );
    }
    // Pour accept/reject : statut inchangé — l'admin verra la recommandation dans le dashboard

    // Notifier l'auteur par email
    await sendEmail({
      to: review.author_email,
      ...EMAIL_TEMPLATES.reviewCompleted({
        authorName: `${review.author_first_name} ${review.author_last_name}`,
        articleTitle: review.title,
        recommendation,
        comments: comments || 'The reviewer has provided their detailed feedback as an attached file.',
      }),
    });

    // Notifier l'admin qu'une évaluation a été soumise
    if (process.env.ADMIN_EMAIL) {
      const reviewerResult = await pool.query(
        'SELECT first_name, last_name FROM users WHERE id = $1',
        [req.user.id]
      );
      const reviewer = reviewerResult.rows[0];
      sendEmail({
        to: process.env.ADMIN_EMAIL,
        ...EMAIL_TEMPLATES.reviewSubmittedAlert({
          articleTitle: review.title,
          reviewerName: reviewer ? `${reviewer.first_name} ${reviewer.last_name}` : 'Reviewer',
          recommendation,
        }),
      }).catch(() => {});
    }

    res.json({
      message: 'Review submitted successfully',
      review: updated.rows[0],
    });
  } catch (err) {
    console.error('POST /reviews/:id/submit :', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// ────────────────────────────────────────────────────────────
// GET /api/reviews/by-submission/:submissionId
// Pour un reviewer : récupère sa review + la soumission via l'ID de soumission
// ────────────────────────────────────────────────────────────
router.get('/by-submission/:submissionId', verifyToken, async (req, res) => {
  try {
    const { submissionId } = req.params;
    const result = await pool.query(
      `SELECT r.id AS review_id, r.status AS review_status, r.recommendation, r.comments,
              r.created_at AS assigned_at,
              s.*, u.first_name || ' ' || u.last_name AS author_name
       FROM reviews r
       JOIN submissions s ON s.id = r.submission_id
       JOIN users u ON u.id = s.author_id
       WHERE r.submission_id = $1 AND r.reviewer_id = $2`,
      [submissionId, req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Review not found or access denied' });
    }
    const row = result.rows[0];
    const filesResult = await pool.query(
      `SELECT id, file_url, file_type, description, original_name, file_size, sort_order
       FROM submission_files WHERE submission_id = $1 ORDER BY sort_order, id`,
      [submissionId]
    );
    res.json({
      review_id: row.review_id,
      review_status: row.review_status,
      submission: row,
      files: filesResult.rows,
    });
  } catch (err) {
    console.error('GET /reviews/by-submission/:submissionId :', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// ────────────────────────────────────────────────────────────
// GET /api/reviews/:id/submission
// Récupérer la soumission liée à une review (pour le reviewer)
// ────────────────────────────────────────────────────────────
router.get('/:id/submission', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT s.*, u.first_name || ' ' || u.last_name AS author_name
       FROM reviews r
       JOIN submissions s ON s.id = r.submission_id
       JOIN users u ON u.id = s.author_id
       WHERE r.id = $1 AND r.reviewer_id = $2`,
      [id, req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Review not found or access denied' });
    }
    res.json({ submission: result.rows[0] });
  } catch (err) {
    console.error('GET /reviews/:id/submission :', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// ────────────────────────────────────────────────────────────
// GET /api/reviews/submission/:submissionId
// Récupérer les évaluations d'une soumission
//   • Admin    : accès complet + identité des reviewers visible
//   • Auteur   : uniquement son article, identité reviewer masquée (double-aveugle)
//   • Reviewer : uniquement les soumissions qui lui sont assignées, identité masquée
// ────────────────────────────────────────────────────────────
router.get('/submission/:submissionId', verifyToken, async (req, res) => {
  try {
    const { submissionId } = req.params;
    const { role, id: userId } = req.user;

    // Auteur : vérifier que c'est bien son article
    if (role === 'author') {
      const check = await pool.query(
        'SELECT id FROM submissions WHERE id = $1 AND author_id = $2',
        [submissionId, userId]
      );
      if (check.rows.length === 0) {
        return res.status(403).json({ message: 'Access denied' });
      }
    }

    // Reviewer : uniquement les soumissions qui lui sont assignées (IDOR fix)
    if (role === 'reviewer') {
      const check = await pool.query(
        'SELECT id FROM reviews WHERE submission_id = $1 AND reviewer_id = $2',
        [submissionId, userId]
      );
      if (check.rows.length === 0) {
        return res.status(403).json({ message: 'Access denied' });
      }
    }

    // Double-aveugle : l'identité du reviewer n'est visible que par l'admin
    // Les auteurs et reviewers reçoivent NULL pour reviewer_name et reviewer_email
    const isAdmin = role === 'admin';
    const result = await pool.query(
      `SELECT r.id, r.status, r.recommendation, r.comments, r.reviewed_at, r.created_at,
              ${isAdmin
                ? `u.first_name || ' ' || u.last_name AS reviewer_name, u.email AS reviewer_email`
                : `NULL AS reviewer_name, NULL AS reviewer_email`}
       FROM reviews r
       JOIN users u ON u.id = r.reviewer_id
       WHERE r.submission_id = $1
       ORDER BY r.created_at DESC`,
      [submissionId]
    );

    res.json({ reviews: result.rows });
  } catch (err) {
    console.error('GET /reviews/submission/:id :', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// ────────────────────────────────────────────────────────────
// GET /api/reviews/reviewers
// Liste des reviewers disponibles (admin uniquement)
// ────────────────────────────────────────────────────────────
router.get('/reviewers', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, first_name, last_name, email, institution, research_area
       FROM users WHERE role = 'reviewer'
       ORDER BY first_name, last_name`
    );
    res.json({ reviewers: result.rows });
  } catch (err) {
    console.error('GET /reviews/reviewers :', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
