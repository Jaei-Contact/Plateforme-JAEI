const express = require('express');
const router = express.Router();
const pool = require('../db/connection');
const { verifyToken } = require('../middleware/auth');
const { sendEmail, EMAIL_TEMPLATES } = require('../services/emailService');
const { notify, notifyAdmins } = require('../services/notificationService');

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
// Remarque 1 (client, 03/08) — conflit d'intérêts
// Un auteur (soumetteur ou co-auteur) d'un manuscrit ne peut pas en être
// l'évaluateur. Il reste invitable sur TOUT AUTRE document.
// Renvoie un message d'erreur si conflit, sinon null.
// ────────────────────────────────────────────────────────────
const authorshipConflict = async (submissionId, { userId, email }) => {
  const rows = await pool.query(
    `SELECT s.author_id, s.authors, s.co_authors, u.email AS submitter_email
       FROM submissions s JOIN users u ON u.id = s.author_id
      WHERE s.id = $1`,
    [submissionId]
  );
  if (rows.rows.length === 0) return null;
  const s = rows.rows[0];

  if (userId && s.author_id === userId) {
    return 'This person submitted this manuscript — an author cannot review their own work.';
  }

  const target = (email || '').trim().toLowerCase();
  if (!target) return null;
  if ((s.submitter_email || '').toLowerCase() === target) {
    return 'This person submitted this manuscript — an author cannot review their own work.';
  }

  // Co-auteurs déclarés dans le formulaire (JSON structuré)
  let authors = s.authors;
  if (typeof authors === 'string') { try { authors = JSON.parse(authors); } catch { authors = null; } }
  if (Array.isArray(authors)) {
    const hit = authors.find(a => (a?.email || '').trim().toLowerCase() === target);
    if (hit) return `${hit.name || 'This person'} is listed as an author of this manuscript — authors cannot review their own work.`;
  }
  return null;
};

// ────────────────────────────────────────────────────────────
// Remarques 5 et 9 (client, 23/09) — ré-invitation d'un reviewer
// Un reviewer dont l'évaluation est TERMINÉE ou qui a DÉCLINÉ peut être
// réinvité (round suivant) ; un reviewer déjà invité/en cours (assigned ou
// accepted, pas encore rendu) ne peut pas être invité une seconde fois.
// Renvoie { blocked, round, isReturning } ou lève via res si bloqué.
// ────────────────────────────────────────────────────────────
const reviewRoundCheck = async (submissionId, reviewerId) => {
  const active = await pool.query(
    `SELECT id FROM reviews WHERE submission_id = $1 AND reviewer_id = $2 AND status IN ('assigned', 'accepted')`,
    [submissionId, reviewerId]
  );
  if (active.rows.length > 0) {
    return { blocked: 'This reviewer is already assigned to this article' };
  }
  const past = await pool.query(
    `SELECT 1 FROM reviews WHERE submission_id = $1 AND reviewer_id = $2 AND status = 'completed' LIMIT 1`,
    [submissionId, reviewerId]
  );
  const sub = await pool.query('SELECT COALESCE(revision_count, 0) AS rc FROM submissions WHERE id = $1', [submissionId]);
  const round = Number(sub.rows[0]?.rc || 0) + 1;
  return { blocked: null, round, isReturning: past.rows.length > 0 };
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
      `SELECT r.id, r.status, r.submission_id, r.reviewer_id, r.accepted_at, r.declined_at,
              s.title, s.manuscript_number, s.article_type,
              u.first_name, u.last_name, u.email, u.reset_token, u.reset_token_expires
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
    // Remarque 7 (25/09) : une fois qu'une réponse a été donnée (accept OU
    // decline), le lien devient définitif — plus aucun clic ultérieur, dans
    // aucun des deux sens, ne peut la modifier (auparavant, ré-cliquer
    // permettait de changer d'avis indéfiniment et renvoyait l'email à chaque
    // fois). Toute exception (ex. retrait après un conflit d'intérêt découvert
    // après coup) doit être gérée manuellement par l'éditeur.
    if (review.status !== 'assigned') {
      const fmt = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }) : null;
      const MESSAGES = {
        accepted:  `You already accepted this invitation${fmt(review.accepted_at) ? ` on ${fmt(review.accepted_at)}` : ''}. This link cannot be used to change your response — please contact the editorial office if you need to withdraw.`,
        declined:  `You already declined this invitation${fmt(review.declined_at) ? ` on ${fmt(review.declined_at)}` : ''}. This link cannot be used to change your response — please contact the editorial office if you are now available to review.`,
        completed: 'You have already submitted your review report for this manuscript. Thank you!',
      };
      return res.send(invitationPage('This invitation has already been answered', MESSAGES[review.status] || 'This invitation has already been answered.', false));
    }

    // Remarque 9 (28/07) : le délai pour rendre la review court à partir du
    // jour de l'ACCEPTATION → on horodate accepted_at / declined_at.
    const newStatus = action === 'accept' ? 'accepted' : 'declined';
    const updated = await pool.query(
      `UPDATE reviews
          SET status = $1,
              accepted_at = ${action === 'accept' ? 'NOW()' : 'accepted_at'},
              declined_at = ${action === 'decline' ? 'NOW()' : 'declined_at'},
              updated_at = NOW()
        WHERE id = $2
        RETURNING round, accepted_at`,
      [newStatus, review.id]
    );
    const round = updated.rows[0]?.round || 1;
    const dueDays = round > 1 ? 14 : 30;
    const ms = review.manuscript_number || `JAEI-#${review.submission_id}`;

    // ── Remarque 2 (23/09) — accusé de réception envoyé au reviewer ──
    // Auparavant seule la page web de confirmation existait (jugée "parfaite"
    // par le client) ; aucun email ne partait réellement.
    const FRONT0 = process.env.FRONTEND_URL || 'http://localhost:3000';
    if (newStatus === 'accepted') {
      const dueDate = new Date(Date.now() + dueDays * 24 * 3600 * 1000)
        .toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
      sendEmail({
        to: review.email,
        ...EMAIL_TEMPLATES.reviewAccepted({
          salutation: `Dr. ${review.first_name} ${review.last_name}`,
          manuscriptNumber: ms, articleTitle: review.title, articleType: review.article_type,
          dueDate, dashboardUrl: `${FRONT0}/reviewer/dashboard`,
        }),
      }).catch(() => {});
    } else {
      sendEmail({
        to: review.email,
        ...EMAIL_TEMPLATES.reviewDeclined({
          salutation: `Dr. ${review.first_name} ${review.last_name}`,
          manuscriptNumber: ms, articleTitle: review.title, articleType: review.article_type,
        }),
      }).catch(() => {});
    }

    // Remarque 3 (28/07) : notifier l'équipe éditoriale de la réponse du reviewer
    const reviewerName = `${review.first_name} ${review.last_name}`;
    notifyAdmins({
      type: newStatus === 'accepted' ? 'invitation_accepted' : 'invitation_declined',
      title: newStatus === 'accepted'
        ? `${reviewerName} accepted to review`
        : `${reviewerName} declined the review invitation`,
      body: review.title,
      submissionId: review.submission_id,
      link: `/admin/submissions/${review.submission_id}`,
    });

    // Prévenir l'équipe éditoriale d'un refus (léger, non bloquant)
    if (newStatus === 'declined' && process.env.ADMIN_EMAIL) {
      sendEmail({
        to: process.env.ADMIN_EMAIL,
        subject: `JAEI — Review invitation declined`,
        text: `${reviewerName} has declined the invitation to review "${review.title}". Please assign another reviewer.`,
      }).catch(() => {});
    }

    if (newStatus === 'accepted') {
      const FRONT = process.env.FRONTEND_URL || 'http://localhost:3000';

      // ── Remarque 3 (22/09) — l'article passe "Under review" au moment où un
      // reviewer ACCEPTE l'invitation (et non plus dès l'envoi de l'invitation).
      // 'revised' inclus : la version révisée repart en évaluation.
      const moved = await pool.query(
        `UPDATE submissions SET status = 'under_review', updated_at = NOW()
          WHERE id = $1 AND status IN ('pending', 'submitted', 'revised')
          RETURNING id, title, author_id`,
        [review.submission_id]
      );
      if (moved.rows.length > 0) {
        const sub = moved.rows[0];
        try {
          const a = await pool.query('SELECT email, first_name, last_name FROM users WHERE id = $1', [sub.author_id]);
          if (a.rows.length > 0) {
            sendEmail({
              to: a.rows[0].email,
              ...EMAIL_TEMPLATES.statusChanged({
                authorName: `${a.rows[0].first_name} ${a.rows[0].last_name}`,
                articleTitle: sub.title,
                status: 'under_review',
                editorComment: '',
              }),
            }).catch(() => {});
          }
        } catch (e) { console.error('author notify (accept):', e.message); }
        notify({
          userId: sub.author_id, type: 'status_changed',
          title: 'Your manuscript is under review',
          body: sub.title,
          submissionId: sub.id, link: `/author/submissions/${sub.id}`,
        });
      }

      // Reviewer invité par email (compte auto-créé) → il doit d'abord définir son mot de passe
      const needsPassword = review.reset_token && review.reset_token_expires
        && new Date(review.reset_token_expires) > new Date();

      // ── Remarque 4 (22/09) — après acceptation, le reviewer arrive directement
      // sur "Articles to review" (via la page de connexion s'il n'est pas connecté).
      // Seul le compte invité sans mot de passe passe d'abord par la page ci-dessous.
      if (!needsPassword) {
        return res.redirect(302, `${FRONT}/reviewer/dashboard?invitation=accepted`);
      }
      const safeTitle = String(review.title || '').replace(/[&<>"']/g, c => (
        { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
      return res.send(invitationPage(
        'Invitation accepted — thank you!',
        `You have accepted to review "<strong>${safeTitle}</strong>".<br/><br/>` +
        `<span style="display:block;padding:10px 14px;background:#EEF5F1;border-left:3px solid #2E9E68;border-radius:2px;margin:0 0 14px">` +
        `We would greatly appreciate it if you could submit your comments within <strong>${dueDays} days</strong>.</span>` +
        `A JAEI reviewer account has been created for you. First, set your password: ` +
        `<a href="${FRONT}/reset-password?token=${review.reset_token}" style="display:inline-block;background:#1B4427;color:#fff;padding:10px 22px;border-radius:4px;text-decoration:none;font-weight:700;margin:10px 0">Set my password</a><br/>` +
        `Then log in: you will land directly on <strong>Articles to review</strong>, where you can access the files and submit your review report.`
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

    // Remarque 3 (28/07) — le co-éditeur est prévenu de sa prise en charge
    notify({
      userId: editor_id, type: 'editor_assigned',
      title: 'You have been assigned as editor',
      body: `Submission #${submission_id}`,
      submissionId: submission_id, link: `/admin/submissions/${submission_id}`,
    });

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

    // Remarque 1 (03/08) — pas d'auteur du manuscrit comme évaluateur
    const conflict = await authorshipConflict(submission_id, { email: cleanEmail });
    if (conflict) return res.status(409).json({ message: conflict });

    // Compte existant ? (n'importe quel rôle — Remarque 2 du 28/07)
    let reviewer;
    let isNewAccount = false;
    const existing = await pool.query(
      'SELECT id, email, first_name, last_name, role FROM users WHERE LOWER(email) = $1',
      [cleanEmail]
    );
    if (existing.rows.length > 0) {
      // Remarque 2 (28/07) : tout le monde peut être reviewer, y compris un
      // auteur ayant déjà soumis un article → aucun filtrage sur le rôle.
      reviewer = existing.rows[0];
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

    // Remarques 5 et 9 (23/09) : doublon bloqué seulement si une invitation
    // est encore active ; un reviewer déjà passé (completed/declined) peut
    // être réinvité pour le round suivant.
    const rc = await reviewRoundCheck(submission_id, reviewer.id);
    if (rc.blocked) return res.status(409).json({ message: rc.blocked });

    // Assignation + token d'invitation (même flux que /assign)
    const invitationToken = crypto.randomBytes(24).toString('hex');
    const inserted = await pool.query(
      `INSERT INTO reviews (submission_id, reviewer_id, status, invitation_token, round, created_at)
       VALUES ($1, $2, 'assigned', $3, $4, NOW())
       RETURNING id, submission_id, reviewer_id, status, round, created_at`,
      [submission_id, reviewer.id, invitationToken, rc.round]
    );
    // Remarque 3 (22/09) : le statut ne change plus à l'invitation — l'article
    // passe "Under review" quand un reviewer ACCEPTE (GET /invitation/.../accept).
    await pool.query(
      `UPDATE submissions
          SET editor_id          = COALESCE(editor_id, $2),
              editor_assigned_at = COALESCE(editor_assigned_at, NOW()),
              updated_at = NOW()
        WHERE id = $1`,
      // Remarque 7 (28/07) : aucune étape de la timeline ne peut être sautée —
      // l'admin qui lance l'évaluation devient l'éditeur en charge si aucun
      // co-éditeur n'a encore été désigné.
      [submission_id, req.user.id]
    );

    const base = process.env.BACKEND_URL || `${req.protocol}://${req.get('host')}`;
    const ms = submission.manuscript_number || `JAEI-#${submission.id}`;
    const acceptUrl  = `${base}/api/reviews/invitation/${invitationToken}/accept`;
    const declineUrl = `${base}/api/reviews/invitation/${invitationToken}/decline`;
    // Remarque 9 (23/09) : un reviewer qui a déjà rendu une évaluation sur ce
    // manuscrit reçoit un mail de ré-invitation distinct (round 2+).
    await sendEmail({
      to: reviewer.email,
      ...(rc.isReturning
        ? EMAIL_TEMPLATES.reviewReinvitation({
            salutation: `Dr. ${reviewer.first_name} ${reviewer.last_name}`,
            manuscriptNumber: ms, articleTitle: submission.title,
            acceptUrl, declineUrl, dueDays: 14,
          })
        : EMAIL_TEMPLATES.reviewInvitation({
            salutation: `Dr. ${reviewer.first_name} ${reviewer.last_name}`,
            articleTitle: submission.title, manuscriptNumber: ms,
            articleType: submission.article_type, abstract: submission.abstract,
            acceptUrl, declineUrl, dueDays: 30,
          })),
    });

    // Remarque 3 (28/07) — notification in-app pour le reviewer invité
    notify({
      userId: reviewer.id, type: 'review_invitation',
      title: rc.isReturning ? 'New review invitation (revised manuscript)' : 'New review invitation',
      body: submission.title,
      submissionId: submission_id, link: '/reviewer/dashboard',
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

    // Remarque 2 (28/07) : n'importe quel compte peut être reviewer
    // (reviewer, co-editor qui révise lui-même, ou auteur du journal).
    const revResult = await pool.query(
      `SELECT id, email, first_name, last_name FROM users WHERE id = $1`,
      [reviewer_id]
    );
    if (revResult.rows.length === 0) {
      return res.status(404).json({ message: 'Reviewer not found' });
    }

    // Remarque 1 (03/08) — pas d'auteur du manuscrit comme évaluateur
    const conflict = await authorshipConflict(submission_id, {
      userId: revResult.rows[0].id, email: revResult.rows[0].email,
    });
    if (conflict) return res.status(409).json({ message: conflict });

    // Remarques 5 et 9 (23/09) : doublon bloqué seulement si une invitation
    // est encore active ; un reviewer déjà passé (completed/declined) peut
    // être réinvité pour le round suivant (ré-évaluation après révision).
    const rc = await reviewRoundCheck(submission_id, reviewer_id);
    if (rc.blocked) return res.status(409).json({ message: rc.blocked });

    // Créer l'assignation + token d'invitation (Remarque 7 — accept/decline par mail)
    const invitationToken = crypto.randomBytes(24).toString('hex');
    const result = await pool.query(
      `INSERT INTO reviews (submission_id, reviewer_id, status, invitation_token, round, created_at)
       VALUES ($1, $2, 'assigned', $3, $4, NOW())
       RETURNING id, submission_id, reviewer_id, status, round, created_at`,
      [submission_id, reviewer_id, invitationToken, rc.round]
    );

    // Remarque 3 (22/09) : le statut ne change plus à l'invitation — l'article
    // passe "Under review" quand un reviewer ACCEPTE (GET /invitation/.../accept).
    await pool.query(
      `UPDATE submissions
          SET editor_id          = COALESCE(editor_id, $2),
              editor_assigned_at = COALESCE(editor_assigned_at, NOW()),
              updated_at = NOW()
        WHERE id = $1`,
      // Remarque 7 (28/07) : aucune étape de la timeline ne peut être sautée —
      // l'admin qui lance l'évaluation devient l'éditeur en charge si aucun
      // co-éditeur n'a encore été désigné.
      [submission_id, req.user.id]
    );

    // ── Remarque 7 (client) — invitation par mail avec liens Accept / Decline ──
    const submission = subResult.rows[0];
    const reviewer = revResult.rows[0];
    const base = process.env.BACKEND_URL || `${req.protocol}://${req.get('host')}`;
    const ms = submission.manuscript_number || `JAEI-#${submission.id}`;
    const acceptUrl  = `${base}/api/reviews/invitation/${invitationToken}/accept`;
    const declineUrl = `${base}/api/reviews/invitation/${invitationToken}/decline`;
    // Remarque 9 (23/09) : un reviewer qui a déjà rendu une évaluation sur ce
    // manuscrit reçoit un mail de ré-invitation distinct (round 2+).
    await sendEmail({
      to: reviewer.email,
      ...(rc.isReturning
        ? EMAIL_TEMPLATES.reviewReinvitation({
            salutation: `Dr. ${reviewer.first_name} ${reviewer.last_name}`,
            manuscriptNumber: ms, articleTitle: submission.title,
            acceptUrl, declineUrl, dueDays: 14,
          })
        : EMAIL_TEMPLATES.reviewInvitation({
            salutation: `Dr. ${reviewer.first_name} ${reviewer.last_name}`,
            articleTitle: submission.title, manuscriptNumber: ms,
            articleType: submission.article_type, abstract: submission.abstract,
            acceptUrl, declineUrl, dueDays: 30,
          })),
    });

    // L'auteur est prévenu du passage "Under review" à l'acceptation du reviewer
    // (Remarque 3 du 22/09), plus à l'envoi de l'invitation.

    // Remarque 3 (28/07) — notification in-app pour le reviewer assigné
    notify({
      userId: reviewer.id, type: 'review_invitation',
      title: rc.isReturning ? 'New review invitation (revised manuscript)' : 'New review invitation',
      body: submission.title,
      submissionId: submission_id, link: '/reviewer/dashboard',
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
const VALID_RECOMMENDATIONS = ['accept', 'reject', 'revise'];

// Remarque 2 (28/07) : plus de filtrage par rôle — n'importe quel compte peut
// être reviewer. La propriété de la review reste vérifiée (reviewer_id = moi).
router.post('/:id/submit', verifyToken, reviewUpload.single('review_file'), async (req, res) => {
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
    // Remarque 1 (23/09) : impossible de soumettre une évaluation sans avoir
    // d'abord accepté l'invitation (protège aussi un appel direct de l'API).
    if (review.status !== 'accepted') {
      return res.status(403).json({ message: 'Please accept the invitation before submitting your review.' });
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
           accepted_at = COALESCE(accepted_at, NOW()),
           status = 'completed', reviewed_at = NOW()
       WHERE id = $5
       RETURNING id, submission_id, recommendation, status, reviewed_at`,
      [comments || null, recommendation, confidential_comments || null, reviewFileUrl, id]
    );

    // ── Remarque 6 (23/09) — l'auteur ne doit voir "Revisions" qu'APRÈS la
    // décision de l'éditeur, jamais dès qu'un reviewer rend ses commentaires
    // (auparavant le statut basculait automatiquement en "revision_needed",
    // visible de l'auteur avant même que l'éditeur ait tranché). Le statut de
    // la soumission reste donc inchangé ici ; seul reviews.status = 'completed'
    // signale à l'admin qu'une évaluation est prête à être examinée — visible
    // via le décompte "Reviewers invited & reviews" sur la fiche de la
    // soumission. L'auteur n'est notifié qu'à la décision de l'éditeur
    // (Remarque 8), qui lui transmettra les corrections demandées.

    // ── Remarque 8 (client) — mail de remerciement AU REVIEWER ──
    // (L'auteur, lui, n'est notifié qu'à la décision finale — Remarque 10.)
    // Remarque 12 (28/07) : le client ne recevait pas ce message → l'envoi est
    // maintenant attendu et tracé explicitement dans les logs.
    const meResult = await pool.query(
      'SELECT email, first_name, last_name FROM users WHERE id = $1',
      [req.user.id]
    );
    const me = meResult.rows[0] || null;
    if (me) {
      try {
        await sendEmail({
          to: me.email,
          ...EMAIL_TEMPLATES.reviewerThanks({
            salutation: `Dr. ${me.first_name} ${me.last_name}`,
            articleTitle: review.title,
            manuscriptNumber: review.manuscript_number || `JAEI-#${review.submission_id}`,
            articleType: review.article_type,
          }),
        });
        console.log(`📧 Remerciement reviewer envoyé à ${me.email} (review #${id})`);
      } catch (e) {
        console.error(`⚠️  Échec du mail de remerciement à ${me.email}:`, e.message);
      }
    }

    // ── Remarque 3 (28/07) — notifier l'équipe éditoriale ──
    notifyAdmins({
      type: 'review_submitted',
      title: `Review submitted by ${me ? `${me.first_name} ${me.last_name}` : 'a reviewer'}`,
      body: `${review.title} — recommendation: ${recommendation}`,
      submissionId: review.submission_id,
      link: `/admin/submissions/${review.submission_id}`,
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
      `SELECT r.id AS review_id, r.status AS review_status, r.round, r.recommendation, r.comments,
              r.created_at AS assigned_at, r.accepted_at,
              s.*, u.first_name || ' ' || u.last_name AS author_name
       FROM reviews r
       JOIN submissions s ON s.id = r.submission_id
       JOIN users u ON u.id = s.author_id
       WHERE r.submission_id = $1 AND r.reviewer_id = $2
       ORDER BY r.created_at DESC LIMIT 1`,
      [submissionId, req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Review not found or access denied' });
    }
    const row = result.rows[0];
    // Remarque 1 (23/09) : tant que l'invitation n'est pas ACCEPTÉE, le reviewer
    // ne doit avoir accès ni au fichier ni au détail de la soumission.
    if (!['accepted', 'completed'].includes(row.review_status)) {
      return res.status(403).json({ message: 'You must accept the invitation before accessing this manuscript.' });
    }
    // Remarque 10 (23/09) : double-aveugle — la Title page (identité des
    // auteurs) n'est jamais servie à un reviewer.
    const filesResult = await pool.query(
      `SELECT id, file_url, file_type, description, original_name, file_size, sort_order
       FROM submission_files WHERE submission_id = $1 AND file_type <> 'Title page'
       ORDER BY sort_order, id`,
      [submissionId]
    );
    res.json({
      review_id: row.review_id,
      review_status: row.review_status,
      round: row.round || 1,
      accepted_at: row.accepted_at,   // Remarque 9 : due date = acceptation + délai selon round
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
      `SELECT s.*, r.status AS review_status, u.first_name || ' ' || u.last_name AS author_name
       FROM reviews r
       JOIN submissions s ON s.id = r.submission_id
       JOIN users u ON u.id = s.author_id
       WHERE r.id = $1 AND r.reviewer_id = $2`,
      [id, req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Review not found or access denied' });
    }
    // Remarque 1 (23/09) : même verrou que /by-submission — pas d'accès avant acceptation.
    if (!['accepted', 'completed'].includes(result.rows[0].review_status)) {
      return res.status(403).json({ message: 'You must accept the invitation before accessing this manuscript.' });
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

    // Vue déterminée par le lien réel avec le manuscrit, pas par le seul rôle
    // (Remarque 2 du 28/07 : un compte "author" peut aussi être reviewer).
    let view = role === 'admin' ? 'admin' : null;
    if (!view) {
      const own = await pool.query(
        'SELECT 1 FROM submissions WHERE id = $1 AND author_id = $2', [submissionId, userId]);
      if (own.rows.length > 0) view = 'author';
    }
    if (!view) {
      const assigned = await pool.query(
        'SELECT 1 FROM reviews WHERE submission_id = $1 AND reviewer_id = $2', [submissionId, userId]);
      if (assigned.rows.length > 0) view = 'reviewer';
    }
    if (!view) return res.status(403).json({ message: 'Access denied' });

    // ── Remarque 8 (22/09) — l'auteur ne voit QUE ce que l'éditeur lui écrit.
    // Des évaluations, il ne reçoit que l'avancement (timeline) : ni
    // commentaires, ni recommandation, ni fichier annoté.
    if (view === 'author') {
      const progress = await pool.query(
        `SELECT id, status, created_at, accepted_at, reviewed_at
           FROM reviews
          WHERE submission_id = $1 AND status <> 'declined'
          ORDER BY created_at DESC`,
        [submissionId]
      );
      return res.json({ reviews: progress.rows });
    }

    // Double-aveugle : l'identité du reviewer n'est visible que par l'admin
    // Les auteurs et reviewers reçoivent NULL pour reviewer_name et reviewer_email
    // Remarque 4 (28/07) : l'admin doit voir TOUS les reviewers invités et où
    // ils en sont (invité / accepté / décliné / terminé) → statut + horodatages.
    const isAdmin = role === 'admin';
    const result = await pool.query(
      `SELECT r.id, r.status, r.round, r.recommendation, r.comments, r.reviewed_at, r.created_at,
              r.accepted_at, r.declined_at, r.review_file_url,
              ${isAdmin ? 'r.confidential_comments, r.reviewer_id,' : 'NULL AS confidential_comments,'}
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
// GET /api/reviews/my-assignments
// Articles à évaluer par l'utilisateur connecté, QUEL QUE SOIT son rôle.
// Remarque 2 (28/07) : un auteur du journal peut aussi être reviewer — il ne
// faut donc pas dépendre du rôle pour lister ses articles à réviser.
// Les invitations déclinées sont exclues.
// ────────────────────────────────────────────────────────────
router.get('/my-assignments', verifyToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT s.*, u.first_name || ' ' || u.last_name AS author_name,
              r.id AS review_id, r.status AS review_status,
              r.created_at AS assigned_at, r.accepted_at, r.reviewed_at
         FROM reviews r
         JOIN submissions s ON s.id = r.submission_id
         JOIN users u       ON u.id = s.author_id
        WHERE r.reviewer_id = $1 AND r.status <> 'declined'
        ORDER BY r.created_at DESC`,
      [req.user.id]
    );
    res.json({ submissions: result.rows });
  } catch (err) {
    console.error('GET /reviews/my-assignments :', err.message);
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
