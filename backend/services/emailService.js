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
  submissionReceived: ({ authorName, articleTitle }) => ({
    subject: `JAEI — Submission received`,
    text: `Hello ${authorName},\n\nYour article "${articleTitle}" has been successfully submitted. We will notify you as soon as a decision is made.\n\nBest regards,\nThe JAEI Editorial Team`,
    html: `
      <div style="font-family:Inter,Arial,sans-serif;max-width:600px;margin:0 auto;color:#2D2D2D">
        <div style="background:linear-gradient(135deg,#1B4427,#1E88C8);padding:24px 32px">
          <h1 style="color:#fff;margin:0;font-size:20px">JAEI</h1>
          <p style="color:rgba(255,255,255,0.7);margin:4px 0 0;font-size:13px">Journal of Agricultural and Environmental Innovation</p>
        </div>
        <div style="padding:32px">
          <h2 style="color:#1B4427;font-size:18px">Submission received</h2>
          <p>Hello <strong>${escHtml(authorName)}</strong>,</p>
          <p>Your article has been received and is currently under examination.</p>
          <div style="background:#F0FDF4;border:1px solid #BBF7D0;border-radius:4px;padding:16px;margin:16px 0">
            <p style="margin:0;font-weight:600;color:#15803D">${escHtml(articleTitle)}</p>
            <p style="margin:4px 0 0;font-size:13px;color:#6B7280">Status: Pending review</p>
          </div>
          <p>You will be notified by email at each step of the editorial process.</p>
          <p style="color:#6B7280;font-size:12px;margin-top:32px;border-top:1px solid #F3F4F6;padding-top:16px">
            © ${new Date().getFullYear()} JAEI — Journal of Agricultural and Environmental Innovation
          </p>
        </div>
      </div>
    `,
  }),

  // Article assignment to a reviewer
  reviewAssigned: ({ reviewerName, articleTitle }) => ({
    subject: `JAEI — New article to review`,
    text: `Hello ${reviewerName},\n\nAn article has been assigned to you for review: "${articleTitle}".\n\nPlease log in to your space to view the article and submit your evaluation.\n\nBest regards,\nThe JAEI Editorial Team`,
    html: `
      <div style="font-family:Inter,Arial,sans-serif;max-width:600px;margin:0 auto;color:#2D2D2D">
        <div style="background:linear-gradient(135deg,#1B4427,#1E88C8);padding:24px 32px">
          <h1 style="color:#fff;margin:0;font-size:20px">JAEI</h1>
          <p style="color:rgba(255,255,255,0.7);margin:4px 0 0;font-size:13px">Journal of Agricultural and Environmental Innovation</p>
        </div>
        <div style="padding:32px">
          <h2 style="color:#1B4427;font-size:18px">New article to review</h2>
          <p>Hello <strong>${escHtml(reviewerName)}</strong>,</p>
          <p>An article has been assigned to you for review by the editorial board:</p>
          <div style="background:#EFF6FF;border:1px solid #BFDBFE;border-radius:4px;padding:16px;margin:16px 0">
            <p style="margin:0;font-weight:600;color:#1D4ED8">${escHtml(articleTitle)}</p>
          </div>
          <p>Please log in to your reviewer space to view the article and submit your evaluation within the allotted time.</p>
          <div style="margin:24px 0">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/reviewer/dashboard"
               style="background:#1E88C8;color:#fff;padding:12px 24px;border-radius:4px;text-decoration:none;font-weight:600;font-size:14px">
              Access my space
            </a>
          </div>
          <p style="color:#6B7280;font-size:12px;margin-top:32px;border-top:1px solid #F3F4F6;padding-top:16px">
            © ${new Date().getFullYear()} JAEI — Journal of Agricultural and Environmental Innovation
          </p>
        </div>
      </div>
    `,
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
};

module.exports = { sendEmail, EMAIL_TEMPLATES, escHtml };
