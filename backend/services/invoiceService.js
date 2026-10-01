const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');
const pool = require('../db/connection');

// ============================================================
// JAEI — Service de facturation (Commentaire 2 du client, 28/09)
// Génère un PDF de facture séquentiel à chaque paiement complété
// (CinetPay ou Stripe), l'archive (Cloudinary ou disque local,
// même bascule que submissions.js), et enregistre une ligne
// dans `invoices`.
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

const fmt = (n) => Number(n || 0).toLocaleString('fr-FR');

const buildPdfBuffer = ({ invoiceNumber, issuedAt, payerName, payerEmail, description, amount, currency, taxLabel, taxAmount }) => {
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
    doc.moveDown(0.8);

    doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#E5E7EB').stroke();
    doc.moveDown(0.5);

    doc.fontSize(10).fillColor('#374151').text(`Subtotal: ${fmt(amount)} ${currency}`, { align: 'right' });
    if (taxAmount && Number(taxAmount) > 0) {
      doc.text(`${taxLabel || 'Tax'}: ${fmt(taxAmount)} ${currency}`, { align: 'right' });
      doc.fontSize(12).fillColor('#1B4427')
        .text(`Total: ${fmt(Number(amount) + Number(taxAmount))} ${currency}`, { align: 'right' });
    } else {
      doc.fontSize(12).fillColor('#1B4427').text(`Total: ${fmt(amount)} ${currency}`, { align: 'right' });
      doc.moveDown(0.5);
      doc.fontSize(8).fillColor('#9CA3AF')
        .text('No tax applied on this invoice — tax regime not yet configured for this transaction.', { align: 'right' });
    }

    doc.end();
  });
};

/**
 * Crée une facture pour un paiement complété : PDF + archivage + ligne DB.
 * Non bloquant pour l'appelant recommandé (à lancer en fire-and-forget
 * depuis le webhook de paiement, comme sendPaymentEmails).
 */
const createInvoice = async ({ paymentId, submissionId, amount, currency = 'XAF', payerName, payerEmail, description }) => {
  const invoiceNumber = await nextInvoiceNumber();
  const issuedAt = new Date();
  const taxLabel = null;
  const taxAmount = 0;

  const pdfBuffer = await buildPdfBuffer({
    invoiceNumber, issuedAt, payerName, payerEmail, description, amount, currency, taxLabel, taxAmount,
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

  const result = await pool.query(
    `INSERT INTO invoices (payment_id, submission_id, invoice_number, amount, currency, tax_label, tax_amount, payer_name, payer_email, pdf_url, issued_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
    [paymentId, submissionId, invoiceNumber, amount, currency, taxLabel, taxAmount, payerName, payerEmail, pdfUrl, issuedAt]
  );
  return result.rows[0];
};

module.exports = { createInvoice, INVOICES_DIR };
