const express = require('express');
const router  = express.Router();
const pool    = require('../db/connection');
const { verifyToken } = require('../middleware/auth');

// ============================================================
// JAEI — Routes Paiements (CinetPay)
// Doc API : https://docs.cinetpay.com
// Variables requises : CINETPAY_API_KEY, CINETPAY_SITE_ID
// ============================================================

const SUBMISSION_FEE_XOF = parseInt(process.env.SUBMISSION_FEE_XOF) || 100000;

const requireRole = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ message: 'Access denied — insufficient role' });
  }
  next();
};

// Mode dev = clés CinetPay absentes
const isDevMode = () => !process.env.CINETPAY_API_KEY || !process.env.CINETPAY_SITE_ID;

// ============================================================
// GET /api/payments/config
// ============================================================
router.get('/config', (req, res) => {
  res.json({
    devMode:      isDevMode(),
    available:    !isDevMode(),
    fee:          SUBMISSION_FEE_XOF,
    currency:     'XOF',
    currencyLabel: 'FCFA',
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

    // Vérifier qu'il n'y a pas déjà un paiement complété
    const existing = await pool.query(
      `SELECT id FROM payments WHERE submission_id = $1 AND status = 'completed'`,
      [submission_id]
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({ message: 'This submission has already been paid' });
    }

    const transactionId = `JAEI_${submission_id}_${Date.now()}`;

    // Enregistrer le paiement en base (pending)
    await pool.query(
      `INSERT INTO payments (submission_id, user_id, amount, currency, payment_method, status, transaction_id, created_at)
       VALUES ($1, $2, $3, 'XOF', 'cinetpay', 'pending', $4, NOW())
       ON CONFLICT (submission_id, payment_method)
       DO UPDATE SET status = 'pending', transaction_id = $4, updated_at = NOW()`,
      [submission_id, req.user.id, SUBMISSION_FEE_XOF, transactionId]
    );

    // Appel API CinetPay
    const payload = {
      apikey:         process.env.CINETPAY_API_KEY,
      site_id:        process.env.CINETPAY_SITE_ID,
      transaction_id: transactionId,
      amount:         SUBMISSION_FEE_XOF,
      currency:       'XOF',
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
router.post('/notify', async (req, res) => {
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
        `SELECT submission_id FROM payments WHERE transaction_id = $1`,
        [cpm_trans_id]
      );
      if (payRow.rows.length > 0) {
        const { submission_id } = payRow.rows[0];
        await pool.query(
          `UPDATE submissions SET status = 'submitted', updated_at = NOW()
           WHERE id = $1 AND status = 'pending'`,
          [submission_id]
        );
        console.log(`✅ CinetPay IPN — paiement accepté, soumission #${submission_id}`);
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
// GET /api/payments/verify/:transactionId
// Vérification manuelle du statut (appelé par le frontend
// après retour depuis CinetPay)
// ============================================================
router.get('/verify/:transactionId', verifyToken, async (req, res) => {
  try {
    const { transactionId } = req.params;
    const result = await pool.query(
      `SELECT p.status, p.paid_at, p.amount, p.submission_id,
              s.status AS submission_status
       FROM payments p
       JOIN submissions s ON s.id = p.submission_id
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
              s.title AS article_title, s.status AS submission_status
       FROM payments p
       JOIN submissions s ON s.id = p.submission_id
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
              s.title AS article_title,
              u.first_name || ' ' || u.last_name AS author_name, u.email AS author_email
       FROM payments p
       JOIN submissions s ON s.id = p.submission_id
       JOIN users u ON u.id = p.user_id
       ORDER BY p.created_at DESC`
    );
    res.json({ payments: result.rows });
  } catch (err) {
    console.error('GET /payments (admin):', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
