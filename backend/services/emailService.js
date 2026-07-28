const nodemailer = require('nodemailer');
const dns = require('dns').promises;

// ============================================================
// JAEI — Email Service (Nodemailer)
// Uses SMTP configured in .env
// In dev: Ethereal (fake SMTP, emails visible on ethereal.email)
// In prod: replace with real SMTP (Gmail, SendGrid, Mailtrap…)
// ============================================================

// ── Échappement HTML — protège contre le XSS dans les emails ─
// Tous les contenus utilisateur (titres, commentaires…) doivent
// passer par escHtml() avant d'être interpolés dans du HTML.
const escHtml = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');

// ── Transporter ─────────────────────────────────────────────

// Cache de l'IP v4 du serveur SMTP (résolue une seule fois)
let cachedSmtpIp = null;

const createTransporter = async () => {
  // Pas de SMTP_HOST → mode dev (simulation console)
  if (!process.env.SMTP_HOST) return null;

  // Render (free) ne route PAS l'IPv6 → nodemailer tombe sur ENETUNREACH.
  // On résout le host en IPv4 nous-mêmes et on s'y connecte directement.
  // tls.servername conserve le bon nom pour le SNI et la validation du certificat.
  if (!cachedSmtpIp) {
    try {
      const addrs = await dns.resolve4(process.env.SMTP_HOST);
      cachedSmtpIp = addrs[0];
      console.log(`📧 SMTP résolu en IPv4: ${process.env.SMTP_HOST} -> ${cachedSmtpIp}`);
    } catch (e) {
      console.error('⚠️  Résolution IPv4 du SMTP échouée, fallback hostname:', e.message);
    }
  }

  return nodemailer.createTransport({
    host: cachedSmtpIp || process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    connectionTimeout: 10000,   // Échoue vite si SMTP injoignable au lieu de bloquer la requête
    greetingTimeout: 10000,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    tls: {
      servername: process.env.SMTP_HOST,   // SNI + validation du certificat sur le vrai hostname
    },
  });
};

// ── Envoi via Resend (HTTP API, port 443) ────────────────────
// Render (et la plupart des PaaS) bloquent le SMTP sortant (ports 25/465/587).
// Resend envoie par HTTPS (443), jamais bloqué. Utilisé en priorité si configuré.
const sendViaResend = async ({ to, subject, html, text, from }) => {
  const fromAddr = from || `JAEI <${process.env.RESEND_FROM || process.env.SMTP_FROM || process.env.SMTP_USER}>`;
  const resp = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: fromAddr, to: [to], subject, html, text }),
  });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) throw new Error(`Resend ${resp.status}: ${data.message || JSON.stringify(data)}`);
  return { messageId: data.id };
};

// ── Fonction d'envoi ─────────────────────────────────────────

const sendEmail = async ({ to, subject, html, text, from }) => {
  // ── Priorité 1 : Resend (HTTP) — fonctionne partout, y compris sur Render ──
  if (process.env.RESEND_API_KEY) {
    try {
      const info = await sendViaResend({ to, subject, html, text, from });
      console.log(`📧 Email envoyé à ${to} via Resend — id: ${info.messageId}`);
      return info;
    } catch (err) {
      console.error(`⚠️  Échec Resend pour ${to}:`, err.message);
      return null;
    }
  }

  // ── Priorité 2 : SMTP (dev local, où le port 587 n'est pas bloqué) ──
  const transporter = await createTransporter();

  // Dev mode without SMTP: log to console
  if (!transporter) {
    console.log('\n📧 [SIMULATED EMAIL]');
    console.log(`  To      : ${to}`);
    console.log(`  Subject : ${subject}`);
    console.log(`  Content : ${text || '(html)'}`);
    console.log('─'.repeat(50));
    return { simulated: true };
  }

  const defaultFrom = `"JAEI — Journal of Agricultural and Environmental Innovation" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`;

  try {
    const info = await transporter.sendMail({
      from: from || defaultFrom,
      to,
      subject,
      html,
      text,
    });
    console.log(`📧 Email sent to ${to} — Message ID: ${info.messageId}`);
    return info;
  } catch (err) {
    // Email failures never block business operations
    console.error(`⚠️  Failed to send email to ${to}:`, err.message);
    return null;
  }
};

// ── Habillage commun "lettre JAEI" (entête vert + corps sobre) ──
const jaeiLetter = (inner) => `
  <div style="font-family:Arial,sans-serif;max-width:620px;margin:0 auto;color:#2D2D2D;background:#f5f5f5;padding:24px">
    <div style="background:#fff;border-radius:4px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08)">
      <div style="background:linear-gradient(135deg,#1B4427,#1E88C8);padding:20px 32px">
        <h1 style="color:#fff;margin:0;font-size:20px">JAEI</h1>
        <p style="color:rgba(255,255,255,0.7);margin:4px 0 0;font-size:12px">Journal of Agricultural and Environmental Innovation</p>
      </div>
      <div style="padding:30px 34px;font-size:14px;color:#374151;line-height:1.65">
        ${inner}
        <p style="color:#9CA3AF;font-size:11px;margin:28px 0 0;border-top:1px solid #F3F4F6;padding-top:14px">
          © ${new Date().getFullYear()} JAEI — Journal of Agricultural and Environmental Innovation
        </p>
      </div>
    </div>
  </div>`;

// Bloc "Ref / Title / Article Type" des mails reviewers (Remarques 8-9)
const refBlock = (ms, title, type) => `
  <div style="background:#F9FAFB;border:1px solid #E5E7EB;border-radius:4px;padding:12px 16px;margin:0 0 18px;font-size:13px;line-height:1.7">
    <div><strong>Ref:</strong> <span style="color:#1B4427;font-weight:700">${escHtml(ms)}</span></div>
    <div><strong>Title:</strong> "${escHtml(title)}"</div>
    <div><strong>Article Type:</strong> ${escHtml(type || 'Original article')}</div>
  </div>`;

// ── Templates ────────────────────────────────────────────────

const EMAIL_TEMPLATES = {

  // Email verification — sent after registration
  // NOTE: no 'from' override here — uses SMTP_FROM / SMTP_USER from env
  emailVerification: ({ userName, verificationLink }) => ({
    subject: 'Confirm your email address — JAEI',
    text: `Hello ${userName},\n\nPlease confirm your email address by clicking the link below:\n\n${verificationLink}\n\nThis link expires in 24 hours.\n\nIf you did not create an account on JAEI, please ignore this email.\n\nThe JAEI Team`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#2D2D2D;background:#f5f5f5;padding:24px">
        <div style="background:#fff;border-radius:4px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08)">

          <!-- Header -->
          <div style="background:#1B4427;padding:28px 36px;text-align:center">
            <h1 style="color:#fff;margin:0;font-size:22px;font-weight:700;letter-spacing:0.03em">JAEI</h1>
            <p style="color:rgba(255,255,255,0.65);margin:6px 0 0;font-size:12px">
              Journal of Agricultural and Environmental Innovation
            </p>
          </div>

          <!-- Body -->
          <div style="padding:36px 40px">
            <h2 style="font-size:20px;font-weight:600;color:#1D1D1D;margin:0 0 12px">
              Confirm your email address
            </h2>
            <p style="font-size:14px;color:#555;line-height:1.6;margin:0 0 8px">
              Hi ${escHtml(userName)},
            </p>
            <p style="font-size:14px;color:#555;line-height:1.6;margin:0 0 28px">
              Please confirm your email address to activate your JAEI account.
            </p>

            <!-- CTA button -->
            <div style="text-align:center;margin-bottom:28px">
              <a href="${verificationLink}"
                 style="display:inline-block;background:#1B4427;color:#fff;padding:14px 36px;
                        border-radius:4px;text-decoration:none;font-weight:700;font-size:15px;
                        letter-spacing:0.02em">
                Confirm Email
              </a>
            </div>

            <!-- Fallback link -->
            <p style="font-size:13px;color:#888;margin:0 0 6px">Or use this link:</p>
            <a href="${verificationLink}"
               style="font-size:12px;color:#1B4427;word-break:break-all">
              ${verificationLink}
            </a>

            <!-- Expiry notice -->
            <div style="margin-top:28px;padding:14px 16px;background:#FEF3C7;border-left:3px solid #F59E0B;border-radius:2px">
              <p style="margin:0;font-size:12px;color:#92400E;line-height:1.5">
                ⚠️ <strong>This link expires in 24 hours.</strong>
                If you didn't create an account on JAEI, please ignore this email.
              </p>
            </div>
          </div>

          <!-- Footer -->
          <div style="padding:20px 40px;border-top:1px solid #F0F0F0;background:#FAFAFA">
            <p style="margin:0;font-size:11px;color:#aaa;text-align:center">
              This is an automated message, please do not reply to this email.<br>
              © ${new Date().getFullYear()} JAEI — Journal of Agricultural and Environmental Innovation
            </p>
          </div>

        </div>
      </div>
    `,
  }),

  // Welcome — envoyé APRÈS la vérification de l'email (compte actif).
  // Texte + lien dashboard adaptés au rôle (author / reviewer / admin).
  welcome: ({ userName, email, role }) => {
    const FRONT = process.env.FRONTEND_URL || 'http://localhost:5173';
    const ROLE_CTA = {
      author:   { msg: 'You can now submit and track your manuscripts from your dashboard.',  label: 'Go to my dashboard',          path: '/author/dashboard' },
      reviewer: { msg: 'You can now access and evaluate the manuscripts assigned to you.',     label: 'Go to my reviewer dashboard', path: '/reviewer/dashboard' },
      admin:    { msg: 'You can manage the platform from your administration dashboard.',       label: 'Go to my dashboard',          path: '/admin/dashboard' },
    };
    const cta = ROLE_CTA[role] || ROLE_CTA.author;
    const resetLink   = `${FRONT}/forgot-password`;
    const profileLink = `${FRONT}/profile`;
    const dashLink    = `${FRONT}${cta.path}`;
    const privacyLink = `${FRONT}/privacy`;

    return {
      subject: 'Welcome to JAEI — Your account is now active',
      text: `Dear ${userName},\n\nWelcome to the Journal of Agricultural and Environmental Innovation (JAEI). Your account has been successfully created and verified.\n\nYour username is your email address: ${email}\n\nFor security reasons, your password is never sent by email. If you ever forget it, you can reset it here: ${resetLink}\n\nYou can update your password and personal information anytime from your profile: ${profileLink}\n\n${cta.msg} ${dashLink}\n\nWith best regards,\nThe JAEI Editorial Team`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#2D2D2D;background:#f5f5f5;padding:24px">
          <div style="background:#fff;border-radius:4px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08)">

            <!-- Header -->
            <div style="background:linear-gradient(135deg,#1B4427,#1E88C8);padding:28px 36px;text-align:center">
              <h1 style="color:#fff;margin:0;font-size:22px;font-weight:700;letter-spacing:0.03em">JAEI</h1>
              <p style="color:rgba(255,255,255,0.7);margin:6px 0 0;font-size:12px">
                Journal of Agricultural and Environmental Innovation
              </p>
            </div>

            <!-- Body -->
            <div style="padding:36px 40px">
              <h2 style="font-size:20px;font-weight:600;color:#1B4427;margin:0 0 16px">Welcome to JAEI! 🎉</h2>
              <p style="font-size:14px;color:#555;line-height:1.6;margin:0 0 8px">
                Dear <strong>${escHtml(userName)}</strong>,
              </p>
              <p style="font-size:14px;color:#555;line-height:1.6;margin:0 0 20px">
                Welcome to the <strong>Journal of Agricultural and Environmental Innovation</strong>.
                Your account has been successfully created and verified.
              </p>

              <!-- Username -->
              <div style="background:#F0FDF4;border:1px solid #BBF7D0;border-radius:4px;padding:14px 16px;margin:0 0 20px">
                <p style="margin:0;font-size:13px;color:#6B7280">Your username (login):</p>
                <p style="margin:4px 0 0;font-size:14px;font-weight:600;color:#15803D">${escHtml(email)}</p>
              </div>

              <p style="font-size:13px;color:#555;line-height:1.6;margin:0 0 6px">
                🔒 For security, your password is never sent by email. If you forget it, you can
                <a href="${resetLink}" style="color:#1E88C8;font-weight:600">reset it here</a>.
              </p>
              <p style="font-size:13px;color:#555;line-height:1.6;margin:0 0 24px">
                You can update your password and personal information anytime from your
                <a href="${profileLink}" style="color:#1E88C8;font-weight:600">profile page</a>.
              </p>

              <!-- Role-specific CTA -->
              <p style="font-size:14px;color:#374151;line-height:1.6;margin:0 0 16px">${cta.msg}</p>
              <div style="text-align:center;margin-bottom:8px">
                <a href="${dashLink}"
                   style="display:inline-block;background:#1B4427;color:#fff;padding:13px 32px;
                          border-radius:4px;text-decoration:none;font-weight:700;font-size:15px">
                  ${cta.label}
                </a>
              </div>
            </div>

            <!-- Footer (RGPD concis) -->
            <div style="padding:18px 40px;border-top:1px solid #F0F0F0;background:#FAFAFA">
              <p style="margin:0 0 8px;font-size:11px;color:#999;line-height:1.5">
                This is an automated message — please do not reply.<br>
                With best regards, <strong style="color:#666">The JAEI Editorial Team</strong>
              </p>
              <p style="margin:0;font-size:10px;color:#aaa;line-height:1.5">
                JAEI stores your registration details solely to manage submissions, peer review and publication.
                See our <a href="${privacyLink}" style="color:#999">Privacy Policy</a>.
                You may request deletion of your personal data anytime at
                <a href="mailto:contact@jaei-journal.org" style="color:#999">contact@jaei-journal.org</a>.<br>
                © ${new Date().getFullYear()} JAEI — Journal of Agricultural and Environmental Innovation
              </p>
            </div>

          </div>
        </div>
      `,
    };
  },

  // Article submission confirmation
  // ── Remarque 4 (client) — mail au SOUMETTEUR (texte imposé) ──
  // salutation = "M./Mme/Dr./Prof + nom" choisi dans le formulaire.
  submissionReceived: ({ salutation, articleTitle, manuscriptNumber }) => ({
    subject: `${manuscriptNumber} - Confirming your submission to Journal of Agricultural and Environmental Innovation`,
    text: `Dear ${salutation},\n\nThank you for sending your manuscript "${articleTitle}" for consideration to Journal of Agricultural and Environmental Innovation (JAEI). It has been assigned the following manuscript number: ${manuscriptNumber}. Please accept this message as confirmation of your submission.\n\nMany thanks again for your interest in Journal of Agricultural and Environmental Innovation.\nEditorial Manager\n\nKind regards,\nJournal: Journal of Agricultural and Environmental Innovation (JAEI)`,
    html: jaeiLetter(`
      <p style="margin:0 0 14px">Dear ${escHtml(salutation)},</p>
      <p style="margin:0 0 14px">Thank you for sending your manuscript "<strong>${escHtml(articleTitle)}</strong>" for consideration to Journal of Agricultural and Environmental Innovation (JAEI). It has been assigned the following manuscript number: <strong style="color:#1B4427">${escHtml(manuscriptNumber)}</strong>. Please accept this message as confirmation of your submission.</p>
      <p style="margin:0 0 4px">Many thanks again for your interest in Journal of Agricultural and Environmental Innovation.</p>
      <p style="margin:0 0 18px">Editorial Manager</p>
      <p style="margin:0">Kind regards,<br/>Journal: Journal of Agricultural and Environmental Innovation (JAEI)</p>
    `),
  }),

  // ── Remarque 4 (client) — mail à CHAQUE CO-AUTEUR (texte imposé, sans lien plateforme) ──
  coAuthorNotice: ({ salutation, articleTitle, manuscriptNumber, correspondingName }) => ({
    subject: `${manuscriptNumber} - Co-author confirmation — Journal of Agricultural and Environmental Innovation`,
    text: `Dear ${salutation},\n\nPlease note that you are listed as a co-author on the manuscript "${articleTitle}" (reference number: ${manuscriptNumber}), which was recently submitted to Journal of Agricultural and Environmental Innovation (JAEI).\n\nThe corresponding author "${correspondingName}" is solely responsible for communicating with the journal and managing communication between co-authors. Please contact the corresponding author directly with any queries you may have related to this manuscript.\n\nMany thanks again for your interest in Journal of Agricultural and Environmental Innovation.\nEditorial Manager\n\nKind regards,\nJournal: Journal of Agricultural and Environmental Innovation (JAEI)`,
    html: jaeiLetter(`
      <p style="margin:0 0 14px">Dear ${escHtml(salutation)},</p>
      <p style="margin:0 0 14px">Please note that you are listed as a co-author on the manuscript "<strong>${escHtml(articleTitle)}</strong>" (reference number: <strong style="color:#1B4427">${escHtml(manuscriptNumber)}</strong>), which was recently submitted to Journal of Agricultural and Environmental Innovation (JAEI).</p>
      <p style="margin:0 0 14px">The corresponding author "<strong>${escHtml(correspondingName)}</strong>" is solely responsible for communicating with the journal and managing communication between co-authors. Please contact the corresponding author directly with any queries you may have related to this manuscript.</p>
      <p style="margin:0 0 4px">Many thanks again for your interest in Journal of Agricultural and Environmental Innovation.</p>
      <p style="margin:0 0 18px">Editorial Manager</p>
      <p style="margin:0">Kind regards,<br/>Journal: Journal of Agricultural and Environmental Innovation (JAEI)</p>
    `),
  }),

  // ── Remarque 7 (client) — invitation reviewer avec Accept / Decline (15 jours) ──
  // Vocal 20/07 : l'éditeur "vient avec l'email" d'un spécialiste (compte ou non) et
  // le mail doit porter "toutes les informations du document" → titre + type + abstract.
  reviewInvitation: ({ salutation, articleTitle, manuscriptNumber, articleType, abstract, acceptUrl, declineUrl }) => ({
    subject: `Invitation to review - Ref: ${manuscriptNumber}`,
    text: `Dear ${salutation},\n\nWe have received a manuscript for the Journal of Agricultural and Environmental Innovation (JAEI) that we think falls within your area of expertise. Our reviewers are integral to ensuring we have the highest-quality publication. We would greatly appreciate it if you could let us know if you are available to review by accepting or declining the invitation link below within 07 days.\n\nRef: ${manuscriptNumber}\nTitle: ${articleTitle}\n${articleType ? `Article Type: ${articleType}\n` : ''}${abstract ? `\nAbstract:\n${abstract}\n` : ''}\nAccept the invitation: ${acceptUrl}\nDecline the invitation: ${declineUrl}\n\nIf you accept, we would greatly appreciate it if you could submit your comments within 15 days.\n\nWe hope to hear from you soon.\n\nKind regards,\nDr. Ing. Junior Ngaba\nEditorial-In-Chief\nJournal: Journal of Agricultural and Environmental Innovation (JAEI)`,
    html: jaeiLetter(`
      <p style="margin:0 0 14px">Dear ${escHtml(salutation)},</p>
      <p style="margin:0 0 14px">We have received a manuscript for the Journal of Agricultural and Environmental Innovation (JAEI) that we think falls within your area of expertise. Our reviewers are integral to ensuring we have the highest-quality publication. We would greatly appreciate it if you could let us know if you are available to review by accepting or declining the invitation link below within <strong>07 days</strong>.</p>
      <div style="background:#F9FAFB;border:1px solid #E5E7EB;border-radius:4px;padding:12px 16px;margin:0 0 18px;font-size:13px;line-height:1.7">
        <div><strong>Ref:</strong> <span style="color:#1B4427;font-weight:700">${escHtml(manuscriptNumber)}</span></div>
        <div><strong>Title:</strong> ${escHtml(articleTitle)}</div>
        ${articleType ? `<div><strong>Article Type:</strong> ${escHtml(articleType)}</div>` : ''}
        ${abstract ? `<div style="margin-top:8px"><strong>Abstract:</strong><br/><span style="color:#4B5563">${escHtml(abstract)}</span></div>` : ''}
      </div>
      <div style="margin:0 0 20px">
        <a href="${acceptUrl}" style="display:inline-block;background:#1B4427;color:#fff;padding:11px 24px;border-radius:4px;text-decoration:none;font-weight:700;font-size:14px;margin-right:10px">Accept the invitation</a>
        <a href="${declineUrl}" style="display:inline-block;background:#fff;color:#B91C1C;border:1px solid #FECACA;padding:10px 24px;border-radius:4px;text-decoration:none;font-weight:700;font-size:14px">Decline the invitation</a>
      </div>
      <p style="margin:0 0 14px;padding:10px 14px;background:#EEF5F1;border-left:3px solid #2E9E68;border-radius:2px">
        If you accept, we would greatly appreciate it if you could submit your comments within <strong>15 days</strong>.
      </p>
      <p style="margin:0 0 18px">We hope to hear from you soon.</p>
      <p style="margin:0">Kind regards,<br/><strong>Dr. Ing. Junior Ngaba</strong><br/>Editorial-In-Chief<br/>Journal: Journal of Agricultural and Environmental Innovation (JAEI)</p>
    `),
  }),

  // ── Remarque 5 (28/07) — "Send back to the authors" avant même la revue ──
  // Le manuscrit ne respecte pas le format du journal : il est renvoyé à
  // l'auteur avec les commentaires de l'éditeur et un délai de 05 jours ouvrés.
  reviseBeforeReview: ({ salutation, articleTitle, manuscriptNumber, editorComments }) => ({
    subject: `${manuscriptNumber}-revise before review`,
    text: `Dear ${salutation},\n\nBased on the advice received, the Editor has decided that your manuscript "${articleTitle}", submitted to Journal of Agricultural and Environmental Innovation (JAEI) will be reconsidered after you have carried out the corrections as suggested. Below, please find the Editor's comments for your perusal.\n\nEditors comments:\n${editorComments || '(see the editorial office message)'}\n\nWe are looking forward to receiving your revised manuscript in 05 working days.\n\nKind regards,\nDr. Ing. Junior Ngaba\nEditorial-In-Chief\nJournal: Journal of Agricultural and Environmental Innovation (JAEI)`,
    html: jaeiLetter(`
      <p style="margin:0 0 14px">Dear ${escHtml(salutation)},</p>
      <p style="margin:0 0 14px">Based on the advice received, the Editor has decided that your manuscript "<strong>${escHtml(articleTitle)}</strong>", submitted to Journal of Agricultural and Environmental Innovation (JAEI) will be reconsidered after you have carried out the corrections as suggested. Below, please find the Editor's comments for your perusal.</p>
      <p style="margin:0 0 6px;font-weight:700">Editors comments:</p>
      <div style="background:#F9FAFB;border:1px solid #E5E7EB;border-radius:4px;padding:12px 16px;margin:0 0 18px;white-space:pre-wrap;color:#4B5563">${escHtml(editorComments || '(see the editorial office message)')}</div>
      <p style="margin:0 0 18px">We are looking forward to receiving your revised manuscript in <strong>05 working days</strong>.</p>
      <p style="margin:0">Kind regards,<br/><strong>Dr. Ing. Junior Ngaba</strong><br/>Editorial-In-Chief<br/>Journal: Journal of Agricultural and Environmental Innovation (JAEI)</p>
    `),
  }),

  // ── Remarque 8 (client) — merci au reviewer après soumission de sa review ──
  reviewerThanks: ({ salutation, articleTitle, manuscriptNumber, articleType }) => ({
    subject: `Ref: ${manuscriptNumber} - Thank you for reviewing`,
    text: `Ref: ${manuscriptNumber}\nTitle: "${articleTitle}"\nArticle Type: ${articleType || 'Original article'}\n\nDear ${salutation},\nThank you once again for reviewing the above-referenced paper.\nWe appreciate your time and effort in reviewing this paper and greatly value your assistance as a reviewer for Journal of Agricultural and Environmental Innovation.\n\nYours sincerely,\n\nDr. Ing. Junior Ngaba\nEditorial-In-Chief\nJournal: Journal of Agricultural and Environmental Innovation (JAEI)`,
    html: jaeiLetter(`
      ${refBlock(manuscriptNumber, articleTitle, articleType)}
      <p style="margin:0 0 14px">Dear ${escHtml(salutation)},</p>
      <p style="margin:0 0 14px">Thank you once again for reviewing the above-referenced paper.</p>
      <p style="margin:0 0 18px">We appreciate your time and effort in reviewing this paper and greatly value your assistance as a reviewer for Journal of Agricultural and Environmental Innovation.</p>
      <p style="margin:0">Yours sincerely,<br/><br/><strong>Dr. Ing. Junior Ngaba</strong><br/>Editorial-In-Chief<br/>Journal: Journal of Agricultural and Environmental Innovation (JAEI)</p>
    `),
  }),

  // ── Remarque 9 (client) — décision finale communiquée aux reviewers ──
  finalDecisionReviewer: ({ salutation, articleTitle, manuscriptNumber, articleType, decision }) => ({
    subject: `Ref: ${manuscriptNumber} - Final decision`,
    text: `Ref: ${manuscriptNumber}\nTitle: "${articleTitle}"\nArticle Type: ${articleType || 'Original article'}\n\nDear ${salutation},\nThank you once again for reviewing the above-referenced paper. With your help the following final decision has now been reached: ${decision}\nWe appreciate your time and effort in reviewing this paper and greatly value your assistance as a reviewer for Journal of Agricultural and Environmental Innovation.\n\nYours sincerely,\n\nDr. Ing. Junior Ngaba\nEditorial-In-Chief\nJournal: Journal of Agricultural and Environmental Innovation (JAEI)`,
    html: jaeiLetter(`
      ${refBlock(manuscriptNumber, articleTitle, articleType)}
      <p style="margin:0 0 14px">Dear ${escHtml(salutation)},</p>
      <p style="margin:0 0 14px">Thank you once again for reviewing the above-referenced paper. With your help the following final decision has now been reached: <strong style="color:#1B4427">${escHtml(decision)}</strong></p>
      <p style="margin:0 0 18px">We appreciate your time and effort in reviewing this paper and greatly value your assistance as a reviewer for Journal of Agricultural and Environmental Innovation.</p>
      <p style="margin:0">Yours sincerely,<br/><br/><strong>Dr. Ing. Junior Ngaba</strong><br/>Editorial-In-Chief<br/>Journal: Journal of Agricultural and Environmental Innovation (JAEI)</p>
    `),
  }),

  // ── Remarque 10 (client) — décision finale envoyée à l'auteur soumetteur uniquement ──
  decisionAuthor: ({ salutation, articleTitle, manuscriptNumber, authorsList, decision }) => ({
    subject: `Decision on your manuscript - Ref: ${manuscriptNumber}`,
    text: `Ref: ${manuscriptNumber}\nTitle: "${articleTitle}"\n${authorsList ? `Authors: ${authorsList}\n` : ''}\nDear ${salutation},\n\nThank you for submitting your manuscript for consideration at the Journal of Agricultural and Environmental Innovation. Based upon review by our editorial team and the reviewers, the following final decision has now been reached: ${decision}\n\nThank you for your interest in Journal of Agricultural and Environmental Innovation, and I will welcome future submissions of your research papers. I wish you the best of luck in your publication endeavors.\n\nYours sincerely,\n\nDr. Ing. Junior Ngaba\nEditorial-In-Chief\nJournal: Journal of Agricultural and Environmental Innovation (JAEI)`,
    html: jaeiLetter(`
      <div style="background:#F9FAFB;border:1px solid #E5E7EB;border-radius:4px;padding:12px 16px;margin:0 0 18px;font-size:13px;line-height:1.7">
        <div><strong>Ref:</strong> <span style="color:#1B4427;font-weight:700">${escHtml(manuscriptNumber)}</span></div>
        <div><strong>Title:</strong> "${escHtml(articleTitle)}"</div>
        ${authorsList ? `<div><strong>Authors:</strong> ${escHtml(authorsList)}</div>` : ''}
      </div>
      <p style="margin:0 0 14px">Dear ${escHtml(salutation)},</p>
      <p style="margin:0 0 14px">Thank you for submitting your manuscript for consideration at the Journal of Agricultural and Environmental Innovation. Based upon review by our editorial team and the reviewers, the following final decision has now been reached: <strong style="color:#1B4427">${escHtml(decision)}</strong></p>
      <p style="margin:0 0 18px">Thank you for your interest in Journal of Agricultural and Environmental Innovation, and I will welcome future submissions of your research papers. I wish you the best of luck in your publication endeavors.</p>
      <p style="margin:0">Yours sincerely,<br/><br/><strong>Dr. Ing. Junior Ngaba</strong><br/>Editorial-In-Chief<br/>Journal: Journal of Agricultural and Environmental Innovation (JAEI)</p>
    `),
  }),

  // Article published on the public site
  articlePublished: ({ authorName, articleTitle, articleId }) => ({
    subject: `JAEI — Your article is now published`,
    text: `Hello ${authorName},\n\nCongratulations! Your article "${articleTitle}" is now published and available online on the JAEI platform.\n\nBest regards,\nThe JAEI Editorial Team`,
    html: `
      <div style="font-family:Inter,Arial,sans-serif;max-width:600px;margin:0 auto;color:#2D2D2D">
        <div style="background:linear-gradient(135deg,#1B4427,#1E88C8);padding:24px 32px">
          <h1 style="color:#fff;margin:0;font-size:20px">JAEI</h1>
          <p style="color:rgba(255,255,255,0.7);margin:4px 0 0;font-size:13px">Journal of Agricultural and Environmental Innovation</p>
        </div>
        <div style="padding:32px">
          <h2 style="color:#1B4427;font-size:18px">🎉 Your article is now published!</h2>
          <p>Hello <strong>${escHtml(authorName)}</strong>,</p>
          <p>Congratulations! Your article is now published and freely accessible to the global scientific community.</p>
          <div style="background:#F0FDF4;border:1px solid #BBF7D0;border-radius:4px;padding:16px;margin:16px 0">
            <p style="margin:0;font-weight:600;color:#15803D">${escHtml(articleTitle)}</p>
            <p style="margin:4px 0 0;font-size:13px;color:#6B7280">Status: Published • Open access</p>
          </div>
          <div style="margin:24px 0">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/articles/${articleId}"
               style="background:#1B4427;color:#fff;padding:12px 24px;border-radius:4px;text-decoration:none;font-weight:600;font-size:14px">
              View my published article
            </a>
          </div>
          <p style="color:#6B7280;font-size:12px;margin-top:32px;border-top:1px solid #F3F4F6;padding-top:16px">
            © ${new Date().getFullYear()} JAEI — Journal of Agricultural and Environmental Innovation
          </p>
        </div>
      </div>
    `,
  }),

  // Editorial decision (after review)
  reviewCompleted: ({ authorName, articleTitle, recommendation, comments }) => {
    const LABELS = {
      accept:         { label: 'Accepted for publication',  color: '#15803D', bg: '#F0FDF4', border: '#BBF7D0' },
      minor_revision: { label: 'Minor revisions required',  color: '#92400E', bg: '#FFFBEB', border: '#FDE68A' },
      major_revision: { label: 'Major revisions required',  color: '#6D28D9', bg: '#F5F3FF', border: '#DDD6FE' },
      reject:         { label: 'Not accepted',              color: '#B91C1C', bg: '#FEF2F2', border: '#FECACA' },
    };
    const cfg = LABELS[recommendation] || LABELS.minor_revision;

    return {
      subject: `JAEI — Editorial Decision`,
      text: `Hello ${authorName},\n\nA decision has been made regarding your article "${articleTitle}": ${cfg.label}.\n\nComments: ${comments}\n\nBest regards,\nThe JAEI Editorial Team`,
      html: `
        <div style="font-family:Inter,Arial,sans-serif;max-width:600px;margin:0 auto;color:#2D2D2D">
          <div style="background:linear-gradient(135deg,#1B4427,#1E88C8);padding:24px 32px">
            <h1 style="color:#fff;margin:0;font-size:20px">JAEI</h1>
            <p style="color:rgba(255,255,255,0.7);margin:4px 0 0;font-size:13px">Journal of Agricultural and Environmental Innovation</p>
          </div>
          <div style="padding:32px">
            <h2 style="color:#1B4427;font-size:18px">Editorial Decision</h2>
            <p>Hello <strong>${escHtml(authorName)}</strong>,</p>
            <p>The editorial board has made a decision regarding your article:</p>
            <div style="background:#F9FAFB;border:1px solid #E5E7EB;border-radius:4px;padding:16px;margin:16px 0">
              <p style="margin:0;font-weight:600;color:#374151">${escHtml(articleTitle)}</p>
              <span style="display:inline-block;margin-top:8px;padding:4px 10px;border-radius:4px;font-size:13px;font-weight:600;background:${cfg.bg};color:${cfg.color};border:1px solid ${cfg.border}">
                ${cfg.label}
              </span>
            </div>
            ${comments ? `
            <div style="margin:16px 0">
              <p style="font-weight:600;color:#374151;margin-bottom:8px">Reviewer comments:</p>
              <p style="background:#F9FAFB;padding:12px;border-radius:4px;font-size:13px;line-height:1.6;color:#4B5563;border-left:3px solid ${cfg.color}">${escHtml(comments)}</p>
            </div>` : ''}
            <div style="margin:24px 0">
              <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/author/dashboard"
                 style="background:#1E88C8;color:#fff;padding:12px 24px;border-radius:4px;text-decoration:none;font-weight:600;font-size:14px">
                View my dashboard
              </a>
            </div>
            <p style="color:#6B7280;font-size:12px;margin-top:32px;border-top:1px solid #F3F4F6;padding-top:16px">
              © ${new Date().getFullYear()} JAEI — Journal of Agricultural and Environmental Innovation
            </p>
          </div>
        </div>
      `,
    };
  },

  // Admin alert — new submission received
  newSubmissionAlert: ({ adminEmail, authorName, articleTitle, submissionId }) => ({
    subject: `JAEI — New submission received`,
    text: `New submission received from ${authorName}: "${articleTitle}". Log in to the admin dashboard to process it.`,
    html: `
      <div style="font-family:Inter,Arial,sans-serif;max-width:600px;margin:0 auto;color:#2D2D2D">
        <div style="background:linear-gradient(135deg,#1B4427,#1E88C8);padding:24px 32px">
          <h1 style="color:#fff;margin:0;font-size:20px">JAEI</h1>
          <p style="color:rgba(255,255,255,0.7);margin:4px 0 0;font-size:13px">Journal of Agricultural and Environmental Innovation</p>
        </div>
        <div style="padding:32px">
          <h2 style="color:#1B4427;font-size:18px">📥 New submission received</h2>
          <p>A new submission has been registered on the platform:</p>
          <div style="background:#EFF6FF;border:1px solid #BFDBFE;border-radius:4px;padding:16px;margin:16px 0">
            <p style="margin:0;font-weight:600;color:#1D4ED8">${escHtml(articleTitle)}</p>
            <p style="margin:4px 0 0;font-size:13px;color:#6B7280">Author: ${escHtml(authorName)}</p>
          </div>
          <div style="margin:24px 0">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/admin/submissions/${submissionId}"
               style="background:#1B4427;color:#fff;padding:12px 24px;border-radius:4px;text-decoration:none;font-weight:600;font-size:14px">
              Process submission
            </a>
          </div>
          <p style="color:#6B7280;font-size:12px;margin-top:32px;border-top:1px solid #F3F4F6;padding-top:16px">
            © ${new Date().getFullYear()} JAEI — Journal of Agricultural and Environmental Innovation
          </p>
        </div>
      </div>
    `,
  }),

  // Author notification — status change by admin
  statusChanged: ({ authorName, articleTitle, status, editorComment }) => {
    const STATUS_INFO = {
      under_review:    { label: 'Under review',             color: '#1D4ED8', bg: '#EFF6FF', border: '#BFDBFE', msg: 'Your article is now under review by our scientific committee.' },
      accepted:        { label: 'Accepted for publication', color: '#15803D', bg: '#F0FDF4', border: '#BBF7D0', msg: 'Congratulations! Your article has been accepted for publication in JAEI.' },
      rejected:        { label: 'Not accepted',             color: '#B91C1C', bg: '#FEF2F2', border: '#FECACA', msg: 'After review by our editorial board, your article has not been accepted for publication in this issue.' },
      revision_needed: { label: 'Revisions required',       color: '#D97706', bg: '#FEF3C7', border: '#FDE68A', msg: 'The editorial board has reviewed your article and is requesting revisions before making a final decision.' },
      revised:         { label: 'Revision received',        color: '#6D28D9', bg: '#F5F3FF', border: '#DDD6FE', msg: 'Your revised article has been received and will be reviewed shortly.' },
      published:       { label: 'Published',                color: '#1E88C8', bg: '#EFF6FF', border: '#BFDBFE', msg: 'Your article is now published and freely accessible.' },
    };
    const info = STATUS_INFO[status] || { label: status, color: '#374151', bg: '#F9FAFB', border: '#E5E7EB', msg: 'The status of your article has been updated.' };

    return {
      subject: `JAEI — Your submission has been updated`,
      text: `Hello ${authorName},\n\nThe status of your article "${articleTitle}" has been updated: ${info.label}.\n\n${info.msg}\n\nBest regards,\nThe JAEI Editorial Team`,
      html: `
        <div style="font-family:Inter,Arial,sans-serif;max-width:600px;margin:0 auto;color:#2D2D2D">
          <div style="background:linear-gradient(135deg,#1B4427,#1E88C8);padding:24px 32px">
            <h1 style="color:#fff;margin:0;font-size:20px">JAEI</h1>
            <p style="color:rgba(255,255,255,0.7);margin:4px 0 0;font-size:13px">Journal of Agricultural and Environmental Innovation</p>
          </div>
          <div style="padding:32px">
            <h2 style="color:#1B4427;font-size:18px">Your submission has been updated</h2>
            <p>Hello <strong>${escHtml(authorName)}</strong>,</p>
            <p>${info.msg}</p>
            <div style="background:${info.bg};border:1px solid ${info.border};border-radius:4px;padding:16px;margin:16px 0">
              <p style="margin:0;font-weight:600;color:#374151">${escHtml(articleTitle)}</p>
              <span style="display:inline-block;margin-top:8px;padding:4px 10px;border-radius:4px;font-size:13px;font-weight:600;background:${info.bg};color:${info.color};border:1px solid ${info.border}">
                ${info.label}
              </span>
            </div>
            ${editorComment ? `
            <div style="margin:16px 0">
              <p style="font-weight:600;color:#374151;margin-bottom:8px">Message from the Editor-in-Chief:</p>
              <p style="background:#F9FAFB;padding:12px;border-radius:4px;font-size:13px;line-height:1.6;color:#4B5563;border-left:3px solid ${info.color}">${escHtml(editorComment)}</p>
            </div>` : ''}
            <div style="margin:24px 0">
              <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/author/dashboard"
                 style="background:#1E88C8;color:#fff;padding:12px 24px;border-radius:4px;text-decoration:none;font-weight:600;font-size:14px">
                View my dashboard
              </a>
            </div>
            <p style="color:#6B7280;font-size:12px;margin-top:32px;border-top:1px solid #F3F4F6;padding-top:16px">
              © ${new Date().getFullYear()} JAEI — Journal of Agricultural and Environmental Innovation
            </p>
          </div>
        </div>
      `,
    };
  },

  // Admin alert — review submitted by a reviewer
  reviewSubmittedAlert: ({ articleTitle, reviewerName, recommendation }) => {
    const REC_LABELS = {
      accept: 'Accepted',
      minor_revision: 'Minor revisions',
      major_revision: 'Major revisions',
      reject: 'Rejected',
    };
    const safeRec = REC_LABELS[recommendation] || 'Unknown';
    return {
      subject: `JAEI — Review received`,
      text: `Reviewer ${reviewerName} has just submitted their evaluation for "${articleTitle}". Recommendation: ${safeRec}.`,
      html: `
        <div style="font-family:Inter,Arial,sans-serif;max-width:600px;margin:0 auto;color:#2D2D2D">
          <div style="background:linear-gradient(135deg,#1B4427,#1E88C8);padding:24px 32px">
            <h1 style="color:#fff;margin:0;font-size:20px">JAEI</h1>
            <p style="color:rgba(255,255,255,0.7);margin:4px 0 0;font-size:13px">Journal of Agricultural and Environmental Innovation</p>
          </div>
          <div style="padding:32px">
            <h2 style="color:#1B4427;font-size:18px">📋 Review received</h2>
            <p>Reviewer <strong>${escHtml(reviewerName)}</strong> has submitted their evaluation report.</p>
            <div style="background:#F9FAFB;border:1px solid #E5E7EB;border-radius:4px;padding:16px;margin:16px 0">
              <p style="margin:0;font-weight:600;color:#374151">${escHtml(articleTitle)}</p>
              <p style="margin:6px 0 0;font-size:13px;color:#6B7280">
                Recommendation: <strong>${safeRec}</strong>
              </p>
            </div>
            <div style="margin:24px 0">
              <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/admin/submissions"
                 style="background:#1B4427;color:#fff;padding:12px 24px;border-radius:4px;text-decoration:none;font-weight:600;font-size:14px">
                View submissions
              </a>
            </div>
            <p style="color:#6B7280;font-size:12px;margin-top:32px;border-top:1px solid #F3F4F6;padding-top:16px">
              © ${new Date().getFullYear()} JAEI — Journal of Agricultural and Environmental Innovation
            </p>
          </div>
        </div>
      `,
    };
  },

  // Paiement confirmé — envoyé à l'AUTEUR après un paiement réussi
  paymentConfirmedAuthor: ({ authorName, articleTitle, amount }) => {
    const amt = Number(amount || 0).toLocaleString('fr-FR');
    return {
      subject: 'JAEI — Payment received, your article is in the editorial queue',
      text: `Hello ${authorName},\n\nWe confirm receipt of your Article Processing Charge of ${amt} FCFA for "${articleTitle}".\n\nYour article now enters the editorial review process. You will be notified by email at each step.\n\nBest regards,\nThe JAEI Editorial Team`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#2D2D2D">
          <div style="background:linear-gradient(135deg,#1B4427,#1E88C8);padding:24px 32px">
            <h1 style="color:#fff;margin:0;font-size:20px">JAEI</h1>
            <p style="color:rgba(255,255,255,0.7);margin:4px 0 0;font-size:13px">Journal of Agricultural and Environmental Innovation</p>
          </div>
          <div style="padding:32px">
            <h2 style="color:#1B4427;font-size:18px">✅ Payment received</h2>
            <p>Hello <strong>${escHtml(authorName)}</strong>,</p>
            <p>We confirm receipt of your <strong>Article Processing Charge</strong>. Your article now enters the editorial review process.</p>
            <div style="background:#F0FDF4;border:1px solid #BBF7D0;border-radius:4px;padding:16px;margin:16px 0">
              <p style="margin:0;font-weight:600;color:#15803D">${escHtml(articleTitle)}</p>
              <p style="margin:6px 0 0;font-size:14px;color:#374151">Amount paid: <strong>${amt} FCFA</strong></p>
              <p style="margin:4px 0 0;font-size:13px;color:#6B7280">Status: In editorial queue</p>
            </div>
            <p>You will be notified by email at each step of the review process.</p>
            <div style="margin:24px 0">
              <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/author/dashboard"
                 style="background:#1E88C8;color:#fff;padding:12px 24px;border-radius:4px;text-decoration:none;font-weight:600;font-size:14px">
                View my dashboard
              </a>
            </div>
            <p style="color:#6B7280;font-size:12px;margin-top:32px;border-top:1px solid #F3F4F6;padding-top:16px">
              © ${new Date().getFullYear()} JAEI — Journal of Agricultural and Environmental Innovation
            </p>
          </div>
        </div>
      `,
    };
  },

  // Alerte ADMIN — un paiement vient d'être reçu
  paymentReceivedAdmin: ({ authorName, articleTitle, amount }) => {
    const amt = Number(amount || 0).toLocaleString('fr-FR');
    return {
      subject: 'JAEI — Payment received',
      text: `A payment of ${amt} FCFA has been received from ${authorName} for "${articleTitle}". The submission is now in the editorial queue.`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#2D2D2D">
          <div style="background:linear-gradient(135deg,#1B4427,#1E88C8);padding:24px 32px">
            <h1 style="color:#fff;margin:0;font-size:20px">JAEI</h1>
            <p style="color:rgba(255,255,255,0.7);margin:4px 0 0;font-size:13px">Journal of Agricultural and Environmental Innovation</p>
          </div>
          <div style="padding:32px">
            <h2 style="color:#1B4427;font-size:18px">💳 Payment received</h2>
            <p>A submission fee has just been paid:</p>
            <div style="background:#EFF6FF;border:1px solid #BFDBFE;border-radius:4px;padding:16px;margin:16px 0">
              <p style="margin:0;font-weight:600;color:#1D4ED8">${escHtml(articleTitle)}</p>
              <p style="margin:6px 0 0;font-size:13px;color:#6B7280">Author: ${escHtml(authorName)}</p>
              <p style="margin:4px 0 0;font-size:14px;color:#374151">Amount: <strong>${amt} FCFA</strong></p>
            </div>
            <p>The submission is now in the editorial queue.</p>
            <div style="margin:24px 0">
              <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/admin/submissions"
                 style="background:#1B4427;color:#fff;padding:12px 24px;border-radius:4px;text-decoration:none;font-weight:600;font-size:14px">
                View submissions
              </a>
            </div>
            <p style="color:#6B7280;font-size:12px;margin-top:32px;border-top:1px solid #F3F4F6;padding-top:16px">
              © ${new Date().getFullYear()} JAEI — Journal of Agricultural and Environmental Innovation
            </p>
          </div>
        </div>
      `,
    };
  },
};

module.exports = { sendEmail, EMAIL_TEMPLATES, escHtml };
