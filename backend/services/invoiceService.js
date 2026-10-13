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

// Logo en haut à droite (copie de frontend/public/logo-jaei.png : le backend est déployé seul, il lui faut sa propre copie)
const LOGO_PATH = path.join(__dirname, '../assets/logo-jaei.png');
const LOGO_RATIO = 283 / 400;     // hauteur / largeur de l'image

// Libellé de devise affiché sur la facture : « FCFA » comme sur le site (le code ISO est XAF).
const label = (c) => (c === 'XAF' ? 'FCFA' : c);

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const longDate = (d) => `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;

// « 200.00 USD », « 1 440.00 RMB », « 111 000 FCFA » (le FCFA n'a pas de centimes). Séparateur de milliers = espace
// ordinaire : l'espace fine insécable de toLocaleString('fr-FR') (U+202F) n'est pas dessinée par la police du PDF (« 100 /000 »).
const money = (amount, cur) => {
  const digits = cur === 'FCFA' ? 0 : 2;
  const n = (Number(amount) || 0).toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits }).replace(/,/g, ' ');
  return `${n} ${cur}`;
};

/**
 * Facture PDF (A4) : identité du journal et logo en haut, « Bill to », montant réglé, tableau
 * Description / Qty / Unit price / Amount, totaux, note fiscale, pied de page.
 * `description` = intitulé en gras ; `detail` = ligne grise dessous (référence + titre de l'article).
 */
const buildPdfBuffer = ({ invoiceNumber, issuedAt, payerName, payerEmail, description, detail, amount, currency, taxLabel, taxAmount, displayCurrency, displayAmount }) => {
  return new Promise((resolve, reject) => {
    // Marges à 0 : tout est positionné explicitement (le pied de page se trouve dans la marge basse habituelle)
    const doc = new PDFDocument({ size: 'A4', margin: 0 });
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const L = 50, R = 545;
    const INK = '#111827', GRAY = '#6B7280', RULE = '#E5E7EB';

    // ── En-tête : identité du journal à gauche, logo à droite ──
    const LOGO_W = 118, LOGO_Y = 30;
    let logoBottom = 0;
    if (fs.existsSync(LOGO_PATH)) {
      try {
        doc.image(LOGO_PATH, R - LOGO_W, LOGO_Y, { width: LOGO_W });
        logoBottom = LOGO_Y + LOGO_W * LOGO_RATIO;
      } catch (e) {
        console.error('⚠️  Logo de la facture illisible — facture émise sans logo :', e.message);   // jamais bloquant
      }
    }
    doc.font('Helvetica').fontSize(20).fillColor('#1B4427').text('JAEI', L, 50, { lineBreak: false });
    doc.fontSize(9).fillColor(GRAY)
      .text('Journal of Agricultural and Environmental Innovation', L, 76, { lineBreak: false })
      .text('jaei-journal.org  —  contact@jaei-journal.org', L, 88, { lineBreak: false });

    const ruleY = Math.max(110, logoBottom + 8);
    doc.moveTo(L, ruleY).lineTo(R, ruleY).lineWidth(0.5).strokeColor(RULE).stroke();

    // ── Numéro, date, destinataire ──
    let y = ruleY + 16;
    doc.fontSize(16).fillColor(INK).text(`Invoice ${invoiceNumber}`, L, y, { lineBreak: false });
    y += 23;
    doc.fontSize(9).fillColor(GRAY).text(`Issued: ${issuedAt.toISOString().slice(0, 10)}`, L, y, { lineBreak: false });
    y += 26;
    doc.fontSize(10).fillColor(GRAY).text('Bill to', L, y, { lineBreak: false });
    y += 14;
    doc.fontSize(11).fillColor(INK).text(payerName || 'N/A', L, y, { width: R - L });
    y += 15;
    doc.fontSize(10).fillColor(GRAY).text(payerEmail || '', L, y, { width: R - L });

    // Devise du pays de la carte : le débit reste en USD, mais la facture affiche d'abord le tarif dans la devise
    // de l'auteur, puis rappelle ce qui a été débité (note sous les totaux).
    const hasTax = taxAmount && Number(taxAmount) > 0;
    const local = !hasTax && displayCurrency && displayAmount ? { amount: displayAmount, currency: displayCurrency } : null;
    const shown = local || { amount, currency: label(currency) };
    const total = hasTax ? Number(amount) + Number(taxAmount) : shown.amount;

    // ── Montant réglé ──
    y += 40;
    doc.font('Helvetica-Bold').fontSize(15).fillColor(INK)
      .text(`${money(total, shown.currency)} paid on ${longDate(issuedAt)}`, L, y, { width: R - L });

    // ── Tableau ──
    y += 44;
    doc.font('Helvetica').fontSize(7.5).fillColor(GRAY);
    doc.text('Description', L, y, { width: 235, lineBreak: false });
    doc.text('Qty', 290, y, { width: 45, align: 'right', lineBreak: false });
    doc.text('Unit price', 345, y, { width: 95, align: 'right', lineBreak: false });
    doc.text('Amount', 450, y, { width: 95, align: 'right', lineBreak: false });
    doc.moveTo(L, y + 13).lineTo(R, y + 13).lineWidth(0.8).strokeColor(INK).stroke();

    y += 22;
    doc.font('Helvetica-Bold').fontSize(9).fillColor(INK);
    const h1 = doc.heightOfString(description, { width: 235 });
    doc.text(description, L, y, { width: 235 });
    let h2 = 0;
    if (detail) {
      doc.font('Helvetica').fontSize(8.5).fillColor(GRAY);
      h2 = doc.heightOfString(detail, { width: 235 }) + 2;
      doc.text(detail, L, y + h1 + 2, { width: 235 });
    }
    doc.font('Helvetica').fontSize(9).fillColor(INK);
    doc.text('1', 290, y, { width: 45, align: 'right', lineBreak: false });
    doc.text(money(shown.amount, shown.currency), 345, y, { width: 95, align: 'right', lineBreak: false });
    doc.text(money(shown.amount, shown.currency), 450, y, { width: 95, align: 'right', lineBreak: false });
    y += h1 + h2 + 12;
    doc.moveTo(L, y).lineTo(R, y).lineWidth(0.5).strokeColor(RULE).stroke();

    // ── Totaux ──
    const totalRow = (name, value, strong) => {
      doc.moveTo(300, y).lineTo(R, y).lineWidth(strong ? 0.8 : 0.5).strokeColor(strong ? INK : RULE).stroke();
      doc.font(strong ? 'Helvetica-Bold' : 'Helvetica').fontSize(9).fillColor(INK);
      doc.text(name, 300, y + 6, { width: 140, lineBreak: false });
      doc.text(value, 450, y + 6, { width: 95, align: 'right', lineBreak: false });
      y += 21;
    };
    totalRow('Subtotal', money(shown.amount, shown.currency));
    if (hasTax) totalRow(taxLabel || 'Tax', money(taxAmount, shown.currency));
    totalRow('Total', money(total, shown.currency));
    totalRow('Amount paid', money(total, shown.currency), true);

    // ── Notes ──
    y += 16;
    doc.font('Helvetica').fontSize(7.5).fillColor(GRAY);
    if (local) {
      const note = `Charged to your card as ${money(amount, label(currency))} (JAEI price list: ${money(amount, label(currency))} = ${money(local.amount, local.currency)}). Your bank may apply its own exchange rate.`;
      doc.text(note, L, y, { width: R - L });
      y += doc.heightOfString(note, { width: R - L }) + 4;
    }
    if (!hasTax) {
      doc.text('No tax applied on this invoice — tax regime not yet configured for this transaction.', L, y, { width: R - L });
    }

    // ── Pied de page ──
    doc.moveTo(L, 790).lineTo(R, 790).lineWidth(0.5).strokeColor(RULE).stroke();
    doc.fontSize(7.5).fillColor(GRAY)
      .text('Journal of Agricultural and Environmental Innovation  ·  jaei-journal.org  ·  contact@jaei-journal.org', L, 797, { width: R - L, align: 'center', lineBreak: false });

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
const createInvoice = async ({ paymentId, submissionId, amount, currency = 'USD', payerName, payerEmail, description, descriptionDetail = null, cardCountry = null, displayCurrency = null, displayAmount = null }) => {
  const invoiceNumber = await nextInvoiceNumber();
  const issuedAt = new Date();
  const taxLabel = null;
  const taxAmount = 0;

  const pdfBuffer = await buildPdfBuffer({
    invoiceNumber, issuedAt, payerName, payerEmail, description, detail: descriptionDetail, amount, currency, taxLabel, taxAmount,
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

module.exports = { createInvoice, findInvoiceBySubmission, buildPdfBuffer, INVOICES_DIR };
