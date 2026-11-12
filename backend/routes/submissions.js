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
const { MAX_UPLOAD_BYTES } = require('../config/limits');
const { getApcAmountUsd } = require('../services/settingsService');
const { wrapUpload } = require('../middleware/uploadErrors');
const { ACCEPTED_MIMES, validateSubmissionFile } = require('../utils/uploadRules');
const { analyzeAuthorship } = require('../utils/authorship');
const { STAGE_COUNTS_JOIN, withStage } = require('../utils/stage');
const {
  PUBLISHABLE_TYPES, MAX_PUBLISHED_FILES, SUPPLEMENTARY_EXTS,
  validateSupplementaryFile, decodeFileName,
} = require('../utils/supplementary');
const { editorialLock, EDITORIAL_LOCK_MESSAGE } = require('../middleware/editorialLock');
const { recordApcPayment, ensureOfflinePayment } = require('../services/apcService');

// ── Détection Cloudinary (optionnel) ─────────────────────────
const CLOUDINARY_CONFIGURED =
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET;

const { uploadToCloudinary, deleteFromCloudinary, privateDownloadUrl } = CLOUDINARY_CONFIGURED
  ? require('../services/cloudinaryService')
  : { uploadToCloudinary: null, deleteFromCloudinary: null, privateDownloadUrl: null };
const { buildManuscriptNumber } = require('../utils/articleTypes');
const { notify, notifyAdmins } = require('../services/notificationService');

// ── Stockage disque local (fallback PDF) ─────────────────────
const SUBMISSIONS_DIR = path.join(__dirname, '../uploads/submissions');
if (!fs.existsSync(SUBMISSIONS_DIR)) fs.mkdirSync(SUBMISSIONS_DIR, { recursive: true });

// Upload des fichiers d'une soumission — stockage mémoire (buffer utilisé ensuite)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize:  MAX_UPLOAD_BYTES, // limite unique (10 Mo : plafond Cloudinary gratuit)
    fieldSize: 100 * 1024,        // 100 Ko max par champ texte
    fields:    30,                 // max 30 champs non-fichiers
    files:     12,                 // max 12 fichiers par soumission
  },
  fileFilter: (req, file, cb) => {
    // Word (.docx) pour tout (demande client : plus de PDF) ; images (TIFF, EPS,
    // JPEG, PNG) tolérées ici puis restreintes aux figures dans la route, une fois
    // le type de chaque fichier connu (voir utils/uploadRules.js).
    if (ACCEPTED_MIMES.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Only Word (.docx) files are accepted (figures may also be TIFF, EPS, JPEG or PNG).'));
  },
});

/**
 * Upload un fichier soumission et retourne son URL publique.
 * Cloudinary si configuré, sinon disque local.
 */
// Extensions conservées dans le nom stocké (liste blanche — jamais extraite brute
// du nom d'origine). Les fichiers de soumission sont validés avant d'arriver ici
// (voir utils/uploadRules.js) : .docx, ou image pour les figures.
const SAFE_EXTS = { '.pdf': 1, '.docx': 1, '.tif': 1, '.tiff': 1, '.eps': 1, '.jpg': 1, '.jpeg': 1, '.png': 1 };

const handleFileUpload = async (file) => {
  const rawExt = path.extname(file.originalname).toLowerCase();
  const ext = SAFE_EXTS[rawExt] ? rawExt : '.pdf';
  const stored = `submission_${Date.now()}_${crypto.randomBytes(2).toString('hex')}${ext}`;
  if (CLOUDINARY_CONFIGURED) {
    // Extension dans le public_id → Cloudinary sert avec le bon type +
    // Content-Disposition (ouverture navigateur, pas téléchargement forcé).
    // Sans extension : octet-stream + attachment → téléchargement forcé.
    const result = await uploadToCloudinary(file.buffer, {
      folder: 'jaei/submissions',
      resource_type: 'raw',
      public_id: stored,
      use_filename: false,
    });
    return result.secure_url;
  } else {
    fs.writeFileSync(path.join(SUBMISSIONS_DIR, stored), file.buffer);
    const base = process.env.BACKEND_URL || 'http://localhost:5000';
    return `${base}/uploads/submissions/${stored}`;
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
// POST /api/submissions  — Soumettre un article
//   Tout compte connecté peut soumettre (membre ou membre du comité) : un seul type
//   de compte. Le soumetteur devient l'auteur du manuscrit (author_id) ; ses droits
//   sur CET article en découlent (modifier, retirer, payer l'APC…).
// ────────────────────────────────────────────────────────────
router.post('/', verifyToken, wrapUpload(upload.any()), async (req, res) => {
  try {
    // Un compte créé par invitation (fiche incomplète) doit d'abord remplir sa fiche
    const me = await pool.query('SELECT profile_completed FROM users WHERE id = $1', [req.user.id]);
    if (me.rows.length > 0 && me.rows[0].profile_completed === false) {
      return res.status(403).json({ message: 'Please complete your profile before submitting an article.' });
    }

    const { title, abstract, keywords, research_area, co_authors, authors,
            article_type, cover_letter, comments, ai_declaration, declaration_of_interest,
            file_types, file_descriptions } = req.body;

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
    // Remarque 10 (23/09) : Title page (identité des auteurs, jamais montrée
    // aux reviewers) et Blinded Manuscript (texte anonymisé) sont désormais
    // deux documents distincts et obligatoires.
    let typesCheck = [];
    try { typesCheck = file_types ? JSON.parse(file_types) : []; } catch { typesCheck = []; }
    for (const required of ['Blinded Manuscript', 'Title page']) {
      if (!typesCheck.includes(required)) {
        return res.status(400).json({ message: `A file of type "${required}" is required.` });
      }
    }
    const declInterest = declaration_of_interest === '1' || declaration_of_interest === true || declaration_of_interest === 'true';
    if (!declInterest) {
      return res.status(400).json({ message: 'You must confirm the Declaration of Interests before submitting.' });
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

    // Format de chaque fichier selon son type : Word (.docx) pour tout, images
    // (TIFF, EPS, JPEG, PNG) autorisées pour les figures uniquement.
    for (let i = 0; i < files.length; i++) {
      const problem = validateSubmissionFile(files[i], types[i] || 'Blinded Manuscript');
      if (problem) return res.status(400).json({ message: problem });
    }

    // Upload de chaque fichier (Cloudinary ou disque local)
    const uploaded = [];
    for (let i = 0; i < files.length; i++) {
      const url = await handleFileUpload(files[i]);
      uploaded.push({
        url,
        type: (types[i] || 'Blinded Manuscript').toString().slice(0, 80),
        description: (descriptions[i] || '').toString().slice(0, 300),
        name: files[i].originalname,
        size: files[i].size,
      });
    }
    // Fichier principal = "Blinded Manuscript" (sinon le 1er) → pdf_url reste compatible
    const primary = uploaded.find(f => f.type === 'Blinded Manuscript') || uploaded[0];
    const pdf_url = primary.url;

    const aiDecl = ai_declaration === '1' || ai_declaration === true || ai_declaration === 'true';

    // Soumission + fichiers dans une seule transaction : avant, l'echec d'un
    // INSERT submission_files etait juste logge (.catch), jamais remonte ni
    // annule — un fichier pouvait finir uploade sur Cloudinary sans jamais
    // avoir de ligne correspondante en base, de facon totalement silencieuse.
    const dbClient = await pool.connect();
    let submissionId, manuscriptNumber, result;
    try {
      await dbClient.query('BEGIN');

      result = await dbClient.query(
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
      submissionId = result.rows[0].id;

      // Numéro de manuscrit (clé unique) : JAEI-A-26-09928 (Remarque 8 du 28/07)
      // La lettre correspond au type d'article choisi par l'auteur.
      manuscriptNumber = buildManuscriptNumber(article_type, submissionId);
      await dbClient.query('UPDATE submissions SET manuscript_number = $1 WHERE id = $2',
        [manuscriptNumber, submissionId]);

      // Enregistre chaque fichier (submission_files) — meme transaction
      for (let i = 0; i < uploaded.length; i++) {
        const f = uploaded[i];
        await dbClient.query(
          `INSERT INTO submission_files (submission_id, file_url, file_type, description, original_name, file_size, sort_order)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [submissionId, f.url, f.type, f.description || null, f.name, f.size, i]
        );
      }

      await dbClient.query('COMMIT');
    } catch (txErr) {
      await dbClient.query('ROLLBACK').catch(() => {});
      console.error('POST /submissions transaction failed, rolled back:', txErr.message);
      return res.status(500).json({ message: 'Could not save your submission. Please try again — no partial record was kept.' });
    } finally {
      dbClient.release();
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
      // Salutation "Mr./Ms./Dr./Prof. + nom" (titre choisi dans le formulaire)
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
      // Un éditeur qui soumet lui-même n'est pas alerté de son propre article (verrou éditorial)
      const adminRows = await pool.query("SELECT email FROM users WHERE role = 'admin' AND email IS NOT NULL AND id <> $1", [req.user.id]);
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
    }, { exceptUserId: req.user.id });

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
//   • Membre : SES articles (author_id = moi). Les articles qu'il relit passent
//     par GET /api/reviews/my-assignments, jamais par ici.
//   • Admin : tous les articles, SAUF ceux dont il est auteur ou co-auteur (verrou
//     éditorial : un autre éditeur les traite).
//   • ?scope=mine : mes propres articles, quel que soit mon rôle (espace « My submissions »,
//     y compris pour un membre du comité qui soumet).
// ────────────────────────────────────────────────────────────
router.get('/', verifyToken, async (req, res) => {
  try {
    const { role, id: userId, email } = req.user;
    const { status, scope } = req.query;

    // Chaque ligne porte `stage` : l'étape affichée dans la pastille (voir utils/stage.js).
    // Mes articles (membre, ou admin avec scope=mine)
    if (role !== 'admin' || scope === 'mine') {
      const result = await pool.query(
        `SELECT s.*, rv.reviews_invited, rv.reviews_accepted, rv.reviews_completed
           FROM submissions s
           ${STAGE_COUNTS_JOIN}
          WHERE s.author_id = $1
          ${status ? 'AND s.status = $2' : ''}
          ORDER BY s.submitted_at DESC`,
        status ? [userId, status] : [userId]
      );
      return res.json({ submissions: result.rows.map(withStage) });
    }

    // Vue éditoriale (admin) : avec l'éditeur en charge (editor_name) pour voir d'un coup d'œil
    // quels articles n'ont pas encore été confiés à un co-éditeur.
    const result = await pool.query(
      `SELECT s.*, u.first_name || ' ' || u.last_name AS author_name, u.email AS author_email,
              e.first_name || ' ' || e.last_name AS editor_name,
              rv.reviews_invited, rv.reviews_accepted, rv.reviews_completed
         FROM submissions s
         JOIN users u ON u.id = s.author_id
         LEFT JOIN users e ON e.id = s.editor_id
         ${STAGE_COUNTS_JOIN}
        ${status ? 'WHERE s.status = $1' : ''}
        ORDER BY s.submitted_at DESC`,
      status ? [status] : []
    );
    const visible = result.rows.filter(s =>
      !analyzeAuthorship({ author_id: s.author_id, authors: s.authors, submitter_email: s.author_email },
                         { userId, email }).isAuthor);
    res.json({ submissions: visible.map(withStage) });
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
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    csv:  'text/csv; charset=utf-8',
    txt:  'text/plain; charset=utf-8',
    zip:  'application/zip',
    jpg:  'image/jpeg',
    jpeg: 'image/jpeg',
    png:  'image/png',
    tif:  'image/tiff',
    tiff: 'image/tiff',
    eps:  'application/postscript',
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
//   Les droits dépendent du LIEN avec ce manuscrit, pas d'un type de compte :
//   • éditeur (admin) qui n'est PAS auteur du manuscrit → vue éditoriale complète ;
//   • soumetteur du manuscrit (membre, ou éditeur qui a soumis le sien) → vue auteur ;
//   • tout autre cas → refus. Un relecteur lit le manuscrit par /api/reviews (vue anonymisée).
//   `editorial_lock: true` signale à l'interface un éditeur auteur de CE manuscrit.
// ────────────────────────────────────────────────────────────
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { role, id: userId, email } = req.user;

    const result = await pool.query(
      `SELECT s.*, u.first_name || ' ' || u.last_name AS author_name, u.email AS author_email,
              e.first_name || ' ' || e.last_name AS editor_name,
              rv.reviews_invited, rv.reviews_accepted, rv.reviews_completed
       FROM submissions s
       JOIN users u ON u.id = s.author_id
       LEFT JOIN users e ON e.id = s.editor_id
       ${STAGE_COUNTS_JOIN}
       WHERE s.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Submission not found' });
    }

    const sub = withStage(result.rows[0]);   // `stage` = étape affichée (voir utils/stage.js)

    // Lien de la personne connectée avec ce manuscrit
    const link = analyzeAuthorship(
      { author_id: sub.author_id, authors: sub.authors, submitter_email: sub.author_email },
      { userId, email }
    );
    const isEditor    = role === 'admin' && !link.isAuthor;   // vue éditoriale
    const isSubmitter = sub.author_id === userId;             // vue auteur
    if (!isEditor && !isSubmitter) {
      // Éditeur co-auteur (non soumetteur) : aucun accès éditorial, et pas de vue auteur non plus
      if (role === 'admin') {
        return res.status(403).json({ message: EDITORIAL_LOCK_MESSAGE, editorial_lock: true });
      }
      return res.status(403).json({ message: 'Access denied' });
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
    // l'éditeur et à l'auteur du manuscrit (jamais aux relecteurs).
    const msgResult = await pool.query(
      `SELECT m.id, m.body, m.decision, m.created_at,
              u.first_name || ' ' || u.last_name AS sender_name
         FROM editor_messages m
         LEFT JOIN users u ON u.id = m.sender_id
        WHERE m.submission_id = $1
        ORDER BY m.created_at, m.id`,
      [id]
    );
    const messages = msgResult.rows;

    // Facture d'APC (si émise) : réservée à l'éditeur et à l'auteur du manuscrit.
    // Le PDF se télécharge via GET /api/payments/invoices/:id/download.
    const invResult = await pool.query(
      `SELECT id, invoice_number, issued_at FROM invoices
        WHERE submission_id = $1 ORDER BY id DESC LIMIT 1`,
      [id]
    );
    const invoice = invResult.rows[0] || null;

    // L'ancien champ editor_comment est un message éditeur → auteur : l'auteur
    // le retrouve dans `messages`.
    if (!isEditor) delete sub.editor_comment;

    // Documents supplémentaires déjà publiés avec l'article (gérés par l'éditeur uniquement)
    const publishedFiles = isEditor ? await listPublishedFiles(id) : [];

    // `view` : relation de la personne connectée avec CE manuscrit ('editor' | 'author') ;
    // l'interface s'en sert pour choisir les actions à afficher (et non le type de compte).
    res.json({
      submission: sub, files: filesResult.rows, messages, invoice,
      published_files: publishedFiles,
      view: isEditor ? 'editor' : 'author',
      editorial_lock: role === 'admin' && !isEditor,
    });
  } catch (err) {
    console.error('GET /submissions/:id :', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// ────────────────────────────────────────────────────────────
// PATCH /api/submissions/:id  — Modifier une soumission (auteur du manuscrit)
//   Autorisé uniquement si statut = pending | submitted
//   La propriété est vérifiée dans la requête (author_id = moi), quel que soit le rôle du compte.
// ────────────────────────────────────────────────────────────
router.patch('/:id', verifyToken, async (req, res) => {
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

router.patch('/:id/status', verifyToken, requireRole('admin'), editorialLock(), async (req, res) => {
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
        // ── Remarque 4 (23/09) — revirement explicite de la Remarque 10 du
        // 28/07 : la décision est désormais envoyée au soumetteur ET à
        // chaque co-auteur ayant un email déclaré (plus seulement au
        // soumetteur).
        const authorsList = Array.isArray(authorsArr) && authorsArr.length
          ? authorsArr.map(a => a.name).filter(Boolean).join('; ')
          : (submission.co_authors ? `${authorName}; ${submission.co_authors}` : authorName);
        // Remarques 7-8 (22/09) : le message de l'éditeur figure dans le mail —
        // c'était la cause du "il n'a pas reçu le message" (il était ignoré ici).
        const FRONT = process.env.FRONTEND_URL || 'http://localhost:3000';
        const isRevisionDecision = REVISION_STATUSES.includes(status);
        // Remarque 4 (23/09) : sur une décision de révision, 2 semaines pour
        // renvoyer le manuscrit corrigé (même délai que Commentaire 9).
        const revisionDueDate = isRevisionDecision
          ? new Date(Date.now() + 14 * 24 * 3600 * 1000).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })
          : null;
        const recipients = [{ email: author.email, salutation }];
        const seenEmails = new Set([author.email.toLowerCase()]);
        if (Array.isArray(authorsArr)) {
          for (const a of authorsArr) {
            const em = (a.email || '').trim().toLowerCase();
            if (!em || a.is_submitter || seenEmails.has(em)) continue;
            seenEmails.add(em);
            recipients.push({ email: a.email.trim(), salutation: [a.title, a.name].filter(Boolean).join(' ').trim() || a.name || 'Colleague' });
          }
        }
        // Acceptation : montant courant de l'APC (réglage admin ou 200 USD), annoncé dans l'email
        const apcAmount = status === 'accepted' ? await getApcAmountUsd() : null;
        for (const r of recipients) {
          try {
            await sendEmail({
              to: r.email,
              ...EMAIL_TEMPLATES.decisionAuthor({
                salutation: r.salutation,
                articleTitle: submission.title,
                manuscriptNumber: ms,
                authorsList,
                decision: DECISION_LABELS[status],
                editorComments: comment || null,
                revisionUrl: isRevisionDecision ? `${FRONT}/author/submissions/${id}` : null,
                revisionDueDate,
                loginUrl: isRevisionDecision ? `${FRONT}/forgot-password` : null,
                // Acceptation : invitation à régler l'APC (le lien n'est donné qu'au soumetteur)
                apc: status === 'accepted'
                  ? { amount: apcAmount, url: r === recipients[0] ? `${FRONT}/author/submissions/${id}` : null }
                  : null,
              }),
            });
            console.log(`📧 Décision "${DECISION_LABELS[status]}" envoyée à ${r.email} (${ms})`);
          } catch (e) {
            console.error(`⚠️  Échec du mail de décision à ${r.email}:`, e.message);
          }
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
              salutation: `${rv.first_name} ${rv.last_name}`,
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
//   Admin uniquement — marquer l'APC comme payée (ou annuler).
// ────────────────────────────────────────────────────────────
router.patch('/:id/apc', verifyToken, requireRole('admin'), editorialLock(), async (req, res) => {
  try {
    const { id } = req.params;
    const paid = req.body.paid === true || req.body.paid === 'true';

    const before = await pool.query('SELECT id, status, author_id, apc_paid FROM submissions WHERE id = $1', [id]);
    if (before.rows.length === 0) return res.status(404).json({ message: 'Submission not found' });
    const prev = before.rows[0];

    const result = await pool.query(
      `UPDATE submissions
         SET apc_paid = $1, apc_paid_at = ${'CASE WHEN $1 THEN NOW() ELSE NULL END'}, updated_at = NOW()
       WHERE id = $2 RETURNING id, apc_paid, apc_paid_at`,
      [paid, id]
    );

    // Premier passage à « payée » d'un article accepté/publié : ligne de paiement
    // marquée par l'admin, facture PDF numérotée, email de confirmation à l'auteur (facture
    // jointe) et notification. Idempotent : décocher puis recocher ne ré-émet rien.
    // Un échec de facturation/email n'annule jamais le marquage de l'APC.
    let apc = { invoice: null, emailed: false };
    if (paid && !prev.apc_paid && ['accepted', 'published'].includes(prev.status)) {
      let paymentId = null;
      const apcAmount = await getApcAmountUsd();
      try {
        paymentId = await ensureOfflinePayment({ submissionId: Number(id), userId: prev.author_id, amount: apcAmount });
      } catch (e) {
        console.error('⚠️  ensureOfflinePayment:', e.message);
      }
      apc = await recordApcPayment({ submissionId: Number(id), method: 'offline', paymentId, amount: apcAmount });
    }

    res.json({
      message: paid ? 'APC marked as paid' : 'APC marked as unpaid',
      submission: result.rows[0],
      invoice: apc.invoice ? { number: apc.invoice.invoice_number } : null,
      emailed: apc.emailed,
    });
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
  limits: { fileSize: MAX_UPLOAD_BYTES },   // limite unique (plafond Cloudinary gratuit)
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') cb(null, true);
    else cb(new Error('Only PDF files are accepted for publication'));
  },
});

router.post('/:id/publication-pdf', verifyToken, requireRole('admin'), editorialLock(), wrapUpload(pdfUpload.single('pdf')), async (req, res) => {
  try {
    const { id } = req.params;
    if (!req.file) return res.status(400).json({ message: 'A PDF file is required' });
    if (req.file.buffer.slice(0, 5).toString('latin1') !== '%PDF-') {
      return res.status(400).json({ message: 'The uploaded file is not a valid PDF.' });
    }

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
// Documents supplémentaires publiés avec l'article (figures, tableaux en plus, données…)
//   Réservé à l'éditeur (verrou éditorial). Une fois l'article ACCEPTÉ — pour préparer la
//   publication — ou PUBLIÉ — pour compléter / retirer après coup.
//   • PUT    /:id/supplementary           → choisir parmi les fichiers déposés par l'auteur
//   • POST   /:id/supplementary           → déposer ses propres fichiers (multipart « files »)
//   • DELETE /:id/supplementary/:fileId   → retirer un document de la liste publique
//   Côté public : GET /api/articles/:id (liste) ; fichiers servis comme le PDF de publication.
// ────────────────────────────────────────────────────────────
const PUBLISHED_FILE_COLUMNS = 'id, file_url, file_type, description, original_name, file_size, source_file_id, uploaded_by_editor, created_at';

const listPublishedFiles = async (submissionId) => (await pool.query(
  `SELECT ${PUBLISHED_FILE_COLUMNS} FROM published_files WHERE submission_id = $1 ORDER BY sort_order, id`,
  [submissionId]
)).rows;

/** Renvoie null si l'article existe et est dans un statut qui permet de gérer ces documents, sinon { status, message }. */
const supplementaryGate = async (submissionId) => {
  const r = await pool.query('SELECT status FROM submissions WHERE id = $1', [submissionId]);
  if (r.rows.length === 0) return { status: 404, message: 'Submission not found' };
  if (!['accepted', 'published'].includes(r.rows[0].status)) {
    return { status: 409, message: 'Supplementary files can be managed once the article is accepted.' };
  }
  return null;
};

const suppUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_BYTES, files: 10, fields: 30, fieldSize: 100 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    if (SUPPLEMENTARY_EXTS.includes(ext)) cb(null, true);
    else cb(new Error(`"${decodeFileName(file.originalname)}": accepted formats are ${SUPPLEMENTARY_EXTS.join(', ')}.`));
  },
});

/** Stocke un fichier déposé par l'éditeur (Cloudinary ou disque local) et renvoie son URL. */
const storeSupplementaryFile = async (file, submissionId) => {
  const ext = path.extname(file.originalname).toLowerCase();    // déjà validée (liste blanche)
  const stored = `supp_${submissionId}_${Date.now()}_${crypto.randomBytes(3).toString('hex')}${ext}`;
  if (CLOUDINARY_CONFIGURED) {
    const result = await uploadToCloudinary(file.buffer, {
      folder: 'jaei/published', resource_type: 'raw', public_id: stored, use_filename: false,
    });
    return result.secure_url;
  }
  fs.writeFileSync(path.join(SUBMISSIONS_DIR, stored), file.buffer);
  return `${process.env.BACKEND_URL || 'http://localhost:5000'}/uploads/submissions/${stored}`;
};

/** Supprime le fichier stocké d'un document déposé par l'éditeur (jamais ceux de l'auteur). Sans erreur bloquante. */
const removeStoredSupplementary = async (url) => {
  try {
    const cloud = String(url).match(/^https:\/\/res\.cloudinary\.com\/[^/]+\/raw\/upload\/(?:v\d+\/)?(.+)$/);
    if (cloud && deleteFromCloudinary && /\/supp_[\w.-]+$/.test(cloud[1])) {
      await deleteFromCloudinary(decodeURIComponent(cloud[1]), 'raw');
      return;
    }
    const local = String(url).match(/\/uploads\/submissions\/(supp_[\w.-]+)$/);
    if (local) fs.unlink(path.join(SUBMISSIONS_DIR, local[1]), () => {});
  } catch (e) {
    console.error('removeStoredSupplementary :', e.message);
  }
};

// Choisir, parmi les fichiers de l'auteur, ceux qui sont publiés (la liste envoyée REMPLACE la sélection précédente ;
// les fichiers déposés par l'éditeur ne sont pas touchés).
router.put('/:id/supplementary', verifyToken, requireRole('admin'), editorialLock(), async (req, res) => {
  try {
    const { id } = req.params;
    const blocked = await supplementaryGate(id);
    if (blocked) return res.status(blocked.status).json({ message: blocked.message });

    if (!Array.isArray(req.body.source_file_ids)) {
      return res.status(400).json({ message: 'source_file_ids must be an array of file ids.' });
    }
    const ids = [...new Set(req.body.source_file_ids.map(Number))];
    if (ids.some((n) => !Number.isInteger(n))) {
      return res.status(400).json({ message: 'source_file_ids must contain file ids only.' });
    }

    // Uniquement des fichiers de CET article, d'un type publiable
    const cand = ids.length === 0 ? { rows: [] } : await pool.query(
      `SELECT id, file_url, file_type, description, original_name, file_size
         FROM submission_files
        WHERE submission_id = $1 AND id = ANY($2) AND file_type = ANY($3)`,
      [id, ids, PUBLISHABLE_TYPES]
    );
    if (cand.rows.length !== ids.length) {
      return res.status(400).json({ message: 'One or more files cannot be published (not a file of this article, or a file type that is never public).' });
    }
    const editorFiles = await pool.query(
      'SELECT COUNT(*)::int AS n FROM published_files WHERE submission_id = $1 AND uploaded_by_editor = TRUE', [id]);
    if (editorFiles.rows[0].n + ids.length > MAX_PUBLISHED_FILES) {
      return res.status(400).json({ message: `An article can have at most ${MAX_PUBLISHED_FILES} supplementary files.` });
    }

    const db = await pool.connect();
    try {
      await db.query('BEGIN');
      await db.query(
        'DELETE FROM published_files WHERE submission_id = $1 AND source_file_id IS NOT NULL AND NOT (source_file_id = ANY($2))',
        [id, ids]
      );
      for (const f of cand.rows) {
        await db.query(
          `INSERT INTO published_files (submission_id, file_url, file_type, description, original_name, file_size, source_file_id)
           SELECT $1, $2, $3, $4, $5, $6, $7
            WHERE NOT EXISTS (SELECT 1 FROM published_files WHERE submission_id = $1 AND source_file_id = $7)`,
          [id, f.file_url, f.file_type, f.description, f.original_name, f.file_size, f.id]
        );
      }
      await db.query('COMMIT');
    } catch (txErr) {
      await db.query('ROLLBACK').catch(() => {});
      throw txErr;
    } finally {
      db.release();
    }

    res.json({ message: 'Supplementary files updated', published_files: await listPublishedFiles(id) });
  } catch (err) {
    console.error('PUT /submissions/:id/supplementary :', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// Déposer ses propres documents (champ multipart « files » ; « descriptions » et « types » : tableaux JSON facultatifs)
router.post('/:id/supplementary', verifyToken, requireRole('admin'), editorialLock(), wrapUpload(suppUpload.array('files', 10)), async (req, res) => {
  try {
    const { id } = req.params;
    const blocked = await supplementaryGate(id);
    if (blocked) return res.status(blocked.status).json({ message: blocked.message });

    const files = req.files || [];
    if (files.length === 0) return res.status(400).json({ message: 'At least one file is required.' });
    for (const f of files) {
      f.originalname = decodeFileName(f.originalname);
      const problem = validateSupplementaryFile(f);
      if (problem) return res.status(400).json({ message: problem });
    }

    const current = await pool.query('SELECT COUNT(*)::int AS n FROM published_files WHERE submission_id = $1', [id]);
    if (current.rows[0].n + files.length > MAX_PUBLISHED_FILES) {
      return res.status(400).json({ message: `An article can have at most ${MAX_PUBLISHED_FILES} supplementary files.` });
    }

    let descriptions = [], types = [];
    try { descriptions = req.body.descriptions ? JSON.parse(req.body.descriptions) : []; } catch { descriptions = []; }
    try { types = req.body.types ? JSON.parse(req.body.types) : []; } catch { types = []; }

    for (let i = 0; i < files.length; i++) {
      const url = await storeSupplementaryFile(files[i], id);
      const type = PUBLISHABLE_TYPES.includes(types[i]) ? types[i] : 'Supplementary Material';
      await pool.query(
        `INSERT INTO published_files (submission_id, file_url, file_type, description, original_name, file_size, uploaded_by_editor)
         VALUES ($1, $2, $3, $4, $5, $6, TRUE)`,
        [id, url, type, String(descriptions[i] || '').slice(0, 300) || null, files[i].originalname.slice(0, 300), files[i].size]
      );
    }

    res.status(201).json({ message: 'Supplementary files uploaded', published_files: await listPublishedFiles(id) });
  } catch (err) {
    console.error('POST /submissions/:id/supplementary :', err.message);
    res.status(500).json({ message: err.message || 'Server error' });
  }
});

// Retirer un document de la liste publique (si c'est un fichier déposé par l'éditeur, il est aussi supprimé du stockage ;
// un fichier de l'auteur reste, lui, intact).
router.delete('/:id/supplementary/:fileId', verifyToken, requireRole('admin'), editorialLock(), async (req, res) => {
  try {
    const { id, fileId } = req.params;
    const blocked = await supplementaryGate(id);
    if (blocked) return res.status(blocked.status).json({ message: blocked.message });

    const removed = await pool.query(
      'DELETE FROM published_files WHERE id = $1 AND submission_id = $2 RETURNING file_url, uploaded_by_editor',
      [fileId, id]
    );
    if (removed.rows.length === 0) return res.status(404).json({ message: 'Supplementary file not found' });
    if (removed.rows[0].uploaded_by_editor) await removeStoredSupplementary(removed.rows[0].file_url);

    res.json({ message: 'Supplementary file removed', published_files: await listPublishedFiles(id) });
  } catch (err) {
    console.error('DELETE /submissions/:id/supplementary/:fileId :', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// ────────────────────────────────────────────────────────────
// POST /api/submissions/:id/withdraw  — Retirer sa soumission
//   Remarque 17 (client) : l'auteur ne supprime plus, il "Withdraw".
//   La soumission reste en base avec le statut 'withdrawn'.
//   Impossible après acceptation / publication.
// ────────────────────────────────────────────────────────────
router.post('/:id/withdraw', verifyToken, async (req, res) => {
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
    }, { exceptUserId: req.user.id });
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
router.post('/:id/messages', verifyToken, requireRole('admin'), editorialLock(), async (req, res) => {
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
  limits: { fileSize: MAX_UPLOAD_BYTES, files: 8, fields: 10 },   // limite unique (plafond Cloudinary gratuit)
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

// Erreurs d'upload renvoyées lisibles (le gestionnaire global les masquerait en production)
const handleRevisionUpload = wrapUpload(revisionUpload);

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

    // Upload d'abord (I/O reseau, pas annulable, reste hors transaction)
    const uploadedFiles = [];
    for (const { slot, file } of queue) {
      const url = await uploadRevisionFile(file, id);
      uploadedFiles.push({ slot, file, url });
    }

    // Puis ecriture DB atomique : meme faille que pour la creation de
    // soumission — un fichier du round qui ne s'enregistre pas ne doit pas
    // laisser certains fichiers en base et d'autres non, ni faire passer le
    // statut de la soumission a 'revised' sur un round incomplet.
    const dbClient = await pool.connect();
    const saved = [];
    let updated;
    try {
      await dbClient.query('BEGIN');

      for (const [i, { slot, file, url }] of uploadedFiles.entries()) {
        await dbClient.query(
          `INSERT INTO submission_files
             (submission_id, file_url, file_type, original_name, file_size, sort_order, description, revision_round)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [id, url, slot.label, file.originalname.slice(0, 300), file.size, i, `Revised version ${round}`, round]
        );
        saved.push({ slot, url, name: file.originalname });
      }

      const cleanUrl = saved.find(s => s.slot.field === 'revised_clean').url;
      updated = await dbClient.query(
        `UPDATE submissions
            SET status = 'revised', pdf_url = $1, revision_count = $2,
                revised_at = NOW(), updated_at = NOW()
          WHERE id = $3
          RETURNING id, status, revision_count, revised_at, pdf_url`,
        [cleanUrl, round, id]
      );

      await dbClient.query('COMMIT');
    } catch (txErr) {
      await dbClient.query('ROLLBACK').catch(() => {});
      console.error('POST /submissions/:id/revision transaction failed, rolled back:', txErr.message);
      return res.status(500).json({ message: 'Could not save the revised version. Please try again — no partial record was kept.' });
    } finally {
      dbClient.release();
    }

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
        // Remarque 3 (23/09) : pas de "(revision N)" pour un simple renvoi de
        // format avant évaluation — sub.status est le statut AVANT ce dépôt.
        formatFix: sub.status === 'sent_back',
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
    }, { exceptUserId: req.user.id });

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
router.delete('/:id', verifyToken, editorialLock(), async (req, res) => {
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
