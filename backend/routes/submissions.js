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
const { buildManuscriptNumber } = require('../utils/articleTypes');
const { notify, notifyAdmins } = require('../services/notificationService');

// ── Stockage disque local (fallback PDF) ─────────────────────
const SUBMISSIONS_DIR = path.join(__dirname, '../uploads/submissions');
if (!fs.existsSync(SUBMISSIONS_DIR)) fs.mkdirSync(SUBMISSIONS_DIR, { recursive: true });

// Upload fichier (PDF ou Word) — stockage mémoire (buffer utilisé ensuite)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize:  10 * 1024 * 1024, // 10 Mo max par fichier
    fieldSize: 100 * 1024,        // 100 Ko max par champ texte
    fields:    30,                 // max 30 champs non-fichiers
    files:     12,                 // max 12 fichiers par soumission
  },
  fileFilter: (req, file, cb) => {
    // Word (.docx) uniquement — plus de PDF (demande client)
    const allowed = ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Only Word (.docx) files are accepted'));
  },
});

/**
 * Upload un fichier soumission et retourne son URL publique.
 * Cloudinary si configuré, sinon disque local.
 */
const handleFileUpload = async (file) => {
  if (CLOUDINARY_CONFIGURED) {
    // Extension dans le public_id → Cloudinary sert en application/pdf +
    // Content-Disposition: inline (ouverture navigateur, pas téléchargement).
    // Sans extension : octet-stream + attachment → téléchargement forcé.
    const SAFE_EXTS = { '.pdf': 1, '.docx': 1 };
    const rawExt = path.extname(file.originalname).toLowerCase();
    const ext = SAFE_EXTS[rawExt] ? rawExt : '.pdf';
    const result = await uploadToCloudinary(file.buffer, {
      folder: 'jaei/submissions',
      resource_type: 'raw',
      public_id: `submission_${Date.now()}${ext}`,
      use_filename: false,
    });
    return result.secure_url;
  } else {
    // Extension restreinte à la whitelist — jamais extraite brute du originalname
    const SAFE_EXTS = { '.pdf': 1, '.docx': 1 };
    const rawExt = path.extname(file.originalname).toLowerCase();
    const ext = SAFE_EXTS[rawExt] ? rawExt : '.pdf';
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
router.post('/', verifyToken, requireRole('author'), upload.any(), async (req, res) => {
  try {
    const { title, abstract, keywords, research_area, co_authors, authors,
            article_type, cover_letter, comments, ai_declaration, file_types, file_descriptions } = req.body;

    if (!title || !abstract || !keywords || !research_area) {
      return res.status(400).json({ message: 'Title, abstract, keywords and research area are required' });
    }
    if (!article_type) {
      return res.status(400).json({ message: 'Article type is required' });
    }
    const files = req.files || [];
    if (files.length === 0) {
      return res.status(400).json({ message: 'At least one Word (.docx) file is required' });
    }

    // ── Validation des longueurs pour éviter les DoS par payload ─
    if (title.length    > 500)  return res.status(400).json({ message: 'Title must be under 500 characters' });
    if (abstract.length > 8000) return res.status(400).json({ message: 'Abstract must be under 8000 characters' });
    if (keywords && keywords.length > 500)  return res.status(400).json({ message: 'Keywords must be under 500 characters' });
    if (cover_letter && cover_letter.length > 5000) return res.status(400).json({ message: 'Cover letter must be under 5000 characters' });
    if (comments && comments.length > 5000) return res.status(400).json({ message: 'Comments must be under 5000 characters' });

    // ── Validation longueur du domaine de recherche ───────────
    if (research_area && research_area.length > 300) {
      return res.status(400).json({ message: 'Research area must be under 300 characters' });
    }

    // ── Types des fichiers (JSON parallèle à files[]) + auteurs structurés ─
    let types = [];
    try { types = file_types ? JSON.parse(file_types) : []; } catch { types = []; }
    let descriptions = [];
    try { descriptions = file_descriptions ? JSON.parse(file_descriptions) : []; } catch { descriptions = []; }
    let authorsArr = null;
    try { authorsArr = authors ? JSON.parse(authors) : null; } catch { authorsArr = null; }

    // Upload de chaque fichier (Cloudinary ou disque local)
    const uploaded = [];
    for (let i = 0; i < files.length; i++) {
      const url = await handleFileUpload(files[i]);
      uploaded.push({
        url,
        type: (types[i] || 'Manuscript').toString().slice(0, 80),
        description: (descriptions[i] || '').toString().slice(0, 300),
        name: files[i].originalname,
        size: files[i].size,
      });
    }
    // Fichier principal = "Manuscript" (sinon le 1er) → pdf_url reste compatible
    const primary = uploaded.find(f => f.type === 'Manuscript') || uploaded[0];
    const pdf_url = primary.url;

    const aiDecl = ai_declaration === '1' || ai_declaration === true || ai_declaration === 'true';

    const result = await pool.query(
      `INSERT INTO submissions
        (title, abstract, keywords, research_area, co_authors, authors,
         article_type, cover_letter, comments, ai_declaration,
         pdf_url, author_id, status, submitted_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'submitted', NOW())
       RETURNING id, title, status, submitted_at`,
      [title, abstract, keywords, research_area, co_authors || null,
       authorsArr ? JSON.stringify(authorsArr) : null,
       article_type, cover_letter || null, comments || null, aiDecl,
       pdf_url, req.user.id]
    );

    const submissionId = result.rows[0].id;

    // Numéro de manuscrit (clé unique) : JAEI-A-26-09928 (Remarque 8 du 28/07)
    // La lettre correspond au type d'article choisi par l'auteur.
    const manuscriptNumber = buildManuscriptNumber(article_type, submissionId);
    await pool.query('UPDATE submissions SET manuscript_number = $1 WHERE id = $2',
      [manuscriptNumber, submissionId]);

    // Enregistre chaque fichier (submission_files)
    for (let i = 0; i < uploaded.length; i++) {
      const f = uploaded[i];
      await pool.query(
        `INSERT INTO submission_files (submission_id, file_url, file_type, description, original_name, file_size, sort_order)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [submissionId, f.url, f.type, f.description || null, f.name, f.size, i]
      ).catch(e => console.error('submission_files insert:', e.message));
    }

    // Génération IA du résumé (non bloquant — en arrière-plan)
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

    // ── Emails de confirmation (Remarque 4 client) ─────────────
    // Le soumetteur et chaque co-auteur reçoivent des messages DIFFÉRENTS.
    const authorResult = await pool.query(
      'SELECT email, first_name, last_name FROM users WHERE id = $1',
      [req.user.id]
    );
    if (authorResult.rows.length > 0) {
      const author = authorResult.rows[0];
      const authorsList = Array.isArray(authorsArr) ? authorsArr : [];
      const submitterEntry = authorsList.find(a => a.is_submitter);
      // Salutation "M./Mme/Dr./Prof + nom" (titre choisi dans le formulaire)
      const salutationOf = (a) => [a?.title, a?.name].filter(Boolean).join(' ').trim();
      const submitterSalutation = salutationOf(submitterEntry)
        || `${author.first_name} ${author.last_name}`;
      // Corresponding author(s) — 1 ou 2 (Remarque 3)
      const correspondingNames = authorsList.filter(a => a.corresponding).map(a => a.name).filter(Boolean);
      const correspondingName = correspondingNames.join(' and ')
        || submitterEntry?.name || `${author.first_name} ${author.last_name}`;

      // 1) Mail au soumetteur (texte client)
      sendEmail({
        to: author.email,
        ...EMAIL_TEMPLATES.submissionReceived({
          salutation: submitterSalutation,
          articleTitle: title,
          manuscriptNumber,
        }),
      }).catch(() => {});

      // 2) Mail à CHAQUE co-auteur ayant un email (texte client, sans lien plateforme — Remarque 5)
      const seen = new Set([author.email.toLowerCase()]);
      for (const a of authorsList) {
        const em = (a.email || '').trim().toLowerCase();
        if (!em || a.is_submitter || seen.has(em)) continue;
        seen.add(em);
        sendEmail({
          to: a.email.trim(),
          ...EMAIL_TEMPLATES.coAuthorNotice({
            salutation: salutationOf(a) || a.name || 'Colleague',
            articleTitle: title,
            manuscriptNumber,
            correspondingName,
          }),
        }).catch(() => {});
      }
    }

    // Notifier TOUS les admins (membres du comité éditorial inclus) + contact@jaei-journal.org
    try {
      const authorForAdmin = authorResult.rows[0];
      const adminAuthorName = authorForAdmin
        ? `${authorForAdmin.first_name} ${authorForAdmin.last_name}`
        : 'Unknown author';
      const adminRows = await pool.query("SELECT email FROM users WHERE role = 'admin' AND email IS NOT NULL");
      const adminEmails = new Set(adminRows.rows.map(r => r.email));
      if (process.env.ADMIN_EMAIL) adminEmails.add(process.env.ADMIN_EMAIL);
      for (const adminEmail of adminEmails) {
        sendEmail({
          to: adminEmail,
          ...EMAIL_TEMPLATES.newSubmissionAlert({
            authorName: adminAuthorName,
            articleTitle: title,
            submissionId: result.rows[0].id,
          }),
        }).catch(() => {});
      }
    } catch (e) { console.error('admin notify:', e.message); }

    // ── Remarque 3 (28/07) — notification in-app pour l'équipe éditoriale ──
    notifyAdmins({
      type: 'new_submission',
      title: `New submission — ${manuscriptNumber}`,
      body: title,
      submissionId, link: `/admin/submissions/${submissionId}`,
    });

    res.status(201).json({
      message: 'Article submitted successfully',
      submission: { ...result.rows[0], manuscript_number: manuscriptNumber },
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
      // Les invitations déclinées (Remarque 7) ne sont plus listées
      query = `
        SELECT s.*, u.first_name || ' ' || u.last_name AS author_name
        FROM submissions s
        JOIN users u ON u.id = s.author_id
        JOIN reviews r ON r.submission_id = s.id
        WHERE r.reviewer_id = $1 AND r.status <> 'declined'
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
// GET /api/submissions/file  — Proxy téléchargement / aperçu
// Streame un fichier Cloudinary (raw) avec le bon nom + Content-Type
// pour forcer un téléchargement propre (extension) ou un aperçu inline.
// Public (navigation navigateur) mais restreint à NOTRE cloud Cloudinary.
// DOIT être déclaré AVANT /:id sinon capturé par cette route.
// ────────────────────────────────────────────────────────────
router.get('/file', (req, res) => {
  const https = require('https');
  const { u, name, mode } = req.query;
  if (!u) return res.status(400).send('Missing file url');

  let parsed;
  try { parsed = new URL(u); } catch { return res.status(400).send('Bad url'); }
  const cloud = process.env.CLOUDINARY_CLOUD_NAME;
  if (parsed.protocol !== 'https:' || parsed.hostname !== 'res.cloudinary.com'
      || (cloud && !parsed.pathname.startsWith(`/${cloud}/`))) {
    return res.status(400).send('Host not allowed');
  }

  const safeName = String(name || 'manuscript').replace(/[^\w.\- ]+/g, '_').slice(0, 200);
  const ext = (safeName.split('.').pop() || '').toLowerCase();
  const TYPES = {
    pdf:  'application/pdf',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    doc:  'application/msword',
  };
  const ctype = TYPES[ext] || 'application/octet-stream';
  const disposition = mode === 'inline' ? 'inline' : 'attachment';

  https.get(parsed.href, (up) => {
    if (up.statusCode !== 200) { up.resume(); return res.status(up.statusCode || 502).send('Upstream error'); }
    res.setHeader('Content-Type', ctype);
    res.setHeader('Content-Disposition', `${disposition}; filename="${safeName}"`);
    if (up.headers['content-length']) res.setHeader('Content-Length', up.headers['content-length']);
    up.pipe(res);
  }).on('error', (e) => {
    console.error('GET /submissions/file :', e.message);
    if (!res.headersSent) res.status(502).send('Proxy error');
  });
});

// ────────────────────────────────────────────────────────────
// GET /api/submissions/:id  — Détail d'une soumission
// ────────────────────────────────────────────────────────────
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { role, id: userId } = req.user;

    const result = await pool.query(
      `SELECT s.*, u.first_name || ' ' || u.last_name AS author_name, u.email AS author_email,
              e.first_name || ' ' || e.last_name AS editor_name
       FROM submissions s
       JOIN users u ON u.id = s.author_id
       LEFT JOIN users e ON e.id = s.editor_id
       WHERE s.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Submission not found' });
    }

    const sub = result.rows[0];

    // Author : only their own submissions
    if (role === 'author' && sub.author_id !== userId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Reviewer : only submissions assigned to them
    if (role === 'reviewer') {
      const assigned = await pool.query(
        'SELECT id FROM reviews WHERE submission_id = $1 AND reviewer_id = $2',
        [id, userId]
      );
      if (assigned.rows.length === 0) {
        return res.status(403).json({ message: 'Access denied' });
      }
    }

    // Fichiers attachés (multi-fichiers + type par fichier)
    const filesResult = await pool.query(
      `SELECT id, file_url, file_type, description, original_name, file_size, sort_order
       FROM submission_files WHERE submission_id = $1 ORDER BY sort_order, id`,
      [id]
    );

    res.json({ submission: sub, files: filesResult.rows });
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

    // ── Validation des longueurs (mise à jour) ─────────────────
    if (title        && title.length        > 500)  return res.status(400).json({ message: 'Title must be under 500 characters' });
    if (abstract     && abstract.length     > 8000) return res.status(400).json({ message: 'Abstract must be under 8000 characters' });
    if (keywords     && keywords.length     > 500)  return res.status(400).json({ message: 'Keywords must be under 500 characters' });
    if (research_area && research_area.length > 300) {
      return res.status(400).json({ message: 'Research area must be under 300 characters' });
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
// Remarque 5 (28/07) : l'éditeur dispose de 5 décisions —
// Send back to the authors · Major Revision · Minor Revision · Reject · Accept
const VALID_STATUSES = [
  'pending', 'submitted', 'under_review', 'revised', 'published', 'withdrawn',
  'sent_back',       // renvoyé à l'auteur avant revue (format non conforme)
  'revision_needed', // conservé pour l'historique (= révision demandée)
  'major_revision',
  'minor_revision',
  'accepted',
  'rejected',
];

router.patch('/:id/status', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { status, editor_comment } = req.body;

    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({ message: `Invalid status. Accepted values: ${VALID_STATUSES.join(', ')}` });
    }

    // ── Remarque 13 (28/07) — pas de publication sans paiement de l'APC ──
    if (status === 'published') {
      const paid = await pool.query('SELECT apc_paid FROM submissions WHERE id = $1', [id]);
      if (paid.rows.length === 0) return res.status(404).json({ message: 'Submission not found' });
      if (!paid.rows[0].apc_paid) {
        return res.status(409).json({
          message: 'This article cannot be published yet: the Article Processing Charge (APC) has not been marked as paid.',
        });
      }
    }

    const result = await pool.query(
      `UPDATE submissions
         SET status = $1,
             editor_comment = COALESCE($2, editor_comment),
             updated_at = NOW()
       WHERE id = $3
       RETURNING id, title, status, updated_at, manuscript_number, article_type, authors, co_authors`,
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

    // Décision finale : libellés du client (Remarques 9-10, étendus le 28/07)
    const DECISION_LABELS = {
      accepted:        'Accept',
      rejected:        'Reject',
      major_revision:  'Major revision',
      minor_revision:  'Minor revision',
      revision_needed: 'Revision requested',
      sent_back:       'Sent back to the authors',
    };
    const ms = submission.manuscript_number || `JAEI-#${id}`;
    let authorsArr = submission.authors;
    if (typeof authorsArr === 'string') { try { authorsArr = JSON.parse(authorsArr); } catch { authorsArr = null; } }

    if (authorResult.rows.length > 0) {
      const author = authorResult.rows[0];
      const authorName = `${author.first_name} ${author.last_name}`;
      const submitterEntry = Array.isArray(authorsArr) ? authorsArr.find(a => a.is_submitter) : null;
      const salutation = [submitterEntry?.title, submitterEntry?.name].filter(Boolean).join(' ').trim() || authorName;

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
      } else if (status === 'sent_back') {
        // ── Remarque 5 (28/07) — manuscrit renvoyé AVANT revue (format non conforme) ──
        // Remarque 3 (03/08) : le client ne recevait pas ce message — l'envoi est
        // désormais attendu et tracé explicitement dans les logs.
        try {
          await sendEmail({
            to: author.email,
            ...EMAIL_TEMPLATES.reviseBeforeReview({
              salutation,
              articleTitle: submission.title,
              manuscriptNumber: ms,
              editorComments: editor_comment || null,
            }),
          });
          console.log(`📧 "Revise before review" envoyé à ${author.email} (${ms})`);
        } catch (e) {
          console.error(`⚠️  Échec du mail "revise before review" à ${author.email}:`, e.message);
        }
      } else if (['accepted', 'rejected', 'revision_needed', 'major_revision', 'minor_revision'].includes(status)) {
        // ── Remarque 10 (client) — décision envoyée UNIQUEMENT au soumetteur ──
        const authorsList = Array.isArray(authorsArr) && authorsArr.length
          ? authorsArr.map(a => a.name).filter(Boolean).join('; ')
          : (submission.co_authors ? `${authorName}; ${submission.co_authors}` : authorName);
        sendEmail({
          to: author.email,
          ...EMAIL_TEMPLATES.decisionAuthor({
            salutation,
            articleTitle: submission.title,
            manuscriptNumber: ms,
            authorsList,
            decision: DECISION_LABELS[status],
          }),
        }).catch(() => {});
      } else if (['under_review', 'revised'].includes(status)) {
        // Email générique changement de statut (étapes intermédiaires)
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

    // ── Remarque 9 (client) — décision finale (Accept/Reject) notifiée aux reviewers ──
    if (['accepted', 'rejected'].includes(status)) {
      try {
        const reviewerRows = await pool.query(
          `SELECT DISTINCT u.email, u.first_name, u.last_name
           FROM reviews r JOIN users u ON u.id = r.reviewer_id
           WHERE r.submission_id = $1 AND r.status = 'completed'`,
          [id]
        );
        for (const rv of reviewerRows.rows) {
          sendEmail({
            to: rv.email,
            ...EMAIL_TEMPLATES.finalDecisionReviewer({
              salutation: `Dr. ${rv.first_name} ${rv.last_name}`,
              articleTitle: submission.title,
              manuscriptNumber: ms,
              articleType: submission.article_type,
              decision: DECISION_LABELS[status],
            }),
          }).catch(() => {});
        }
      } catch (e) { console.error('reviewer decision notify:', e.message); }
    }

    // ── Remarque 3 (28/07) — notification in-app à l'auteur + aux co-éditeurs ──
    const decisionLabel = DECISION_LABELS[status] || status.replace(/_/g, ' ');
    const authorId = await pool.query('SELECT author_id FROM submissions WHERE id = $1', [id]);
    if (authorId.rows.length > 0) {
      notify({
        userId: authorId.rows[0].author_id, type: 'decision',
        title: `Editorial decision: ${decisionLabel}`,
        body: submission.title,
        submissionId: Number(id), link: `/author/submissions/${id}`,
      });
    }
    notifyAdmins({
      type: 'decision',
      title: `Decision recorded: ${decisionLabel}`,
      body: submission.title,
      submissionId: Number(id), link: `/admin/submissions/${id}`,
    }, { exceptUserId: req.user.id });

    res.json({ message: 'Status updated', submission });
  } catch (err) {
    console.error('PATCH /submissions/:id/status :', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// ────────────────────────────────────────────────────────────
// PATCH /api/submissions/:id/apc  — Marquer l'APC payé / non payé
//   Remarque 16 (client) : section paiement après acceptation.
//   Admin uniquement — encaissement hors ligne (Mobile Money / virement).
// ────────────────────────────────────────────────────────────
router.patch('/:id/apc', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const paid = req.body.paid === true || req.body.paid === 'true';
    const result = await pool.query(
      `UPDATE submissions
         SET apc_paid = $1, apc_paid_at = ${'CASE WHEN $1 THEN NOW() ELSE NULL END'}, updated_at = NOW()
       WHERE id = $2 RETURNING id, apc_paid, apc_paid_at`,
      [paid, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Submission not found' });
    res.json({ message: paid ? 'APC marked as paid' : 'APC marked as unpaid', submission: result.rows[0] });
  } catch (err) {
    console.error('PATCH /submissions/:id/apc :', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// ────────────────────────────────────────────────────────────
// POST /api/submissions/:id/publication-pdf — PDF final de publication
//   Remarque 14 (28/07) : les articles publiés doivent être servis en PDF.
//   La maison d'édition met en forme le manuscrit, l'exporte en PDF et
//   l'admin le dépose ici ; c'est ce fichier que le public télécharge.
// ────────────────────────────────────────────────────────────
const pdfUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },   // 25 Mo — PDF mis en page
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') cb(null, true);
    else cb(new Error('Only PDF files are accepted for publication'));
  },
});

router.post('/:id/publication-pdf', verifyToken, requireRole('admin'), pdfUpload.single('pdf'), async (req, res) => {
  try {
    const { id } = req.params;
    if (!req.file) return res.status(400).json({ message: 'A PDF file is required' });

    let url;
    if (CLOUDINARY_CONFIGURED) {
      const result = await uploadToCloudinary(req.file.buffer, {
        folder: 'jaei/published',
        resource_type: 'raw',
        public_id: `article_${id}_${Date.now()}.pdf`,
        use_filename: false,
      });
      url = result.secure_url;
    } else {
      const filename = `article_${id}_${Date.now()}.pdf`;
      fs.writeFileSync(path.join(SUBMISSIONS_DIR, filename), req.file.buffer);
      url = `${process.env.BACKEND_URL || 'http://localhost:5000'}/uploads/submissions/${filename}`;
    }

    const result = await pool.query(
      `UPDATE submissions SET published_pdf_url = $1, updated_at = NOW()
        WHERE id = $2 RETURNING id, published_pdf_url`,
      [url, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Submission not found' });

    res.json({ message: 'Publication PDF uploaded', submission: result.rows[0] });
  } catch (err) {
    console.error('POST /submissions/:id/publication-pdf :', err.message);
    res.status(500).json({ message: err.message || 'Server error' });
  }
});

// ────────────────────────────────────────────────────────────
// POST /api/submissions/:id/withdraw  — Retirer sa soumission
//   Remarque 17 (client) : l'auteur ne supprime plus, il "Withdraw".
//   La soumission reste en base avec le statut 'withdrawn'.
//   Impossible après acceptation / publication.
// ────────────────────────────────────────────────────────────
router.post('/:id/withdraw', verifyToken, requireRole('author'), async (req, res) => {
  try {
    const { id } = req.params;
    const check = await pool.query(
      'SELECT id, status FROM submissions WHERE id = $1 AND author_id = $2',
      [id, req.user.id]
    );
    if (check.rows.length === 0) {
      return res.status(404).json({ message: 'Submission not found or access denied' });
    }
    const { status } = check.rows[0];
    if (!['pending', 'submitted', 'under_review', 'revision_needed', 'revised'].includes(status)) {
      return res.status(403).json({ message: 'This submission can no longer be withdrawn at this stage.' });
    }
    const result = await pool.query(
      `UPDATE submissions SET status = 'withdrawn', updated_at = NOW()
       WHERE id = $1 RETURNING id, title, status, updated_at`,
      [id]
    );
    console.log(`↩️  Soumission #${id} retirée (withdrawn) par l'auteur #${req.user.id}`);
    // Remarque 3 (28/07) — l'équipe éditoriale est prévenue du retrait
    notifyAdmins({
      type: 'withdrawn',
      title: 'Submission withdrawn by the author',
      body: result.rows[0].title,
      submissionId: Number(id), link: `/admin/submissions/${id}`,
    });
    res.json({ message: 'Submission withdrawn', submission: result.rows[0] });
  } catch (err) {
    console.error('POST /submissions/:id/withdraw :', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// ────────────────────────────────────────────────────────────
// DELETE /api/submissions/:id  — Supprimer une soumission
//   • Admin uniquement (l'auteur passe par /withdraw — Remarque 17)
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

    // Remarque 17 (client) : la suppression est réservée à l'admin.
    // L'auteur passe par POST /:id/withdraw (statut 'withdrawn').
    if (role !== 'admin') {
      return res.status(403).json({ message: 'Only administrators can delete a submission. Authors may withdraw it instead.' });
    }

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
