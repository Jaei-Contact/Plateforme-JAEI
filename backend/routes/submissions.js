const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const pool = require('../db/connection');
const { verifyToken } = require('../middleware/auth');
const { sendEmail, EMAIL_TEMPLATES } = require('../services/emailService');
const { generateArticleSummary } = require('../services/aiService');

// ── Détection Cloudinary (optionnel) ─────────────────────────
const CLOUDINARY_CONFIGURED =
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET;

const { uploadToCloudinary, privateDownloadUrl } = CLOUDINARY_CONFIGURED
  ? require('../services/cloudinaryService')
  : { uploadToCloudinary: null, privateDownloadUrl: null };
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

  const stream = (url, allowFallback) => {
    https.get(url, (up) => {
      if (up.statusCode !== 200) {
        up.resume();
        // Remarque 9 (22/09) : Cloudinary (compte gratuit) refuse la diffusion
        // publique des PDF — 401 "deny or ACL failure" → "Upstream error" à
        // l'ouverture du PDF de publication. On repasse par l'API authentifiée.
        const fallback = allowFallback && [401, 403].includes(up.statusCode) && privateDownloadUrl
          ? privateDownloadUrl(parsed.href)
          : null;
        if (fallback) return stream(fallback, false);
        console.error(`GET /submissions/file : upstream ${up.statusCode} ${up.headers['x-cld-error'] || ''}`);
        return res.status(up.statusCode || 502).send('Upstream error');
      }
      res.setHeader('Content-Type', ctype);
      res.setHeader('Content-Disposition', `${disposition}; filename="${safeName}"`);
      if (up.headers['content-length']) res.setHeader('Content-Length', up.headers['content-length']);
      up.pipe(res);
    }).on('error', (e) => {
      console.error('GET /submissions/file :', e.message);
      if (!res.headersSent) res.status(502).send('Proxy error');
    });
  };
  stream(parsed.href, true);
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

    // Fichiers attachés (multi-fichiers + type par fichier + version révisée)
    const filesResult = await pool.query(
      `SELECT id, file_url, file_type, description, original_name, file_size, sort_order,
              COALESCE(revision_round, 0) AS revision_round, created_at
       FROM submission_files WHERE submission_id = $1
       ORDER BY COALESCE(revision_round, 0), sort_order, id`,
      [id]
    );

    // Remarques 7-8 (22/09) — fil des messages de l'éditeur : réservé à
    // l'administration et à l'auteur du manuscrit (jamais aux reviewers).
    let messages = [];
    if (role === 'admin' || sub.author_id === userId) {
      const msgResult = await pool.query(
        `SELECT m.id, m.body, m.decision, m.created_at,
                u.first_name || ' ' || u.last_name AS sender_name
           FROM editor_messages m
           LEFT JOIN users u ON u.id = m.sender_id
          WHERE m.submission_id = $1
          ORDER BY m.created_at, m.id`,
        [id]
      );
      messages = msgResult.rows;
    }

    // L'ancien champ editor_comment est un message éditeur → auteur : un
    // reviewer ne doit pas le lire, et l'auteur le retrouve dans `messages`.
    if (role !== 'admin') delete sub.editor_comment;

    res.json({ submission: sub, files: filesResult.rows, messages });
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

// Remarques 5-6 (22/09) — statuts dans lesquels l'auteur doit (et peut)
// déposer une version révisée : après les commentaires, ou après un renvoi
// "Send back to the authors" pour non-respect du format.
const REVISION_STATUSES = ['revision_needed', 'major_revision', 'minor_revision', 'sent_back'];

router.patch('/:id/status', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { status, editor_comment } = req.body;

    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({ message: `Invalid status. Accepted values: ${VALID_STATUSES.join(', ')}` });
    }

    const comment = typeof editor_comment === 'string' ? editor_comment.trim() : '';
    if (comment.length > 20000) {
      return res.status(400).json({ message: 'The editor comment must be under 20000 characters' });
    }

    // ── Remarque 13 (28/07) — pas de publication sans paiement de l'APC ──
    // ── Remarque 10 (22/09) — un article publié est servi en PDF, jamais en Word ──
    if (status === 'published') {
      const paid = await pool.query('SELECT apc_paid, published_pdf_url FROM submissions WHERE id = $1', [id]);
      if (paid.rows.length === 0) return res.status(404).json({ message: 'Submission not found' });
      if (!paid.rows[0].apc_paid) {
        return res.status(409).json({
          message: 'This article cannot be published yet: the Article Processing Charge (APC) has not been marked as paid.',
        });
      }
      if (!paid.rows[0].published_pdf_url) {
        return res.status(409).json({
          message: 'This article cannot be published yet: upload the formatted publication PDF first. Published articles are always served as PDF.',
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
      [status, comment || null, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Submission not found' });
    }

    const submission = result.rows[0];

    // Remarques 7-8 (22/09) — le commentaire qui accompagne la décision entre
    // dans le fil "Editor comments" : l'auteur le retrouve sur sa plateforme.
    if (comment) {
      await pool.query(
        `INSERT INTO editor_messages (submission_id, sender_id, body, decision) VALUES ($1, $2, $3, $4)`,
        [id, req.user.id, comment, status]
      );
    }

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
              editorComments: comment || null,
              revisionUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/author/submissions/${id}`,
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
        // Remarques 7-8 (22/09) : le message de l'éditeur figure dans le mail —
        // c'était la cause du "il n'a pas reçu le message" (il était ignoré ici).
        const FRONT = process.env.FRONTEND_URL || 'http://localhost:3000';
        try {
          await sendEmail({
            to: author.email,
            ...EMAIL_TEMPLATES.decisionAuthor({
              salutation,
              articleTitle: submission.title,
              manuscriptNumber: ms,
              authorsList,
              decision: DECISION_LABELS[status],
              editorComments: comment || null,
              revisionUrl: REVISION_STATUSES.includes(status) ? `${FRONT}/author/submissions/${id}` : null,
            }),
          });
          console.log(`📧 Décision "${DECISION_LABELS[status]}" envoyée à ${author.email} (${ms})`);
        } catch (e) {
          console.error(`⚠️  Échec du mail de décision à ${author.email}:`, e.message);
        }
      } else if (['under_review', 'revised'].includes(status)) {
        // Email générique changement de statut (étapes intermédiaires)
        sendEmail({
          to: author.email,
          ...EMAIL_TEMPLATES.statusChanged({
            authorName,
            articleTitle: submission.title,
            status,
            editorComment: comment || null,
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
// POST /api/submissions/:id/messages  — Message de l'éditeur à l'auteur
//   Remarques 7-8 (22/09) : fenêtre "Editor comments". Seul canal éditorial
//   visible par l'auteur (plateforme + email) ; ne change pas le statut.
//   Body: { body }
// ────────────────────────────────────────────────────────────
router.post('/:id/messages', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const body = typeof req.body.body === 'string' ? req.body.body.trim() : '';
    if (!body) return res.status(400).json({ message: 'The message is empty' });
    if (body.length > 20000) return res.status(400).json({ message: 'The message must be under 20000 characters' });

    const subResult = await pool.query(
      `SELECT s.id, s.title, s.manuscript_number, s.authors, s.author_id,
              u.email, u.first_name, u.last_name
         FROM submissions s JOIN users u ON u.id = s.author_id
        WHERE s.id = $1`,
      [id]
    );
    if (subResult.rows.length === 0) return res.status(404).json({ message: 'Submission not found' });
    const sub = subResult.rows[0];

    const inserted = await pool.query(
      `INSERT INTO editor_messages (submission_id, sender_id, body)
       VALUES ($1, $2, $3) RETURNING id, body, decision, created_at`,
      [id, req.user.id, body]
    );
    const me = await pool.query('SELECT first_name, last_name FROM users WHERE id = $1', [req.user.id]);
    const item = {
      ...inserted.rows[0],
      sender_name: me.rows[0] ? `${me.rows[0].first_name} ${me.rows[0].last_name}` : null,
    };

    let authorsArr = sub.authors;
    if (typeof authorsArr === 'string') { try { authorsArr = JSON.parse(authorsArr); } catch { authorsArr = null; } }
    const submitter = Array.isArray(authorsArr) ? authorsArr.find(a => a.is_submitter) : null;
    const salutation = [submitter?.title, submitter?.name].filter(Boolean).join(' ').trim()
      || `${sub.first_name} ${sub.last_name}`;
    const FRONT = process.env.FRONTEND_URL || 'http://localhost:3000';
    const ms = sub.manuscript_number || `JAEI-#${id}`;

    // Envoi attendu : l'éditeur doit savoir si le mail est réellement parti
    const info = await sendEmail({
      to: sub.email,
      ...EMAIL_TEMPLATES.editorMessage({
        salutation,
        articleTitle: sub.title,
        manuscriptNumber: ms,
        message: body,
        articleUrl: `${FRONT}/author/submissions/${id}`,
      }),
    });
    const emailed = !!info && !info.simulated;
    console.log(`💬 Message éditeur (${ms}) → ${sub.email} — email ${emailed ? 'envoyé' : 'NON envoyé'}`);

    notify({
      userId: sub.author_id, type: 'editor_message',
      title: 'New message from the Editor',
      body: sub.title,
      submissionId: Number(id), link: `/author/submissions/${id}`,
    });

    res.status(201).json({ message: 'Message sent to the author', item, emailed });
  } catch (err) {
    console.error('POST /submissions/:id/messages :', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// ────────────────────────────────────────────────────────────
// POST /api/submissions/:id/revision  — Dépôt d'une version révisée
//   Remarques 5-6 (22/09) : après les commentaires de l'éditeur (ou un renvoi
//   "Send back to the authors"), l'auteur dépose sa version corrigée :
//     • Response to the reviewer
//     • Revised Manuscript (clean version)
//     • Revised Manuscript (with track change)
//     • Other documents (facultatif)
//   → statut 'revised', manuscrit principal = version propre, équipe alertée.
// ────────────────────────────────────────────────────────────
const REVISION_SLOTS = [
  { field: 'response_to_reviewer', label: 'Response to the reviewer',               exts: ['.docx', '.pdf'] },
  { field: 'revised_clean',        label: 'Revised Manuscript (clean version)',     exts: ['.docx'] },
  { field: 'revised_tracked',      label: 'Revised Manuscript (with track change)', exts: ['.docx'] },
  { field: 'other_documents',      label: 'Other documents', max: 5,
    exts: ['.docx', '.pdf', '.xlsx', '.png', '.jpg', '.jpeg', '.tif', '.tiff'] },
];

const revisionUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024, files: 8, fields: 10 },
  fileFilter: (req, file, cb) => {
    const slot = REVISION_SLOTS.find(s => s.field === file.fieldname);
    if (!slot) return cb(new Error('Unexpected file field'));
    const ext = path.extname(file.originalname).toLowerCase();
    if (!slot.exts.includes(ext)) {
      return cb(new Error(`${slot.label}: accepted formats are ${slot.exts.join(', ')}`));
    }
    cb(null, true);
  },
}).fields(REVISION_SLOTS.map(s => ({ name: s.field, maxCount: s.max || 1 })));

// Erreurs d'upload renvoyées en 400 lisible (le gestionnaire global les masquerait)
const handleRevisionUpload = (req, res, next) => revisionUpload(req, res, (err) => {
  if (!err) return next();
  const message = err.code === 'LIMIT_FILE_SIZE' ? 'Each file must be under 15 MB'
    : err.code === 'LIMIT_FILE_COUNT' || err.code === 'LIMIT_UNEXPECTED_FILE' ? 'Too many files for this revision'
    : err.message || 'Invalid upload';
  return res.status(400).json({ message });
});

const uploadRevisionFile = async (file, submissionId) => {
  // Extension déjà validée par le fileFilter (liste blanche par emplacement)
  const ext = path.extname(file.originalname).toLowerCase();
  const name = `revision_${submissionId}_${Date.now()}_${crypto.randomBytes(3).toString('hex')}${ext}`;
  if (CLOUDINARY_CONFIGURED) {
    const result = await uploadToCloudinary(file.buffer, {
      folder: 'jaei/revisions', resource_type: 'raw', public_id: name, use_filename: false,
    });
    return result.secure_url;
  }
  fs.writeFileSync(path.join(SUBMISSIONS_DIR, name), file.buffer);
  return `${process.env.BACKEND_URL || 'http://localhost:5000'}/uploads/submissions/${name}`;
};

router.post('/:id/revision', verifyToken, handleRevisionUpload, async (req, res) => {
  try {
    const { id } = req.params;
    const subResult = await pool.query(
      `SELECT s.id, s.title, s.status, s.author_id, s.manuscript_number, s.article_type, s.authors,
              COALESCE(s.revision_count, 0) AS revision_count,
              u.email, u.first_name, u.last_name
         FROM submissions s JOIN users u ON u.id = s.author_id
        WHERE s.id = $1`,
      [id]
    );
    // Propriété vérifiée ici (pas de filtre sur le rôle : seul l'auteur du manuscrit dépose)
    if (subResult.rows.length === 0 || subResult.rows[0].author_id !== req.user.id) {
      return res.status(404).json({ message: 'Submission not found or access denied' });
    }
    const sub = subResult.rows[0];
    if (!REVISION_STATUSES.includes(sub.status)) {
      return res.status(409).json({
        message: 'A revised version can only be submitted once the editor has requested changes.',
      });
    }

    const files = req.files || {};
    if (!files.revised_clean?.[0]) {
      return res.status(400).json({ message: 'The revised manuscript (clean version) is required.' });
    }
    // Après une évaluation par les pairs, la réponse aux reviewers et la version
    // avec suivi des modifications sont exigées — pas pour un simple renvoi de
    // format avant évaluation ("Send back to the authors").
    if (sub.status !== 'sent_back') {
      if (!files.response_to_reviewer?.[0]) {
        return res.status(400).json({ message: 'The response to the reviewer is required.' });
      }
      if (!files.revised_tracked?.[0]) {
        return res.status(400).json({ message: 'The revised manuscript with track changes is required.' });
      }
    }

    const round = Number(sub.revision_count) + 1;
    const queue = REVISION_SLOTS.flatMap(slot => (files[slot.field] || []).map(file => ({ slot, file })));
    const saved = [];
    for (const [i, { slot, file }] of queue.entries()) {
      const url = await uploadRevisionFile(file, id);
      await pool.query(
        `INSERT INTO submission_files
           (submission_id, file_url, file_type, original_name, file_size, sort_order, description, revision_round)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [id, url, slot.label, file.originalname.slice(0, 300), file.size, i, `Revised version ${round}`, round]
      );
      saved.push({ slot, url, name: file.originalname });
    }

    const cleanUrl = saved.find(s => s.slot.field === 'revised_clean').url;
    const updated = await pool.query(
      `UPDATE submissions
          SET status = 'revised', pdf_url = $1, revision_count = $2,
              revised_at = NOW(), updated_at = NOW()
        WHERE id = $3
        RETURNING id, status, revision_count, revised_at, pdf_url`,
      [cleanUrl, round, id]
    );

    // ── Accusé de réception à l'auteur + alerte à l'équipe éditoriale ──
    let authorsArr = sub.authors;
    if (typeof authorsArr === 'string') { try { authorsArr = JSON.parse(authorsArr); } catch { authorsArr = null; } }
    const submitter = Array.isArray(authorsArr) ? authorsArr.find(a => a.is_submitter) : null;
    const authorName = `${sub.first_name} ${sub.last_name}`;
    const salutation = [submitter?.title, submitter?.name].filter(Boolean).join(' ').trim() || authorName;
    const FRONT = process.env.FRONTEND_URL || 'http://localhost:3000';
    const ms = sub.manuscript_number || `JAEI-#${id}`;

    sendEmail({
      to: sub.email,
      ...EMAIL_TEMPLATES.revisionReceived({
        salutation, articleTitle: sub.title, manuscriptNumber: ms, round,
        articleUrl: `${FRONT}/author/submissions/${id}`,
      }),
    }).catch(() => {});

    if (process.env.ADMIN_EMAIL) {
      sendEmail({
        to: process.env.ADMIN_EMAIL,
        ...EMAIL_TEMPLATES.revisionSubmittedAlert({
          articleTitle: sub.title, manuscriptNumber: ms, articleType: sub.article_type,
          authorName, round,
          files: saved.map(s => `${s.slot.label} — ${s.name}`),
          adminUrl: `${FRONT}/admin/submissions/${id}`,
        }),
      }).catch(() => {});
    }

    notifyAdmins({
      type: 'revision_submitted',
      title: `Revised version received (${ms})`,
      body: sub.title,
      submissionId: Number(id), link: `/admin/submissions/${id}`,
    });

    console.log(`📝 Version révisée ${round} déposée pour ${ms} (${saved.length} fichier(s))`);
    res.status(201).json({ message: 'Revised version submitted', submission: updated.rows[0] });
  } catch (err) {
    console.error('POST /submissions/:id/revision :', err.message);
    res.status(500).json({ message: 'Server error while saving the revised version' });
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
