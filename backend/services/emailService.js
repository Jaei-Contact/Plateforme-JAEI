const nodemailer = require('nodemailer');

// ============================================================
// JAEI — Email Service (Nodemailer)
// Uses SMTP configured in .env
// In dev: Ethereal (fake SMTP, emails visible on ethereal.email)
// In prod: replace with real SMTP (Gmail, SendGrid, Mailtrap…)
// ============================================================

// ── Transporter ─────────────────────────────────────────────

const createTransporter = () => {
  // If SMTP variables are defined, use them
  if (process.env.SMTP_HOST) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  // Otherwise: development mode — simulate sending (console log)
  return null;
};

// ── Fonction d'envoi ─────────────────────────────────────────

const sendEmail = async ({ to, subject, html, text, from }) => {
  const transporter = createTransporter();

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
  emailVerification: ({ userName, verificationLink }) => ({
    from: '"JAEI — No Reply" <contact@jaei-journal.org>',
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
              Hi ${userName},
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

  // Welcome after registration
  welcome: ({ userName, role }) => ({
    subject: 'Welcome to JAEI — Your account has been created',
    text: `Hello ${userName},\n\nYour ${role} account has been successfully created on the JAEI platform.\n\nBest regards,\nThe JAEI Team`,
    html: `
      <div style="font-family:Inter,Arial,sans-serif;max-width:600px;margin:0 auto;color:#2D2D2D">
        <div style="background:linear-gradient(135deg,#1B4427,#1E88C8);padding:24px 32px">
          <h1 style="color:#fff;margin:0;font-size:20px">JAEI</h1>
          <p style="color:rgba(255,255,255,0.7);margin:4px 0 0;font-size:13px">Journal of Agricultural and Environmental Innovation</p>
        </div>
        <div style="padding:32px">
          <h2 style="color:#1B4427;font-size:18px">Welcome, ${userName}!</h2>
          <p>Your <strong>${role}</strong> account has been successfully created on the JAEI platform.</p>
          <p>You can now log in and access your personal space.</p>
          <div style="margin:24px 0">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/login"
               style="background:#1E88C8;color:#fff;padding:12px 24px;border-radius:4px;text-decoration:none;font-weight:600;font-size:14px">
              Log in
            </a>
          </div>
          <p style="color:#6B7280;font-size:12px;margin-top:32px;border-top:1px solid #F3F4F6;padding-top:16px">
            © ${new Date().getFullYear()} JAEI — Journal of Agricultural and Environmental Innovation
          </p>
        </div>
      </div>
    `,
  }),

  // Article submission confirmation
  submissionReceived: ({ authorName, articleTitle }) => ({
    subject: `JAEI — Submission received: "${articleTitle}"`,
    text: `Hello ${authorName},\n\nYour article "${articleTitle}" has been successfully submitted. We will notify you as soon as a decision is made.\n\nBest regards,\nThe JAEI Editorial Team`,
    html: `
      <div style="font-family:Inter,Arial,sans-serif;max-width:600px;margin:0 auto;color:#2D2D2D">
        <div style="background:linear-gradient(135deg,#1B4427,#1E88C8);padding:24px 32px">
          <h1 style="color:#fff;margin:0;font-size:20px">JAEI</h1>
          <p style="color:rgba(255,255,255,0.7);margin:4px 0 0;font-size:13px">Journal of Agricultural and Environmental Innovation</p>
        </div>
        <div style="padding:32px">
          <h2 style="color:#1B4427;font-size:18px">Submission received</h2>
          <p>Hello <strong>${authorName}</strong>,</p>
          <p>Your article has been received and is currently under examination.</p>
          <div style="background:#F0FDF4;border:1px solid #BBF7D0;border-radius:4px;padding:16px;margin:16px 0">
            <p style="margin:0;font-weight:600;color:#15803D">${articleTitle}</p>
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
    subject: `JAEI — New article to review: "${articleTitle}"`,
    text: `Hello ${reviewerName},\n\nAn article has been assigned to you for review: "${articleTitle}".\n\nPlease log in to your space to view the article and submit your evaluation.\n\nBest regards,\nThe JAEI Editorial Team`,
    html: `
      <div style="font-family:Inter,Arial,sans-serif;max-width:600px;margin:0 auto;color:#2D2D2D">
        <div style="background:linear-gradient(135deg,#1B4427,#1E88C8);padding:24px 32px">
          <h1 style="color:#fff;margin:0;font-size:20px">JAEI</h1>
          <p style="color:rgba(255,255,255,0.7);margin:4px 0 0;font-size:13px">Journal of Agricultural and Environmental Innovation</p>
        </div>
        <div style="padding:32px">
          <h2 style="color:#1B4427;font-size:18px">New article to review</h2>
          <p>Hello <strong>${reviewerName}</strong>,</p>
          <p>An article has been assigned to you for review by the editorial board:</p>
          <div style="background:#EFF6FF;border:1px solid #BFDBFE;border-radius:4px;padding:16px;margin:16px 0">
            <p style="margin:0;font-weight:600;color:#1D4ED8">${articleTitle}</p>
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
    subject: `JAEI — Your article is now published: "${articleTitle}"`,
    text: `Hello ${authorName},\n\nCongratulations! Your article "${articleTitle}" is now published and available online on the JAEI platform.\n\nBest regards,\nThe JAEI Editorial Team`,
    html: `
      <div style="font-family:Inter,Arial,sans-serif;max-width:600px;margin:0 auto;color:#2D2D2D">
        <div style="background:linear-gradient(135deg,#1B4427,#1E88C8);padding:24px 32px">
          <h1 style="color:#fff;margin:0;font-size:20px">JAEI</h1>
          <p style="color:rgba(255,255,255,0.7);margin:4px 0 0;font-size:13px">Journal of Agricultural and Environmental Innovation</p>
        </div>
        <div style="padding:32px">
          <h2 style="color:#1B4427;font-size:18px">🎉 Your article is now published!</h2>
          <p>Hello <strong>${authorName}</strong>,</p>
          <p>Congratulations! Your article is now published and freely accessible to the global scientific community.</p>
          <div style="background:#F0FDF4;border:1px solid #BBF7D0;border-radius:4px;padding:16px;margin:16px 0">
            <p style="margin:0;font-weight:600;color:#15803D">${articleTitle}</p>
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
      subject: `JAEI — Editorial Decision: "${articleTitle}"`,
      text: `Hello ${authorName},\n\nA decision has been made regarding your article "${articleTitle}": ${cfg.label}.\n\nComments: ${comments}\n\nBest regards,\nThe JAEI Editorial Team`,
      html: `
        <div style="font-family:Inter,Arial,sans-serif;max-width:600px;margin:0 auto;color:#2D2D2D">
          <div style="background:linear-gradient(135deg,#1B4427,#1E88C8);padding:24px 32px">
            <h1 style="color:#fff;margin:0;font-size:20px">JAEI</h1>
            <p style="color:rgba(255,255,255,0.7);margin:4px 0 0;font-size:13px">Journal of Agricultural and Environmental Innovation</p>
          </div>
          <div style="padding:32px">
            <h2 style="color:#1B4427;font-size:18px">Editorial Decision</h2>
            <p>Hello <strong>${authorName}</strong>,</p>
            <p>The editorial board has made a decision regarding your article:</p>
            <div style="background:#F9FAFB;border:1px solid #E5E7EB;border-radius:4px;padding:16px;margin:16px 0">
              <p style="margin:0;font-weight:600;color:#374151">${articleTitle}</p>
              <span style="display:inline-block;margin-top:8px;padding:4px 10px;border-radius:4px;font-size:13px;font-weight:600;background:${cfg.bg};color:${cfg.color};border:1px solid ${cfg.border}">
                ${cfg.label}
              </span>
            </div>
            ${comments ? `
            <div style="margin:16px 0">
              <p style="font-weight:600;color:#374151;margin-bottom:8px">Reviewer comments:</p>
              <p style="background:#F9FAFB;padding:12px;border-radius:4px;font-size:13px;line-height:1.6;color:#4B5563;border-left:3px solid ${cfg.color}">${comments}</p>
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
    subject: `JAEI — New submission: "${articleTitle}"`,
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
            <p style="margin:0;font-weight:600;color:#1D4ED8">${articleTitle}</p>
            <p style="margin:4px 0 0;font-size:13px;color:#6B7280">Author: ${authorName}</p>
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
      subject: `JAEI — Your submission has been updated: "${articleTitle}"`,
      text: `Hello ${authorName},\n\nThe status of your article "${articleTitle}" has been updated: ${info.label}.\n\n${info.msg}\n\nBest regards,\nThe JAEI Editorial Team`,
      html: `
        <div style="font-family:Inter,Arial,sans-serif;max-width:600px;margin:0 auto;color:#2D2D2D">
          <div style="background:linear-gradient(135deg,#1B4427,#1E88C8);padding:24px 32px">
            <h1 style="color:#fff;margin:0;font-size:20px">JAEI</h1>
            <p style="color:rgba(255,255,255,0.7);margin:4px 0 0;font-size:13px">Journal of Agricultural and Environmental Innovation</p>
          </div>
          <div style="padding:32px">
            <h2 style="color:#1B4427;font-size:18px">Your submission has been updated</h2>
            <p>Hello <strong>${authorName}</strong>,</p>
            <p>${info.msg}</p>
            <div style="background:${info.bg};border:1px solid ${info.border};border-radius:4px;padding:16px;margin:16px 0">
              <p style="margin:0;font-weight:600;color:#374151">${articleTitle}</p>
              <span style="display:inline-block;margin-top:8px;padding:4px 10px;border-radius:4px;font-size:13px;font-weight:600;background:${info.bg};color:${info.color};border:1px solid ${info.border}">
                ${info.label}
              </span>
            </div>
            ${editorComment ? `
            <div style="margin:16px 0">
              <p style="font-weight:600;color:#374151;margin-bottom:8px">Message from the Editor-in-Chief:</p>
              <p style="background:#F9FAFB;padding:12px;border-radius:4px;font-size:13px;line-height:1.6;color:#4B5563;border-left:3px solid ${info.color}">${editorComment}</p>
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
    return {
      subject: `JAEI — Review received: "${articleTitle}"`,
      text: `Reviewer ${reviewerName} has just submitted their evaluation for "${articleTitle}". Recommendation: ${REC_LABELS[recommendation] || recommendation}.`,
      html: `
        <div style="font-family:Inter,Arial,sans-serif;max-width:600px;margin:0 auto;color:#2D2D2D">
          <div style="background:linear-gradient(135deg,#1B4427,#1E88C8);padding:24px 32px">
            <h1 style="color:#fff;margin:0;font-size:20px">JAEI</h1>
            <p style="color:rgba(255,255,255,0.7);margin:4px 0 0;font-size:13px">Journal of Agricultural and Environmental Innovation</p>
          </div>
          <div style="padding:32px">
            <h2 style="color:#1B4427;font-size:18px">📋 Review received</h2>
            <p>Reviewer <strong>${reviewerName}</strong> has submitted their evaluation report.</p>
            <div style="background:#F9FAFB;border:1px solid #E5E7EB;border-radius:4px;padding:16px;margin:16px 0">
              <p style="margin:0;font-weight:600;color:#374151">${articleTitle}</p>
              <p style="margin:6px 0 0;font-size:13px;color:#6B7280">
                Recommendation: <strong>${REC_LABELS[recommendation] || recommendation}</strong>
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

module.exports = { sendEmail, EMAIL_TEMPLATES };
