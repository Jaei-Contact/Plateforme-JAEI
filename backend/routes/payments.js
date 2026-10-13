const express = require('express');
const router  = express.Router();
const pool    = require('../db/connection');
const { verifyToken } = require('../middleware/auth');
const { INVOICES_DIR } = require('../services/invoiceService');
const { recordApcPayment } = require('../services/apcService');
const { toMinorUnits, fromMinorUnits, priceList, priceLine } = require('../config/fees');
const { getApcAmountUsd } = require('../services/settingsService');
const path = require('path');
const https = require('https');

const CLOUDINARY_CONFIGURED =
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET;
const { privateDownloadUrl } = CLOUDINARY_CONFIGURED
  ? require('../services/cloudinaryService')
  : { privateDownloadUrl: null };

// ============================================================
// JAEI — Routes Paiements (Stripe)
// Doc : https://docs.stripe.com/checkout/quickstart
//   Variables requises : STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET
//   Webhook monté en raw body dans server.js, AVANT express.json().
//   CinetPay a été retiré (choix client : Stripe uniquement).
//
//   Ce qui est payé : l'APC (Article Processing Charge), due APRÈS l'acceptation
//   de l'article (remarque 16 du client). L'admin peut aussi marquer l'APC
//   comme payée (PATCH /api/submissions/:id/apc) ;
//   les deux passent par services/apcService.js (indicateur apc_paid, facture PDF,
//   email avec facture jointe).
// ============================================================

const stripeClient = process.env.STRIPE_SECRET_KEY
  ? require('stripe')(process.env.STRIPE_SECRET_KEY)
  : null;

const requireRole = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ message: 'Access denied — insufficient role' });
  }
  next();
};

const stripeAvailable = () => !!stripeClient;

// ============================================================
// GET /api/payments/config
// ============================================================
// Le débit se fait en USD. Montant = celui saisi par l'admin (Settings → APC), sinon 200 USD
// (valeur du code) ; les équivalents sont indicatifs (config/fees.js).
router.get('/config', async (req, res) => {
  const amount = await getApcAmountUsd();
  res.json({
    available:       stripeAvailable(),   // le paiement par carte est-il activé ?
    stripeAvailable: stripeAvailable(),
    fee:             amount,              // montant effectivement débité, en USD
    currency:        'USD',
    currencyLabel:   'USD',
    prices:          priceList(amount),   // { USD, EUR, FCFA, RMB }
    priceLine:       priceLine(amount),   // « $200 USD · 172 € · 111 000 FCFA · ¥1 440 RMB »
  });
});

// ============================================================
// POST /api/payments/stripe/create-checkout-session
// Crée une Stripe Checkout Session — retourne une checkout_url
// Body: { submission_id }
// Réservé à l'auteur d'un article ACCEPTÉ dont l'APC n'est pas encore réglée.
// ============================================================
router.post('/stripe/create-checkout-session', verifyToken, requireRole('author'), async (req, res) => {
  try {
    if (!stripeAvailable()) {
      return res.status(503).json({ message: 'Card payment is not available yet.' });
    }

    const { submission_id } = req.body;
    if (!submission_id) return res.status(400).json({ message: 'submission_id is required' });

    const subResult = await pool.query(
      'SELECT id, title, manuscript_number, status, apc_paid FROM submissions WHERE id = $1 AND author_id = $2',
      [submission_id, req.user.id]
    );
    if (subResult.rows.length === 0) {
      return res.status(404).json({ message: 'Submission not found or access denied' });
    }
    const sub = subResult.rows[0];
    if (sub.apc_paid) {
      return res.status(409).json({ message: 'The Article Processing Charge has already been paid for this article.' });
    }
    if (sub.status !== 'accepted') {
      return res.status(409).json({ message: 'The Article Processing Charge is due once your article has been accepted.' });
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
        return res.status(409).json({ message: 'This article has already been paid.' });
      }
      if (pay.status === 'pending') {
        // Paiement en cours : on relance simplement une nouvelle session avec le
        // même transaction_id (les anciennes sessions Stripe expirent seules).
        transactionId = pay.transaction_id;
      }
    }

    // Montant du jour (admin ou défaut du code), lu une seule fois pour la session Stripe ET la ligne payments
    const amount = await getApcAmountUsd({ strict: true });   // base illisible → erreur plutôt qu'un débit sur un montant incertain
    const label = sub.manuscript_number ? `${sub.manuscript_number} — ${sub.title}` : sub.title;
    const session = await stripeClient.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd', // débit réel en dollars US
          product_data: { name: `JAEI — Article Processing Charge (APC): ${label.substring(0, 100)}` },
          unit_amount: toMinorUnits(amount, 'usd'), // en cents
        },
        quantity: 1,
      }],
      // Débit en USD, jamais converti par Stripe : on coupe l'« Adaptive Pricing » éventuellement activé dans le Dashboard
      adaptive_pricing: { enabled: false },
      success_url: `${process.env.FRONTEND_URL}/payment/return?transaction_id=${transactionId}`,
      cancel_url:  `${process.env.FRONTEND_URL}/author/submissions/${submission_id}/payment`,
      client_reference_id: transactionId,
      metadata: { submission_id: String(submission_id), author_id: String(req.user.id), transaction_id: transactionId },
    });

    if (existing.rows.length > 0) {
      await pool.query(
        `UPDATE payments SET transaction_id = $1, status = 'pending', amount = $2, currency = 'USD', updated_at = NOW()
         WHERE id = $3`,
        [transactionId, amount, existing.rows[0].id]
      );
    } else {
      await pool.query(
        `INSERT INTO payments (submission_id, user_id, amount, currency, payment_method, status, transaction_id, created_at)
         VALUES ($1, $2, $3, 'USD', 'stripe', 'pending', $4, NOW())`,
        [submission_id, req.user.id, amount, transactionId]
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
      // Carte : payment_status vaut 'paid'. Autre valeur = règlement pas encore encaissé.
      if (session.payment_status && session.payment_status !== 'paid') {
        return res.status(200).send('OK (not paid yet)');
      }

      // Idempotence : seule la PREMIÈRE notification d'un paiement en attente déclenche
      // le marquage de l'APC, la facture et les emails (Stripe rejoue un webhook si la
      // réponse a échoué ; un paiement déjà complété ou remboursé n'est jamais retraité).
      const upd = await pool.query(
        `UPDATE payments SET status = 'completed', paid_at = NOW(), updated_at = NOW(),
                stripe_payment_intent_id = $1
         WHERE transaction_id = $2 AND status IN ('pending', 'failed')
         RETURNING id, submission_id, amount, currency`,
        [session.payment_intent || null, transactionId]
      );
      if (upd.rows.length > 0) {
        let { id: paymentId, submission_id, amount, currency } = upd.rows[0];
        // Ce que Stripe a réellement débité fait foi. Les deux peuvent différer si l'admin a changé le
        // montant de l'APC pendant qu'un auteur payait depuis un ancien onglet : la ligne payments,
        // la facture et les emails doivent alors afficher le montant réellement prélevé.
        if (Number.isInteger(session.amount_total) && session.amount_total > 0 && session.currency) {
          const chargedAmount = fromMinorUnits(session.amount_total, session.currency);
          const chargedCurrency = String(session.currency).toUpperCase();
          if (chargedCurrency !== String(currency).toUpperCase() || Math.abs(chargedAmount - Number(amount)) > 0.005) {
            console.warn(`⚠️  Stripe webhook — montant débité (${chargedAmount} ${chargedCurrency}) différent de la ligne payments #${paymentId} (${amount} ${currency}) : alignement sur Stripe`);
            amount = chargedAmount; currency = chargedCurrency;
            try {
              await pool.query('UPDATE payments SET amount = $1, currency = $2 WHERE id = $3', [amount, currency, paymentId]);
            } catch (e) {
              console.error('Alignement du paiement sur le montant Stripe :', e.message);   // la suite (apc_paid, facture) doit continuer
            }
          }
        }
        // Le règlement par carte vaut paiement de l'APC : la publication est débloquée
        await pool.query(
          `UPDATE submissions SET apc_paid = TRUE, apc_paid_at = COALESCE(apc_paid_at, NOW()), updated_at = NOW()
           WHERE id = $1`,
          [submission_id]
        );
        console.log(`✅ Stripe webhook — APC payée, soumission #${submission_id}`);
        // Facture PDF + email à l'auteur (facture jointe) + alerte administration.
        // Sans await : Stripe doit recevoir une réponse rapide ; ne lève jamais d'exception.
        recordApcPayment({ submissionId: submission_id, method: 'stripe', paymentId, amount: Number(amount), currency, paymentIntentId: session.payment_intent || null });
      }
    } else if (event.type === 'checkout.session.expired') {
      const session = event.data.object;
      const transactionId = session.client_reference_id || session.metadata?.transaction_id;
      if (transactionId) {
        await pool.query(
          `UPDATE payments SET status = 'failed', updated_at = NOW()
           WHERE transaction_id = $1 AND status = 'pending'`,
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
// Admin uniquement, Stripe uniquement (seul prestataire en place).
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
        ...(amount ? { amount: toMinorUnits(amount, payment.currency) } : {}),   // cents pour l'USD
      });
      await pool.query(
        `UPDATE payments SET refunded_amount = $1, refunded_at = NOW(), refund_reason = $2,
                stripe_refund_id = $3, status = 'refunded', updated_at = NOW()
         WHERE id = $4`,
        [amount || payment.amount, reason || null, refund.id, id]
      );
      // Remboursement TOTAL : l'APC n'est plus réglée → la publication est de nouveau
      // bloquée (sauf si l'article est déjà publié : on ne le dépublie pas).
      const fullRefund = !amount || Number(amount) >= Number(payment.amount);
      if (fullRefund && payment.submission_id) {
        await pool.query(
          `UPDATE submissions SET apc_paid = FALSE, apc_paid_at = NULL, updated_at = NOW()
           WHERE id = $1 AND status <> 'published'`,
          [payment.submission_id]
        );
      }
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
      `SELECT i.*, p.user_id AS payment_user_id, s.author_id AS submission_author_id
       FROM invoices i
       LEFT JOIN payments    p ON p.id = i.payment_id
       LEFT JOIN submissions s ON s.id = i.submission_id
       WHERE i.id = $1`,
      [id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Invoice not found' });
    const invoice = result.rows[0];

    // Propriétaire : l'auteur du paiement, ou l'auteur de l'article si la ligne payments a disparu
    const isOwner = invoice.payment_user_id === req.user.id || invoice.submission_author_id === req.user.id;
    if (req.user.role !== 'admin' && !isOwner) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const filename = `${invoice.invoice_number}.pdf`;

    if (CLOUDINARY_CONFIGURED) {
      // Le PDF est relayé par notre API plutôt que par une redirection vers Cloudinary : le
      // frontend le télécharge en XHR authentifié, et une redirection vers un autre domaine
      // y serait bloquée (CORS). Le compte Cloudinary gratuit refusant la diffusion publique
      // des PDF, on passe par l'URL de téléchargement signée.
      const signedUrl = privateDownloadUrl(invoice.pdf_url) || invoice.pdf_url;
      return https.get(signedUrl, (up) => {
        if (up.statusCode !== 200) {
          up.resume();
          console.error(`GET /payments/invoices/:id/download : upstream ${up.statusCode} ${up.headers['x-cld-error'] || ''}`);
          return res.status(502).json({ message: 'Invoice file temporarily unavailable' });
        }
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        if (up.headers['content-length']) res.setHeader('Content-Length', up.headers['content-length']);
        up.pipe(res);
      }).on('error', (e) => {
        console.error('GET /payments/invoices/:id/download :', e.message);
        if (!res.headersSent) res.status(502).json({ message: 'Invoice file temporarily unavailable' });
      });
    }
    // Dev/local : pas de mount statique public pour /uploads/invoices (la facture
    // contient nom/email/montant) — on stream le fichier après le contrôle d'accès ci-dessus.
    return res.sendFile(path.join(INVOICES_DIR, filename));
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
// après retour depuis Stripe)
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
