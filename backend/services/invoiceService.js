const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');
const pool = require('../db/connection');

// ============================================================
// JAEI — Service de facturation (Commentaire 2 du client, 28/09)
// Génère un PDF de facture séquentiel à chaque règlement d'APC enregistré
// (paiement Stripe confirmé, ou APC marquée comme payée par l'admin),
// l'archive (Cloudinary ou disque local, même bascule que submissions.js),
// et enregistre une ligne dans `invoices`.
//
// ⚠️  Taxe volontairement vide (tax_label/tax_amount = null/0).
//     Impossible de savoir quel régime fiscal s'applique (TPS/TVQ
//     canadien mentionné par le client, mais JAEI est basé au
//     Cameroun et le compte Stripe sera détenu par un tiers dans
//     un pays encore non déterminé) — voir docs/PAIEMENTS-PREPARATION.md.
//     À configurer une fois l'entité réceptrice des fonds connue.
// ============================================================

const CLOUDINARY_CONFIGURED =
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET;

const { uploadToCloudinary } = CLOUDINARY_CONFIGURED
  ? require('./cloudinaryService')
  : { uploadToCloudinary: null };

const INVOICES_DIR = path.join(__dirname, '../uploads/invoices');
if (!fs.existsSync(INVOICES_DIR)) fs.mkdirSync(INVOICES_DIR, { recursive: true });

const nextInvoiceNumber = async () => {
  const r = await pool.query(`SELECT nextval('invoice_number_seq') AS n`);
  return `JAEI-INV-${String(r.rows[0].n).padStart(6, '0')}`;
};

// toLocaleString('fr-FR') sépare les milliers par une espace fine insécable (U+202F) que la
// police standard du PDF ne sait pas dessiner : « 100 000 » s'imprimait « 100 /000 ».
// \s couvre cette espace et l'espace insécable : on les remplace par une espace normale.
const fmt = (n) => Number(n || 0).toLocaleString('fr-FR').replace(/\s/g, ' ');

// Libellé de devise affiché sur la facture : « FCFA » comme sur le site (le code ISO est XAF).
const label = (c) => (c === 'XAF' ? 'FCFA' : c);

const buildPdfBuffer = ({ invoiceNumber, issuedAt, payerName, payerEmail, description, amount, currency, taxLabel, taxAmount, paymentNote, displayCurrency, displayAmount }) => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.fontSize(20).fillColor('#1B4427').text('JAEI', { continued: false });
    doc.fontSize(9).fillColor('#6B7280')
      .text('Journal of Agricultural and Environmental Innovation')
      .text('jaei-journal.org  —  contact@jaei-journal.org');

    doc.moveDown(1.5);
    doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#E5E7EB').stroke();
    doc.moveDown(1);

    doc.fontSize(16).fillColor('#111827').text(`Invoice ${invoiceNumber}`);
    doc.fontSize(9).fillColor('#6B7280').text(`Issued: ${issuedAt.toISOString().slice(0, 10)}`);
    doc.moveDown(1);

    doc.fontSize(10).fillColor('#6B7280').text('Bill to');
    doc.fontSize(11).fillColor('#111827').text(payerName || 'N/A');
    doc.fontSize(10).fillColor('#6B7280').text(payerEmail || '');
    doc.moveDown(1.2);

    doc.fontSize(10).fillColor('#111827').text(description);
    if (paymentNote) {
      doc.moveDown(0.4);
      doc.fontSize(9).fillColor('#6B7280').text(paymentNote);
    }
    doc.moveDown(0.8);

    doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#E5E7EB').stroke();
    doc.moveDown(0.5);

    // Devise du pays de la carte : le montant débité reste en FCFA (Stripe), mais la facture affiche
    // d'abord le tarif publié dans la devise de l'auteur, puis rappelle ce qui a été débité.
    const hasTax = taxAmount && Number(taxAmount) > 0;
    const local = !hasTax && displayCurrency && displayAmount ? { amount: displayAmount, currency: displayCurrency } : null;
    const shown = local || { amount, currency: label(currency) };

    doc.fontSize(10).fillColor('#374151').text(`Subtotal: ${fmt(shown.amount)} ${shown.currency}`, { align: 'right' });
    if (hasTax) {
      doc.text(`${taxLabel || 'Tax'}: ${fmt(taxAmount)} ${shown.currency}`, { align: 'right' });
      doc.fontSize(12).fillColor('#1B4427')
        .text(`Total: ${fmt(Number(amount) + Number(taxAmount))} ${shown.currency}`, { align: 'right' });
    } else {
      doc.fontSize(12).fillColor('#1B4427').text(`Total: ${fmt(shown.amount)} ${shown.currency}`, { align: 'right' });
      doc.moveDown(0.5);
      if (local) {
        doc.fontSize(8).fillColor('#6B7280')
          .text(`Charged to your card as ${fmt(amount)} ${label(currency)} (JAEI price list: ${fmt(amount)} ${label(currency)} = ${fmt(local.amount)} ${local.currency}). Your bank may apply its own exchange rate.`,
                { align: 'right' });
        doc.moveDown(0.3);
      }
      doc.fontSize(8).fillColor('#9CA3AF')
        .text('No tax applied on this invoice — tax regime not yet configured for this transaction.', { align: 'right' });
    }

    doc.end();
  });
};

/** Facture déjà émise pour cette soumission (une seule facture d'APC par article), ou null. */
const findInvoiceBySubmission = async (submissionId) => {
  const r = await pool.query('SELECT * FROM invoices WHERE submission_id = $1 ORDER BY id DESC LIMIT 1', [submissionId]);
  return r.rows[0] || null;
};

/**
 * Crée une facture pour un règlement d'APC enregistré : PDF + archivage + ligne DB.
 * Retourne la ligne `invoices` + `pdfBuffer` (le PDF en mémoire, pour le joindre
 * à l'email de confirmation sans le retélécharger).
 */
const createInvoice = async ({ paymentId, submissionId, amount, currency = 'XAF', payerName, payerEmail, description, paymentNote, cardCountry = null, displayCurrency = null, displayAmount = null }) => {
  const invoiceNumber = await nextInvoiceNumber();
  const issuedAt = new Date();
  const taxLabel = null;
  const taxAmount = 0;

  const pdfBuffer = await buildPdfBuffer({
    invoiceNumber, issuedAt, payerName, payerEmail, description, amount, currency, taxLabel, taxAmount, paymentNote,
    displayCurrency, displayAmount,
  });

  let pdfUrl;
  if (CLOUDINARY_CONFIGURED) {
    const result = await uploadToCloudinary(pdfBuffer, {
      folder: 'jaei/invoices',
      resource_type: 'raw',
      public_id: `${invoiceNumber}.pdf`,
      use_filename: false,
    });
    pdfUrl = result.secure_url;
  } else {
    const filename = `${invoiceNumber}.pdf`;
    fs.writeFileSync(path.join(INVOICES_DIR, filename), pdfBuffer);
    const base = process.env.BACKEND_URL || 'http://localhost:5000';
    pdfUrl = `${base}/uploads/invoices/${filename}`;
  }

  let result;
  try {
    result = await pool.query(
      `INSERT INTO invoices (payment_id, submission_id, invoice_number, amount, currency, tax_label, tax_amount, payer_name, payer_email, pdf_url, issued_at, card_country, display_currency, display_amount)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *`,
      [paymentId, submissionId, invoiceNumber, amount, currency, taxLabel, taxAmount, payerName, payerEmail, pdfUrl, issuedAt, cardCountry, displayCurrency, displayAmount]
    );
  } catch (err) {
    // 42703 = colonne inexistante (base pas encore migrée) : l'affichage en devise locale ne doit
    // jamais empêcher d'émettre la facture d'un paiement déjà encaissé → insertion sans ces colonnes.
    if (err.code !== '42703') throw err;
    console.error('⚠️  invoices : colonnes card_country/display_* absentes — facture enregistrée sans elles');
    result = await pool.query(
      `INSERT INTO invoices (payment_id, submission_id, invoice_number, amount, currency, tax_label, tax_amount, payer_name, payer_email, pdf_url, issued_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [paymentId, submissionId, invoiceNumber, amount, currency, taxLabel, taxAmount, payerName, payerEmail, pdfUrl, issuedAt]
    );
  }
  return { ...result.rows[0], pdfBuffer };
};

module.exports = { createInvoice, findInvoiceBySubmission, INVOICES_DIR };
