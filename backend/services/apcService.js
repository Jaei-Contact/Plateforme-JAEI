// ============================================================
// JAEI — Enregistrement du règlement de l'APC (Article Processing Charge)
//
// Point d'entrée UNIQUE des deux circuits de paiement :
//   • 'offline' : l'administrateur clique « Mark APC as paid »
//   • 'stripe'  : confirmation du paiement par carte (webhook Stripe signé)
//
// À chaque premier règlement d'une soumission :
//   1. une facture PDF numérotée est émise (une seule par soumission) ;
//   2. l'auteur reçoit un email de confirmation avec la facture en pièce jointe ;
//   3. l'auteur est notifié dans l'application (cloche) ;
//   4. circuit Stripe seulement : l'administration est prévenue (email + cloche).
//
// Idempotent : un second appel pour la même soumission (webhook rejoué, décochage
// puis re-cochage de « Mark APC as paid ») ne crée ni seconde facture ni second email.
// Ne lève jamais d'exception : un échec de facturation ou d'email est journalisé
// mais ne doit pas annuler l'enregistrement du paiement lui-même.
// ============================================================

const pool = require('../db/connection');
const { sendEmail, EMAIL_TEMPLATES } = require('./emailService');
const { createInvoice, findInvoiceBySubmission } = require('./invoiceService');
const { notify, notifyAdmins } = require('./notificationService');
const { invoiceDisplayFor } = require('../config/fees');
const { getApcAmountUsd } = require('./settingsService');
const { getCardCountry } = require('./stripeService');

// Libellé du moyen de paiement affiché à l'auteur : la carte uniquement. Un règlement
// marqué par l'administrateur n'affiche aucun moyen de paiement.
const METHOD_LABELS = {
  stripe: 'Card payment',
};

/**
 * Crée (ou réactive) la ligne `payments` du marquage manuel par l'admin : elle rattache la
 * facture à un paiement et alimente le rapprochement paiements / factures.
 * Une seule ligne par soumission et par moyen de paiement (contrainte d'unicité).
 */
const ensureOfflinePayment = async ({ submissionId, userId, amount = null, currency = 'USD' }) => {
  const value = amount === null || amount === undefined ? await getApcAmountUsd() : amount;
  const r = await pool.query(
    `INSERT INTO payments (user_id, submission_id, amount, currency, payment_method, status, transaction_id, paid_at)
     VALUES ($1, $2, $3, $5, 'offline', 'completed', $4, NOW())
     ON CONFLICT (submission_id, payment_method)
       DO UPDATE SET status = 'completed', paid_at = NOW(), amount = EXCLUDED.amount, currency = EXCLUDED.currency, updated_at = NOW()
     RETURNING id`,
    [userId, submissionId, value, `OFFLINE_${submissionId}`, currency]
  );
  return r.rows[0].id;
};

/**
 * @param {object} p
 * @param {number} p.submissionId
 * @param {'stripe'|'offline'} p.method
 * @param {number|null} [p.paymentId]   ligne `payments` liée (facture rattachée)
 * @param {number} [p.amount]           montant réglé (défaut : montant courant de l'APC en USD)
 * @param {string} [p.currency]         devise du règlement (défaut : USD)
 * @param {string|null} [p.paymentIntentId]  paiement Stripe : sert à lire le pays de la carte (devise d'affichage de la facture)
 * @returns {Promise<{invoice: object|null, emailed: boolean, alreadyRecorded: boolean}>}
 */
const recordApcPayment = async ({ submissionId, method, paymentId = null, amount = null, currency = 'USD', paymentIntentId = null }) => {
  const result = { invoice: null, emailed: false, alreadyRecorded: false };
  try {
    if (amount === null || amount === undefined) amount = await getApcAmountUsd();
    const subRes = await pool.query(
      `SELECT s.id, s.title, s.manuscript_number, s.author_id, u.email, u.first_name, u.last_name
         FROM submissions s JOIN users u ON u.id = s.author_id
        WHERE s.id = $1`,
      [submissionId]
    );
    if (subRes.rows.length === 0) return result;
    const sub = subRes.rows[0];
    const authorName = `${sub.first_name || ''} ${sub.last_name || ''}`.trim() || sub.email;
    const ref = sub.manuscript_number || `JAEI-#${sub.id}`;

    // 1) Facture : une seule par soumission
    const existing = await findInvoiceBySubmission(submissionId);
    if (existing) {
      result.invoice = existing;
      result.alreadyRecorded = true;
      return result;
    }
    // Devise d'affichage de la facture : selon le pays de la carte (paiement Stripe seulement).
    // Le débit est en USD ; pays inconnu ou pays en USD → facture en USD seul.
    const cardCountry = method === 'stripe' ? await getCardCountry(paymentIntentId) : null;
    const display = invoiceDisplayFor(amount, cardCountry, currency);

    const invoice = await createInvoice({
      paymentId,
      submissionId,
      amount,
      currency,
      cardCountry,
      displayCurrency: display ? display.currency : null,
      displayAmount: display ? display.amount : null,
      payerName: authorName,
      payerEmail: sub.email,
      description: 'Article Processing Charge (APC)',
      descriptionDetail: `${ref} — ${sub.title}`,
    });
    result.invoice = invoice;

    // 2) Email à l'auteur, facture PDF jointe
    try {
      const tpl = EMAIL_TEMPLATES.paymentConfirmedAuthor({
        authorName, articleTitle: sub.title, manuscriptNumber: ref, amount, currency,
        invoiceNumber: invoice.invoice_number, methodLabel: METHOD_LABELS[method] || null, display,
      });
      const sent = await sendEmail({
        to: sub.email,
        ...tpl,
        attachments: invoice.pdfBuffer
          ? [{ filename: `${invoice.invoice_number}.pdf`, content: invoice.pdfBuffer, contentType: 'application/pdf' }]
          : [],
      });
      result.emailed = !!sent;
    } catch (e) {
      console.error('⚠️  APC confirmation email (author) failed:', e.message);
    }

    // 3) Notification dans l'application
    notify({
      userId: sub.author_id, type: 'apc_paid',
      title: 'APC payment received — invoice sent by email',
      body: sub.title, submissionId: sub.id, link: `/author/submissions/${sub.id}`,
    });

    // 4) Paiement par carte : l'administration n'a pas cliqué elle-même → on la prévient
    if (method === 'stripe') {
      const adminTo = process.env.ADMIN_EMAIL || process.env.SMTP_FROM;
      if (adminTo) {
        sendEmail({
          to: adminTo,
          ...EMAIL_TEMPLATES.paymentReceivedAdmin({ authorName, articleTitle: sub.title, manuscriptNumber: ref, amount, currency, display }),
        }).catch((e) => console.error('⚠️  APC payment email (admin) failed:', e.message));
      }
      notifyAdmins({
        type: 'apc_paid',
        title: 'APC payment received (card)',
        body: sub.title, submissionId: sub.id, link: `/admin/submissions/${sub.id}`,
      });
    }
  } catch (e) {
    console.error('⚠️  recordApcPayment error:', e.message);
  }
  return result;
};

module.exports = { recordApcPayment, ensureOfflinePayment, METHOD_LABELS };
