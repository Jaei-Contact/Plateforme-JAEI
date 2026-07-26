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
const crypto = require('crypto');
const bcrypt = require('bcrypt');
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
// GET /api/reviews/invitation/:token/:action  — Accept / Decline (PUBLIC)
// Lien cliqué depuis le mail d'invitation (Remarque 7 client).
// Renvoie une mini-page HTML de confirmation aux couleurs JAEI.
// ────────────────────────────────────────────────────────────
const invitationPage = (title, body, ok = true) => `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title} — JAEI</title></head>
<body style="margin:0;font-family:Arial,Helvetica,sans-serif;background:#F5F7FA">
  <div style="max-width:560px;margin:60px auto;padding:0 16px">
    <div style="background:#fff;border:1px solid #E5E7EB;border-radius:6px;overflow:hidden;box-shadow:0 2px 10px rgba(0,0,0,.06)">
      <div style="background:linear-gradient(135deg,#1B4427,#2E9E68);padding:22px 30px">
        <h1 style="color:#fff;margin:0;font-size:19px">JAEI</h1>
        <p style="color:rgba(255,255,255,.75);margin:4px 0 0;font-size:12px">Journal of Agricultural and Environmental Innovation</p>
      </div>
      <div style="padding:30px 34px">
        <div style="font-size:34px;margin-bottom:10px">${ok ? '✅' : 'ℹ️'}</div>
        <h2 style="color:#1B4427;font-size:18px;margin:0 0 10px">${title}</h2>
        <p style="color:#4B5563;font-size:14px;line-height:1.65;margin:0">${body}</p>
      </div>
    </div>
  </div>
</body></html>`;

router.get('/invitation/:token/:action', async (req, res) => {
  try {
    const { token, action } = req.params;
    if (!['accept', 'decline'].includes(action)) return res.status(400).send('Invalid action');
    if (!/^[a-f0-9]{24,80}$/i.test(token))       return res.status(400).send('Invalid token');

    const rows = await pool.query(
      `SELECT r.id, r.status, s.title,
              u.reset_token, u.reset_token_expires
       FROM reviews r
       JOIN submissions s ON s.id = r.submission_id
       JOIN users u       ON u.id = r.reviewer_id
       WHERE r.invitation_token = $1`,
      [token]
    );
    if (rows.rows.length === 0) {
      return res.status(404).send(invitationPage('Invitation not found', 'This invitation link is invalid or has been removed.', false));
    }
    const review = rows.rows[0];
    if (review.status === 'completed') {
      return res.send(invitationPage('Review already submitted', 'You have already submitted your review report for this manuscript. Thank you!', false));
    }

    const newStatus = action === 'accept' ? 'accepted' : 'declined';
    await pool.query(`UPDATE reviews SET status = $1, updated_at = NOW() WHERE id = $2`, [newStatus, review.id]);

    // Prévenir l'équipe éditoriale d'un refus (léger, non bloquant)
    if (newStatus === 'declined' && process.env.ADMIN_EMAIL) {
      sendEmail({
        to: process.env.ADMIN_EMAIL,
        subject: `JAEI — Review invitation declined`,
        text: `A reviewer has declined the invitation to review "${review.title}". Please assign another reviewer.`,
      }).catch(() => {});
    }

    if (newStatus === 'accepted') {
      const FRONT = process.env.FRONTEND_URL || 'http://localhost:3000';
      // Reviewer invité par email (compte auto-créé) → il doit d'abord définir son mot de passe
      const needsPassword = review.reset_token && review.reset_token_expires
        && new Date(review.reset_token_expires) > new Date();
      const accessBlock = needsPassword
        ? `A JAEI reviewer account has been created for you. First, set your password: ` +
          `<a href="${FRONT}/reset-password?token=${review.reset_token}" style="display:inline-block;background:#1B4427;color:#fff;padding:10px 22px;border-radius:4px;text-decoration:none;font-weight:700;margin:10px 0">Set my password</a><br/>` +
          `Then log in to your reviewer dashboard to access the files and submit your review report.`
        : `Please log in to your JAEI reviewer dashboard to access the files and submit your review report: ` +
          `<a href="${FRONT}/login" style="color:#1E88C8">${FRONT}/login</a>`;
      return res.send(invitationPage(
        'Invitation accepted — thank you!',
        `You have accepted to review "<strong>${review.title}</strong>".<br/><br/>${accessBlock}`
      ));
    }
    return res.send(invitationPage(
      'Invitation declined',
      'Thank you for letting us know. The editorial office will assign another reviewer.', false
    ));
  } catch (err) {
    console.error('GET /reviews/invitation :', err.message);
    res.status(500).send('Server error');
  }
});

// ────────────────────────────────────────────────────────────
// GET /api/reviews/editors — Liste des co-editors (admins) — Remarque 11
// ────────────────────────────────────────────────────────────
router.get('/editors', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, first_name, last_name, email, institution, research_area
       FROM users WHERE role = 'admin' ORDER BY first_name`
    );
    res.json({ editors: result.rows });
  } catch (err) {
    console.error('GET /reviews/editors :', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// ────────────────────────────────────────────────────────────
// POST /api/reviews/assign-editor — Assigner un co-editor (Remarque 11)
// Body: { submission_id, editor_id } — editor_id doit être un admin.
// Alimente la timeline "Editor assigned" (Remarque 12).
// ────────────────────────────────────────────────────────────
router.post('/assign-editor', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const { submission_id, editor_id } = req.body;
    if (!submission_id || !editor_id) {
      return res.status(400).json({ message: 'submission_id and editor_id are required' });
    }
    const ed = await pool.query(
      `SELECT id, first_name, last_name FROM users WHERE id = $1 AND role = 'admin'`,
      [editor_id]
    );
    if (ed.rows.length === 0) return res.status(404).json({ message: 'Co-editor not found' });

    const result = await pool.query(
      `UPDATE submissions
         SET editor_id = $1, editor_assigned_at = NOW(), updated_at = NOW()
       WHERE id = $2 RETURNING id, editor_id, editor_assigned_at`,
      [editor_id, submission_id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Submission not found' });

    res.json({
      message: 'Editor assigned successfully',
      editor_name: `${ed.rows[0].first_name} ${ed.rows[0].last_name}`,
      submission: result.rows[0],
    });
  } catch (err) {
    console.error('POST /reviews/assign-editor :', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// ────────────────────────────────────────────────────────────
// POST /api/reviews/invite-external — Inviter un reviewer PAR EMAIL
// Vocal client (20/07) : l'éditeur assigné cherche des spécialistes
// hors plateforme ("il vient avec l'email") et les invite. Au moins
// deux reviewers par manuscrit.
// Body: { submission_id, name, email }
// → crée le compte reviewer si besoin (mot de passe à définir via le
//   lien "Set your password" affiché à l'acceptation), puis envoie
//   l'invitation standard Accept/Decline avec les infos du document.
// ────────────────────────────────────────────────────────────
router.post('/invite-external', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const { submission_id, name, email } = req.body;
    const cleanName  = (name || '').trim();
    const cleanEmail = (email || '').trim().toLowerCase();

    if (!submission_id || !cleanName || !cleanEmail) {
      return res.status(400).json({ message: 'submission_id, name and email are required' });
    }
    if (!/^\S+@\S+\.\S+$/.test(cleanEmail)) {
      return res.status(400).json({ message: 'Invalid email address' });
    }
    if (cleanName.length > 180) {
      return res.status(400).json({ message: 'Name is too long' });
    }

    const subResult = await pool.query(
      'SELECT id, title, abstract, article_type, status, manuscript_number FROM submissions WHERE id = $1',
      [submission_id]
    );
    if (subResult.rows.length === 0) {
      return res.status(404).json({ message: 'Submission not found' });
    }
    const submission = subResult.rows[0];

    // Compte existant ? (réutilisé si reviewer/admin — un auteur ne peut pas être reviewer ici)
    let reviewer;
    let isNewAccount = false;
    const existing = await pool.query(
      'SELECT id, email, first_name, last_name, role FROM users WHERE LOWER(email) = $1',
      [cleanEmail]
    );
    if (existing.rows.length > 0) {
      const u = existing.rows[0];
      if (!['reviewer', 'admin'].includes(u.role)) {
        return res.status(409).json({
          message: 'This email belongs to an author account. Please use another email address for this reviewer.',
        });
      }
      reviewer = u;
    } else {
      // Création du compte reviewer invité : email pré-vérifié (invitation officielle),
      // mot de passe aléatoire remplacé par le lien "Set your password" (reset token 30 j).
      isNewAccount = true;
      const parts = cleanName.split(/\s+/);
      const firstName = parts.shift() || cleanName;
      const lastName  = parts.join(' ') || firstName;
      const randomPwd  = crypto.randomBytes(24).toString('hex');
      const hashed     = await bcrypt.hash(randomPwd, 12);
      const resetToken = crypto.randomBytes(32).toString('hex');
      const created = await pool.query(
        `INSERT INTO users (email, password, role, first_name, last_name, email_verified, reset_token, reset_token_expires)
         VALUES ($1, $2, 'reviewer', $3, $4, TRUE, $5, NOW() + INTERVAL '30 days')
         RETURNING id, email, first_name, last_name, role`,
        [cleanEmail, hashed, firstName, lastName, resetToken]
      );
      reviewer = created.rows[0];
    }

    // Doublon d'assignation ?
    const dup = await pool.query(
      'SELECT id FROM reviews WHERE submission_id = $1 AND reviewer_id = $2',
      [submission_id, reviewer.id]
    );
    if (dup.rows.length > 0) {
      return res.status(409).json({ message: 'This reviewer is already assigned to this article' });
    }

    // Assignation + token d'invitation (même flux que /assign)
    const invitationToken = crypto.randomBytes(24).toString('hex');
    const inserted = await pool.query(
      `INSERT INTO reviews (submission_id, reviewer_id, status, invitation_token, created_at)
       VALUES ($1, $2, 'assigned', $3, NOW())
       RETURNING id, submission_id, reviewer_id, status, created_at`,
      [submission_id, reviewer.id, invitationToken]
    );
    await pool.query(
      `UPDATE submissions SET status = 'under_review', updated_at = NOW() WHERE id = $1`,
      [submission_id]
    );

    const base = process.env.BACKEND_URL || `${req.protocol}://${req.get('host')}`;
    await sendEmail({
      to: reviewer.email,
      ...EMAIL_TEMPLATES.reviewInvitation({
        salutation: `Dr. ${reviewer.first_name} ${reviewer.last_name}`,
        articleTitle: submission.title,
        manuscriptNumber: submission.manuscript_number || `JAEI-#${submission.id}`,
        articleType: submission.article_type,
        abstract: submission.abstract,
        acceptUrl:  `${base}/api/reviews/invitation/${invitationToken}/accept`,
        declineUrl: `${base}/api/reviews/invitation/${invitationToken}/decline`,
      }),
    });

    res.status(201).json({
      message: isNewAccount
        ? `Invitation sent to ${reviewer.email} (guest reviewer account created)`
        : `Invitation sent to ${reviewer.email}`,
      review: inserted.rows[0],
      new_account: isNewAccount,
    });
  } catch (err) {
    console.error('POST /reviews/invite-external :', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

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
      'SELECT id, title, abstract, article_type, author_id, status, manuscript_number FROM submissions WHERE id = $1',
      [submission_id]
    );
    if (subResult.rows.length === 0) {
      return res.status(404).json({ message: 'Submission not found' });
    }

    // Reviewer OU co-editor (admin) — Remarque 11 : "ils révisent eux-mêmes"
    const revResult = await pool.query(
      `SELECT id, email, first_name, last_name FROM users
       WHERE id = $1 AND role IN ('reviewer', 'admin')`,
      [reviewer_id]
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

    // Créer l'assignation + token d'invitation (Remarque 7 — accept/decline par mail)
    const invitationToken = crypto.randomBytes(24).toString('hex');
    const result = await pool.query(
      `INSERT INTO reviews (submission_id, reviewer_id, status, invitation_token, created_at)
       VALUES ($1, $2, 'assigned', $3, NOW())
       RETURNING id, submission_id, reviewer_id, status, created_at`,
      [submission_id, reviewer_id, invitationToken]
    );

    // Passer la soumission en "under_review"
    await pool.query(
      `UPDATE submissions SET status = 'under_review', updated_at = NOW() WHERE id = $1`,
      [submission_id]
    );

    // ── Remarque 7 (client) — invitation par mail avec liens Accept / Decline (15 jours) ──
    const submission = subResult.rows[0];
    const reviewer = revResult.rows[0];
    const base = process.env.BACKEND_URL || `${req.protocol}://${req.get('host')}`;
    await sendEmail({
      to: reviewer.email,
      ...EMAIL_TEMPLATES.reviewInvitation({
        salutation: `Dr. ${reviewer.first_name} ${reviewer.last_name}`,
        articleTitle: submission.title,
        manuscriptNumber: submission.manuscript_number || `JAEI-#${submission.id}`,
        articleType: submission.article_type,
        abstract: submission.abstract,
        acceptUrl:  `${base}/api/reviews/invitation/${invitationToken}/accept`,
        declineUrl: `${base}/api/reviews/invitation/${invitationToken}/decline`,
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
      `SELECT r.*, s.title, s.author_id, s.manuscript_number, s.article_type,
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

    // ── Remarque 8 (client) — mail de remerciement AU REVIEWER ──
    // (L'auteur, lui, n'est notifié qu'à la décision finale — Remarque 10.)
    const meResult = await pool.query(
      'SELECT email, first_name, last_name FROM users WHERE id = $1',
      [req.user.id]
    );
    if (meResult.rows.length > 0) {
      const me = meResult.rows[0];
      sendEmail({
        to: me.email,
        ...EMAIL_TEMPLATES.reviewerThanks({
          salutation: `Dr. ${me.first_name} ${me.last_name}`,
          articleTitle: review.title,
          manuscriptNumber: review.manuscript_number || `JAEI-#${review.submission_id}`,
          articleType: review.article_type,
        }),
      }).catch(() => {});
    }

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
