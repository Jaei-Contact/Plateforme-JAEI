const express = require('express');
const router  = express.Router();
const pool    = require('../db/connection');
const { verifyToken } = require('../middleware/auth');
const { ipnLimiter } = require('../middleware/rateLimiter');
const { sendEmail, EMAIL_TEMPLATES } = require('../services/emailService');
const { createInvoice, INVOICES_DIR } = require('../services/invoiceService');
const path = require('path');

const CLOUDINARY_CONFIGURED =
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET;
const { privateDownloadUrl } = CLOUDINARY_CONFIGURED
  ? require('../services/cloudinaryService')
  : { privateDownloadUrl: null };

// ============================================================
// JAEI — Routes Paiements (CinetPay + Stripe)
// CinetPay doc : https://docs.cinetpay.com
//   Variables requises : CINETPAY_API_KEY, CINETPAY_SITE_ID
// Stripe doc   : https://docs.stripe.com/checkout/quickstart
//   Variables requises : STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET
//   Le compte Stripe doit être ouvert depuis un pays supporté (le
//   Cameroun ne l'est pas) — voir l'explication fournie au client.
//   Webhook monté en raw body dans server.js, AVANT express.json().
// ============================================================

const stripeClient = process.env.STRIPE_SECRET_KEY
  ? require('stripe')(process.env.STRIPE_SECRET_KEY)
  : null;

const SUBMISSION_FEE_XAF = parseInt(process.env.SUBMISSION_FEE_XAF) || 100000;

const requireRole = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ message: 'Access denied — insufficient role' });
  }
  next();
};

const cinetpayAvailable = () => !!(process.env.CINETPAY_API_KEY && process.env.CINETPAY_SITE_ID);
const stripeAvailable   = () => !!stripeClient;

// Mode dev = aucun prestataire de paiement configuré
const isDevMode = () => !cinetpayAvailable() && !stripeAvailable();

// Effets de bord d'un paiement complété : emails (auteur + admin) + facture PDF.
// Non bloquant — à appeler sans await depuis les webhooks (CinetPay/Stripe
// doivent recevoir une réponse rapide). Admin email : ADMIN_EMAIL si défini,
// sinon SMTP_FROM (contact@jaei-journal.org).
const sendPaymentEmails = async (submissionId, amount, paymentId = null) => {
  try {
    const r = await pool.query(
      `SELECT s.title, u.email, u.first_name, u.last_name
         FROM submissions s JOIN users u ON u.id = s.author_id
        WHERE s.id = $1`,
      [submissionId]
    );
    if (r.rows.length === 0) return;
    const { title, email, first_name, last_name } = r.rows[0];
    const authorName = `${first_name || ''} ${last_name || ''}`.trim() || email;

    sendEmail({ to: email, ...EMAIL_TEMPLATES.paymentConfirmedAuthor({ authorName, articleTitle: title, amount }) })
      .catch(e => console.error('⚠️  Payment email (author) failed:', e.message));

    const adminTo = process.env.ADMIN_EMAIL || process.env.SMTP_FROM;
    if (adminTo) {
      sendEmail({ to: adminTo, ...EMAIL_TEMPLATES.paymentReceivedAdmin({ authorName, articleTitle: title, amount }) })
        .catch(e => console.error('⚠️  Payment email (admin) failed:', e.message));
    }

    createInvoice({
      paymentId,
      submissionId,
      amount,
      currency: 'XAF',
      payerName: authorName,
      payerEmail: email,
      description: `Article Processing Charge — ${title}`,
    }).catch(e => console.error('⚠️  Invoice generation failed:', e.message));
  } catch (e) {
    console.error('⚠️  sendPaymentEmails error:', e.message);
  }
};

// ============================================================
// GET /api/payments/config
// ============================================================
// Taux de conversion FICHÉS EN DUR pour affichage seulement (pas de facturation
// dans ces devises) — Commentaire 2, tâche "Convertir les devises". À mettre à
// jour manuellement via ces variables d'env ; pas d'appel API de change externe
// pour éviter une dépendance de plus non configurée.
const FX_RATES_FROM_XAF = {
  CAD: parseFloat(process.env.FX_RATE_XAF_TO_CAD) || null,
  USD: parseFloat(process.env.FX_RATE_XAF_TO_USD) || null,
  EUR: parseFloat(process.env.FX_RATE_XAF_TO_EUR) || null,
};

router.get('/config', (req, res) => {
  const displayAmounts = {};
  for (const [ccy, rate] of Object.entries(FX_RATES_FROM_XAF)) {
    if (rate) displayAmounts[ccy] = Math.round(SUBMISSION_FEE_XAF * rate * 100) / 100;
  }
  res.json({
    devMode:           isDevMode(),
    available:         !isDevMode(),
    cinetpayAvailable: cinetpayAvailable(),
    stripeAvailable:   stripeAvailable(),
    fee:               SUBMISSION_FEE_XAF,
    currency:          'XAF',
    currencyLabel:     'FCFA',
    displayAmounts,    // ex. { USD: 165.32 } — approximatif, taux fixé manuellement
  });
});

// ============================================================
// POST /api/payments/dev-confirm
// Simulation de paiement en mode développement
// ============================================================
router.post('/dev-confirm', verifyToken, requireRole('author'), async (req, res) => {
  try {
    if (!isDevMode()) {
      return res.status(403).json({ message: 'Dev simulation disabled in production' });
    }
    const { submission_id } = req.body;
    if (!submission_id) return res.status(400).json({ message: 'submission_id is required' });

    const sid = parseInt(submission_id, 10);
    const uid = parseInt(req.user.id, 10);
    if (isNaN(sid) || isNaN(uid)) return res.status(400).json({ message: 'Invalid submission_id or user id' });

    const check = await pool.query(
      'SELECT id, status FROM submissions WHERE id = $1 AND author_id = $2',
      [sid, uid]
    );
    if (check.rows.length === 0) {
      return res.status(404).json({ message: 'Submission not found or access denied' });
    }

    await pool.query(
      `UPDATE submissions SET status = 'submitted', updated_at = NOW() WHERE id = $1`,
      [sid]
    );
    console.log(`🧪 [DEV] Paiement simulé — soumission #${sid} par user #${uid}`);
    sendPaymentEmails(sid, SUBMISSION_FEE_XAF);
    res.json({ message: 'Dev payment confirmed' });
  } catch (err) {
    console.error('POST /payments/dev-confirm ERROR:', err.message, err.stack);
    res.status(500).json({ message: `Server error during simulation: ${err.message}` });
  }
});

// ============================================================
// POST /api/payments/initiate
// Initier un paiement CinetPay — retourne une payment_url
// Body: { submission_id }
// ============================================================
router.post('/initiate', verifyToken, requireRole('author'), async (req, res) => {
  try {
    if (isDevMode()) {
      return res.status(503).json({ message: 'CinetPay not configured. Use dev-confirm.' });
    }

    const { submission_id } = req.body;
    if (!submission_id) return res.status(400).json({ message: 'submission_id is required' });

    // Vérifier que la soumission appartient à l'auteur
    const subResult = await pool.query(
      'SELECT id, title FROM submissions WHERE id = $1 AND author_id = $2',
      [submission_id, req.user.id]
    );
    if (subResult.rows.length === 0) {
      return res.status(404).json({ message: 'Submission not found or access denied' });
    }

    // Vérifier s'il existe déjà un paiement pour cette soumission
    const existing = await pool.query(
      `SELECT id, status, transaction_id FROM payments
       WHERE submission_id = $1 AND payment_method = 'cinetpay'
       ORDER BY created_at DESC LIMIT 1`,
      [submission_id]
    );

    let transactionId = `JAEI_${submission_id}_${Date.now()}`;

    if (existing.rows.length > 0) {
      const pay = existing.rows[0];

      // Déjà payé → refus idempotent
      if (pay.status === 'completed') {
        return res.status(409).json({ message: 'This submission has already been paid' });
      }

      // Paiement en cours → renvoyer le même transaction_id (IPN ne sera pas perdu)
      if (pay.status === 'pending') {
        return res.status(409).json({
          message: 'A payment is already in progress for this submission',
          transaction_id: pay.transaction_id,
        });
      }

      // Paiement échoué (status='failed') → réutiliser la ligne avec un nouveau transaction_id
      // (INSERT serait bloqué par la contrainte UNIQUE payments_submission_method_unique)
      await pool.query(
        `UPDATE payments
           SET transaction_id = $1, status = 'pending', amount = $2, updated_at = NOW()
         WHERE id = $3`,
        [transactionId, SUBMISSION_FEE_XAF, pay.id]
      );
    } else {
      // Aucun paiement existant → créer un nouveau enregistrement
      await pool.query(
        `INSERT INTO payments (submission_id, user_id, amount, currency, payment_method, status, transaction_id, created_at)
         VALUES ($1, $2, $3, 'XAF', 'cinetpay', 'pending', $4, NOW())`,
        [submission_id, req.user.id, SUBMISSION_FEE_XAF, transactionId]
      );
    }

    // Appel API CinetPay
    const payload = {
      apikey:         process.env.CINETPAY_API_KEY,
      site_id:        process.env.CINETPAY_SITE_ID,
      transaction_id: transactionId,
      amount:         SUBMISSION_FEE_XAF,
      currency:       'XAF',
      description:    `JAEI — Frais de soumission : ${subResult.rows[0].title.substring(0, 100)}`,
      notify_url:     process.env.CINETPAY_NOTIFY_URL,
      return_url:     `${process.env.FRONTEND_URL}/payment/return?transaction_id=${transactionId}`,
      channels:       'ALL',   // Carte + OM + MoMo
      metadata:       JSON.stringify({ submission_id, author_id: req.user.id }),
    };

    const response = await fetch('https://api-checkout.cinetpay.com/v2/payment', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
    });
    const data = await response.json();

    if (data.code !== '201') {
      console.error('CinetPay /initiate error:', data);
      return res.status(502).json({ message: data.message || 'CinetPay error — please try again' });
    }

    res.json({
      payment_url:    data.data.payment_url,
      transaction_id: transactionId,
    });
  } catch (err) {
    console.error('POST /payments/initiate:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// ============================================================
// POST /api/payments/notify
// IPN (Instant Payment Notification) — appelé par CinetPay
// ⚠️  Pas de verifyToken — appelé par les serveurs CinetPay
// ⚠️  URL à enregistrer dans le dashboard CinetPay
// ============================================================
router.post('/notify', ipnLimiter, async (req, res) => {
  try {
    const { cpm_trans_id } = req.body;
    if (!cpm_trans_id) return res.status(400).send('Missing cpm_trans_id');

    // Vérifier le paiement auprès de CinetPay
    const checkResponse = await fetch('https://api-checkout.cinetpay.com/v2/payment/check', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        apikey:         process.env.CINETPAY_API_KEY,
        site_id:        process.env.CINETPAY_SITE_ID,
        transaction_id: cpm_trans_id,
      }),
    });
    const checkData = await checkResponse.json();

    const status = checkData.data?.status;

    if (checkData.code === '00' && status === 'ACCEPTED') {
      await pool.query(
        `UPDATE payments SET status = 'completed', paid_at = NOW(), updated_at = NOW()
         WHERE transaction_id = $1`,
        [cpm_trans_id]
      );
      const payRow = await pool.query(
        `SELECT id, submission_id FROM payments WHERE transaction_id = $1`,
        [cpm_trans_id]
      );
      if (payRow.rows.length > 0) {
        const { id: paymentId, submission_id } = payRow.rows[0];
        await pool.query(
          `UPDATE submissions SET status = 'submitted', updated_at = NOW()
           WHERE id = $1 AND status = 'pending'`,
          [submission_id]
        );
        console.log(`✅ CinetPay IPN — paiement accepté, soumission #${submission_id}`);
        sendPaymentEmails(submission_id, SUBMISSION_FEE_XAF, paymentId);
      }
    } else if (['REFUSED', 'CANCELLED'].includes(status)) {
      await pool.query(
        `UPDATE payments SET status = 'failed', updated_at = NOW() WHERE transaction_id = $1`,
        [cpm_trans_id]
      );
      console.log(`❌ CinetPay IPN — paiement ${status} (${cpm_trans_id})`);
    }

    res.status(200).send('OK');
  } catch (err) {
    console.error('POST /payments/notify:', err.message);
    res.status(500).send('Error');
  }
});

// ============================================================
// POST /api/payments/stripe/create-checkout-session
// Crée une Stripe Checkout Session — retourne une checkout_url
// Body: { submission_id }
// ============================================================
router.post('/stripe/create-checkout-session', verifyToken, requireRole('author'), async (req, res) => {
  try {
    if (!stripeAvailable()) {
      return res.status(503).json({ message: 'Stripe not configured. Use dev-confirm.' });
    }

    const { submission_id } = req.body;
    if (!submission_id) return res.status(400).json({ message: 'submission_id is required' });

    const subResult = await pool.query(
      'SELECT id, title FROM submissions WHERE id = $1 AND author_id = $2',
      [submission_id, req.user.id]
    );
    if (subResult.rows.length === 0) {
      return res.status(404).json({ message: 'Submission not found or access denied' });
    }

    const existing = await pool.query(
      `SELECT id, status, transaction_id FROM payments
       WHERE submission_id = $1 AND payment_method = 'stripe'
       ORDER BY created_at DESC LIMIT 1`,
      [submission_id]
    );

    let transactionId = `JAEI_${submission_id}_${Date.now()}`;

    if (existing.rows.length > 0) {
      const pay = existing.rows[0];
      if (pay.status === 'completed') {
        return res.status(409).json({ message: 'This submission has already been paid' });
      }
      if (pay.status === 'pending') {
        // Paiement CinetPay en cours autorisé à reprendre avec le même transaction_id ;
        // pour Stripe on relance simplement une nouvelle session (les anciennes expirent seules côté Stripe).
        transactionId = pay.transaction_id;
      }
    }

    const session = await stripeClient.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'xaf', // devise zéro-décimale supportée par Stripe — montant transmis tel quel
          product_data: { name: `JAEI — Frais de soumission : ${subResult.rows[0].title.substring(0, 100)}` },
          unit_amount: SUBMISSION_FEE_XAF,
        },
        quantity: 1,
      }],
      success_url: `${process.env.FRONTEND_URL}/payment/return?transaction_id=${transactionId}`,
      cancel_url:  `${process.env.FRONTEND_URL}/author/submissions/${submission_id}/payment`,
      client_reference_id: transactionId,
      metadata: { submission_id: String(submission_id), author_id: String(req.user.id), transaction_id: transactionId },
    });

    if (existing.rows.length > 0) {
      await pool.query(
        `UPDATE payments SET transaction_id = $1, status = 'pending', amount = $2, updated_at = NOW()
         WHERE id = $3`,
        [transactionId, SUBMISSION_FEE_XAF, existing.rows[0].id]
      );
    } else {
      await pool.query(
        `INSERT INTO payments (submission_id, user_id, amount, currency, payment_method, status, transaction_id, created_at)
         VALUES ($1, $2, $3, 'XAF', 'stripe', 'pending', $4, NOW())`,
        [submission_id, req.user.id, SUBMISSION_FEE_XAF, transactionId]
      );
    }

    res.json({ checkout_url: session.url, transaction_id: transactionId });
  } catch (err) {
    console.error('POST /payments/stripe/create-checkout-session:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// ============================================================
// POST /api/payments/stripe/webhook
// Appelé par Stripe (checkout.session.completed, etc.)
// ⚠️  Pas de verifyToken — monté en express.raw() dans server.js,
//     la signature est vérifiée via STRIPE_WEBHOOK_SECRET.
// ============================================================
router.post('/stripe/webhook', async (req, res) => {
  if (!stripeAvailable()) return res.status(503).send('Stripe not configured');

  let event;
  try {
    const sig = req.headers['stripe-signature'];
    event = stripeClient.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('⚠️  Stripe webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const transactionId = session.client_reference_id || session.metadata?.transaction_id;
      if (!transactionId) return res.status(200).send('OK (no transaction_id)');

      await pool.query(
        `UPDATE payments SET status = 'completed', paid_at = NOW(), updated_at = NOW(),
                stripe_payment_intent_id = $1
         WHERE transaction_id = $2`,
        [session.payment_intent || null, transactionId]
      );
      const payRow = await pool.query(
        `SELECT id, submission_id FROM payments WHERE transaction_id = $1`,
        [transactionId]
      );
      if (payRow.rows.length > 0) {
        const { id: paymentId, submission_id } = payRow.rows[0];
        await pool.query(
          `UPDATE submissions SET status = 'submitted', updated_at = NOW()
           WHERE id = $1 AND status = 'pending'`,
          [submission_id]
        );
        console.log(`✅ Stripe webhook — paiement complété, soumission #${submission_id}`);
        sendPaymentEmails(submission_id, SUBMISSION_FEE_XAF, paymentId);
      }
    } else if (event.type === 'checkout.session.expired') {
      const session = event.data.object;
      const transactionId = session.client_reference_id || session.metadata?.transaction_id;
      if (transactionId) {
        await pool.query(
          `UPDATE payments SET status = 'failed', updated_at = NOW() WHERE transaction_id = $1`,
          [transactionId]
        );
      }
    }
    res.status(200).send('OK');
  } catch (err) {
    console.error('POST /payments/stripe/webhook:', err.message);
    res.status(500).send('Error');
  }
});

// ============================================================
// POST /api/payments/:id/refund
// Rembourse un paiement (Commentaire 2 du client, tâche "Rembourser").
// Admin uniquement. Stripe seulement pour l'instant — CinetPay n'expose
// pas d'API de remboursement en libre-service dans sa doc standard ;
// à vérifier auprès d'eux le moment venu (support/back-office CinetPay).
// Body: { amount?, reason? } — amount omis = remboursement total.
// ============================================================
router.post('/:id/refund', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, reason } = req.body;

    const payRes = await pool.query('SELECT * FROM payments WHERE id = $1', [id]);
    if (payRes.rows.length === 0) return res.status(404).json({ message: 'Payment not found' });
    const payment = payRes.rows[0];

    if (payment.status !== 'completed') {
      return res.status(409).json({ message: `Cannot refund a payment with status '${payment.status}'` });
    }
    if (payment.refunded_at) {
      return res.status(409).json({ message: 'This payment was already refunded' });
    }

    if (payment.payment_method === 'stripe') {
      if (!stripeAvailable()) return res.status(503).json({ message: 'Stripe not configured' });
      if (!payment.stripe_payment_intent_id) {
        return res.status(422).json({ message: 'No Stripe payment_intent recorded for this payment' });
      }
      const refund = await stripeClient.refunds.create({
        payment_intent: payment.stripe_payment_intent_id,
        ...(amount ? { amount: Math.round(Number(amount)) } : {}),
      });
      await pool.query(
        `UPDATE payments SET refunded_amount = $1, refunded_at = NOW(), refund_reason = $2,
                stripe_refund_id = $3, status = 'refunded', updated_at = NOW()
         WHERE id = $4`,
        [amount || payment.amount, reason || null, refund.id, id]
      );
      return res.json({ message: 'Refund initiated', refund_id: refund.id });
    }

    return res.status(501).json({
      message: `Refunds are not implemented for payment method '${payment.payment_method}'. Handle manually via the provider's back office and record it there.`,
    });
  } catch (err) {
    console.error('POST /payments/:id/refund:', err.message);
    res.status(500).json({ message: err.message || 'Server error' });
  }
});

// ============================================================
// GET /api/payments/invoices/:id/download
// Téléchargement d'une facture (auteur propriétaire ou admin).
// ============================================================
router.get('/invoices/:id/download', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT i.*, p.user_id AS payment_user_id
       FROM invoices i LEFT JOIN payments p ON p.id = i.payment_id
       WHERE i.id = $1`,
      [id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Invoice not found' });
    const invoice = result.rows[0];

    const isOwner = invoice.payment_user_id === req.user.id;
    if (req.user.role !== 'admin' && !isOwner) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (CLOUDINARY_CONFIGURED) {
      const signedUrl = privateDownloadUrl(invoice.pdf_url);
      if (signedUrl) return res.redirect(signedUrl);
      return res.redirect(invoice.pdf_url); // URL non reconnue par privateDownloadUrl — tentative directe
    }
    // Dev/local : pas de mount statique public pour /uploads/invoices (la facture
    // contient nom/email/montant) — on stream le fichier après le contrôle d'accès ci-dessus.
    return res.sendFile(path.join(INVOICES_DIR, `${invoice.invoice_number}.pdf`));
  } catch (err) {
    console.error('GET /payments/invoices/:id/download:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// ============================================================
// GET /api/payments/reconciliation
// Rapport transactions vs factures (Commentaire 2, tâche "Concilier").
// Admin uniquement.
// ============================================================
router.get('/reconciliation', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT p.id AS payment_id, p.transaction_id, p.amount AS payment_amount, p.currency,
              p.payment_method, p.status AS payment_status, p.paid_at, p.refunded_at,
              i.id AS invoice_id, i.invoice_number, i.amount AS invoice_amount,
              s.title AS article_title
       FROM payments p
       LEFT JOIN invoices i ON i.payment_id = p.id
       LEFT JOIN submissions s ON s.id = p.submission_id
       ORDER BY p.created_at DESC`
    );
    const rows = result.rows;
    const mismatches = rows.filter(r =>
      (r.payment_status === 'completed' && !r.invoice_id) ||
      (r.invoice_id && Number(r.payment_amount) !== Number(r.invoice_amount))
    );
    res.json({ rows, mismatches, totalPayments: rows.length, totalMismatches: mismatches.length });
  } catch (err) {
    console.error('GET /payments/reconciliation:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// ============================================================
// GET /api/payments/verify/:transactionId
// Vérification manuelle du statut (appelé par le frontend
// après retour depuis CinetPay ou Stripe)
// ============================================================
router.get('/verify/:transactionId', verifyToken, async (req, res) => {
  try {
    const { transactionId } = req.params;
    const result = await pool.query(
      `SELECT p.status, p.paid_at, p.amount, p.submission_id,
              s.status AS submission_status,
              i.id AS invoice_id, i.invoice_number
       FROM payments p
       JOIN submissions s ON s.id = p.submission_id
       LEFT JOIN invoices i ON i.payment_id = p.id
       WHERE p.transaction_id = $1 AND p.user_id = $2`,
      [transactionId, req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Transaction not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('GET /payments/verify:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// ============================================================
// GET /api/payments/my-payments
// Historique des paiements de l'auteur connecté
// ============================================================
router.get('/my-payments', verifyToken, requireRole('author'), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT p.id, p.amount, p.currency, p.payment_method, p.status, p.paid_at, p.created_at,
              s.title AS article_title, s.status AS submission_status,
              i.id AS invoice_id, i.invoice_number
       FROM payments p
       JOIN submissions s ON s.id = p.submission_id
       LEFT JOIN invoices i ON i.payment_id = p.id
       WHERE p.user_id = $1
       ORDER BY p.created_at DESC`,
      [req.user.id]
    );
    res.json({ payments: result.rows });
  } catch (err) {
    console.error('GET /payments/my-payments:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// ============================================================
// GET /api/payments (admin)
// Liste tous les paiements
// ============================================================
router.get('/', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT p.id, p.amount, p.currency, p.payment_method, p.status, p.paid_at, p.created_at,
              p.refunded_amount, p.refunded_at,
              s.title AS article_title,
              u.first_name || ' ' || u.last_name AS author_name, u.email AS author_email,
              i.id AS invoice_id, i.invoice_number
       FROM payments p
       JOIN submissions s ON s.id = p.submission_id
       JOIN users u ON u.id = p.user_id
       LEFT JOIN invoices i ON i.payment_id = p.id
       ORDER BY p.created_at DESC`
    );
    res.json({ payments: result.rows });
  } catch (err) {
    console.error('GET /payments (admin):', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
