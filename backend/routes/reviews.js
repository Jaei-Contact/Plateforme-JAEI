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
      'SELECT id, title, author_id FROM submissions WHERE id = $1',
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
const VALID_RECOMMENDATIONS = ['accept', 'minor_revision', 'major_revision', 'reject'];

router.post('/:id/submit', verifyToken, requireRole('reviewer'), async (req, res) => {
  try {
    const { id } = req.params;
    const { comments, recommendation } = req.body;

    if (!comments || !recommendation) {
      return res.status(400).json({ message: 'Comments and recommendation are required' });
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

    // Enregistrer l'évaluation
    const updated = await pool.query(
      `UPDATE reviews
       SET comments = $1, recommendation = $2, status = 'completed', reviewed_at = NOW()
       WHERE id = $3
       RETURNING id, submission_id, recommendation, status, reviewed_at`,
      [comments, recommendation, id]
    );

    // Mettre à jour le statut de la soumission selon la recommandation
    const newStatus = ['accept'].includes(recommendation) ? 'accepted'
                    : ['reject'].includes(recommendation) ? 'rejected'
                    : 'revision_needed';

    await pool.query(
      `UPDATE submissions SET status = $1, updated_at = NOW() WHERE id = $2`,
      [newStatus, review.submission_id]
    );

    // Notifier l'auteur par email
    await sendEmail({
      to: review.author_email,
      ...EMAIL_TEMPLATES.reviewCompleted({
        authorName: `${review.author_first_name} ${review.author_last_name}`,
        articleTitle: review.title,
        recommendation,
        comments,
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
// Récupérer toutes les évaluations d'une soumission
// Admin + auteur concerné
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

    const result = await pool.query(
      `SELECT r.id, r.status, r.recommendation, r.comments, r.reviewed_at, r.created_at,
              u.first_name || ' ' || u.last_name AS reviewer_name, u.email AS reviewer_email
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
      `SELECT id, first_name, last_name, email
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
