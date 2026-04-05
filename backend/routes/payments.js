const express = require('express');
const router = express.Router();
const pool = require('../db/connection');
const { verifyToken } = require('../middleware/auth');

// ============================================================
// JAEI — Routes Paiements (Stripe)
// ⚠️  Nécessite : STRIPE_SECRET_KEY dans .env
// Installation : npm install stripe  (dans /backend)
// ============================================================

// Stripe est chargé dynamiquement pour éviter un crash si la clé est absente
const getStripe = () => {
  if (!process.env.STRIPE_SECRET_KEY) {
    return null;
  }
  return require('stripe')(process.env.STRIPE_SECRET_KEY);
};

// Frais de soumission JAEI en FCFA (converti en centimes XOF pour Stripe)
// 1 XOF = 100 centimes (Stripe utilise la plus petite unité)
const SUBMISSION_FEE_XOF = parseInt(process.env.SUBMISSION_FEE_XOF) || 200000; // 200 000 FCFA
const SUBMISSION_FEE_CENTS = SUBMISSION_FEE_XOF * 100;

const requireRole = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ message: 'Accès refusé — rôle insuffisant' });
  }
  next();
};

// ============================================================
// GET /api/payments/config
// Retourne la clé publique Stripe (côté client)
// ============================================================
router.get('/config', (req, res) => {
  if (!process.env.STRIPE_PUBLISHABLE_KEY) {
    return res.json({ available: false, message: 'Paiement Stripe non configuré' });
  }
  res.json({
    available: true,
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
    fee: SUBMISSION_FEE_XOF,
    currency: 'XOF',
    currencyLabel: 'FCFA',
  });
});

// ============================================================
// POST /api/payments/create-intent
// Crée un PaymentIntent Stripe pour une soumission
// Body: { submission_id }
// ============================================================
router.post('/create-intent', verifyToken, requireRole('author'), async (req, res) => {
  try {
    const stripe = getStripe();
    if (!stripe) {
      return res.status(503).json({ message: 'Service de paiement non disponible. Veuillez contacter l\'administration.' });
    }

    const { submission_id } = req.body;
    if (!submission_id) {
      return res.status(400).json({ message: 'submission_id est requis' });
    }

    // Vérifier que la soumission appartient à l'auteur
    const subResult = await pool.query(
      'SELECT id, title, status FROM submissions WHERE id = $1 AND author_id = $2',
      [submission_id, req.user.id]
    );
    if (subResult.rows.length === 0) {
      return res.status(404).json({ message: 'Soumission introuvable ou accès refusé' });
    }

    // Vérifier qu'aucun paiement accepté n'existe déjà
    const existingPayment = await pool.query(
      'SELECT id FROM payments WHERE submission_id = $1 AND status = $2',
      [submission_id, 'completed']
    );
    if (existingPayment.rows.length > 0) {
      return res.status(409).json({ message: 'Cette soumission a déjà été réglée' });
    }

    const submission = subResult.rows[0];

    // Créer le PaymentIntent Stripe
    // Note: XOF est une devise sans décimales (zero-decimal currency)
    // Stripe accepte XOF mais vérifie les contraintes régionales
    const paymentIntent = await stripe.paymentIntents.create({
      amount: SUBMISSION_FEE_XOF, // XOF = zero-decimal, on passe la valeur directement
      currency: 'xof',
      metadata: {
        submission_id: String(submission_id),
        author_id: String(req.user.id),
        article_title: submission.title.substring(0, 200),
        platform: 'JAEI',
      },
      description: `JAEI — Frais de soumission : ${submission.title.substring(0, 100)}`,
    });

    // Enregistrer le paiement en base (statut pending)
    await pool.query(
      `INSERT INTO payments (submission_id, author_id, amount, currency, payment_method, status, stripe_payment_intent_id, created_at)
       VALUES ($1, $2, $3, $4, 'stripe', 'pending', $5, NOW())
       ON CONFLICT (submission_id, payment_method)
       DO UPDATE SET stripe_payment_intent_id = $5, status = 'pending', updated_at = NOW()`,
      [submission_id, req.user.id, SUBMISSION_FEE_XOF, 'XOF', paymentIntent.id]
    );

    res.json({
      clientSecret: paymentIntent.client_secret,
      amount: SUBMISSION_FEE_XOF,
      currency: 'XOF',
      currencyLabel: 'FCFA',
      articleTitle: submission.title,
    });
  } catch (err) {
    console.error('POST /payments/create-intent :', err.message);
    res.status(500).json({ message: 'Erreur lors de la création du paiement' });
  }
});

// ============================================================
// POST /api/payments/webhook
// Webhook Stripe — confirme le paiement côté serveur
// ⚠️  Ce endpoint doit être exempt de verifyToken
// ⚠️  Enregistrer l'URL dans le dashboard Stripe Webhooks
// Events à écouter : payment_intent.succeeded, payment_intent.payment_failed
// ============================================================
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const stripe = getStripe();
  if (!stripe) return res.status(503).send('Stripe non configuré');

  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error('Webhook Stripe — signature invalide :', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const intent = event.data.object;
        const submissionId = intent.metadata?.submission_id;

        if (submissionId) {
          // Marquer le paiement comme complété
          await pool.query(
            `UPDATE payments SET status = 'completed', paid_at = NOW(), updated_at = NOW()
             WHERE stripe_payment_intent_id = $1`,
            [intent.id]
          );
          // Mettre la soumission en statut "submitted" (prête pour évaluation)
          await pool.query(
            `UPDATE submissions SET status = 'submitted', updated_at = NOW()
             WHERE id = $1 AND status = 'pending'`,
            [submissionId]
          );
          console.log(`✅ Paiement Stripe confirmé — soumission #${submissionId}`);
        }
        break;
      }
      case 'payment_intent.payment_failed': {
        const intent = event.data.object;
        await pool.query(
          `UPDATE payments SET status = 'failed', updated_at = NOW()
           WHERE stripe_payment_intent_id = $1`,
          [intent.id]
        );
        console.log(`❌ Paiement Stripe échoué — intent ${intent.id}`);
        break;
      }
    }

    res.json({ received: true });
  } catch (err) {
    console.error('Webhook Stripe — erreur traitement :', err.message);
    res.status(500).json({ message: 'Erreur traitement webhook' });
  }
});

// ============================================================
// POST /api/payments/confirm
// Confirmation côté client après paiement réussi (fallback webhook)
// Body: { payment_intent_id, submission_id }
// ============================================================
router.post('/confirm', verifyToken, requireRole('author'), async (req, res) => {
  try {
    const stripe = getStripe();
    if (!stripe) return res.status(503).json({ message: 'Service non disponible' });

    const { payment_intent_id, submission_id } = req.body;
    if (!payment_intent_id || !submission_id) {
      return res.status(400).json({ message: 'payment_intent_id et submission_id sont requis' });
    }

    // Vérifier le statut réel du paiement auprès de Stripe
    const intent = await stripe.paymentIntents.retrieve(payment_intent_id);
    if (intent.status !== 'succeeded') {
      return res.status(400).json({ message: `Paiement non finalisé (statut : ${intent.status})` });
    }

    // Mettre à jour la base de données
    await pool.query(
      `UPDATE payments SET status = 'completed', paid_at = NOW(), updated_at = NOW()
       WHERE stripe_payment_intent_id = $1 AND author_id = $2`,
      [payment_intent_id, req.user.id]
    );
    await pool.query(
      `UPDATE submissions SET status = 'submitted', updated_at = NOW()
       WHERE id = $1 AND author_id = $2 AND status = 'pending'`,
      [submission_id, req.user.id]
    );

    res.json({ message: 'Paiement confirmé — votre article est en attente d\'évaluation' });
  } catch (err) {
    console.error('POST /payments/confirm :', err.message);
    res.status(500).json({ message: 'Erreur lors de la confirmation du paiement' });
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
              s.title AS article_title, s.status AS submission_status
       FROM payments p
       JOIN submissions s ON s.id = p.submission_id
       WHERE p.author_id = $1
       ORDER BY p.created_at DESC`,
      [req.user.id]
    );
    res.json({ payments: result.rows });
  } catch (err) {
    console.error('GET /payments/my-payments :', err.message);
    res.status(500).json({ message: 'Erreur serveur' });
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
              s.title AS article_title,
              u.first_name || ' ' || u.last_name AS author_name, u.email AS author_email
       FROM payments p
       JOIN submissions s ON s.id = p.submission_id
       JOIN users u ON u.id = p.author_id
       ORDER BY p.created_at DESC`
    );
    res.json({ payments: result.rows });
  } catch (err) {
    console.error('GET /payments (admin) :', err.message);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

module.exports = router;
