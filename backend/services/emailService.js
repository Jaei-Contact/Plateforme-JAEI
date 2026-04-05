const nodemailer = require('nodemailer');

// ============================================================
// JAEI — Service Email (Nodemailer)
// Utilise SMTP configuré dans .env
// En dev : Ethereal (faux SMTP, emails visibles sur ethereal.email)
// En prod : remplacer par SMTP réel (Gmail, SendGrid, Mailtrap…)
// ============================================================

// ── Transporter ─────────────────────────────────────────────

const createTransporter = () => {
  // Si les variables SMTP sont définies, on les utilise
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

  // Sinon : mode développement — on simule l'envoi (log console)
  return null;
};

// ── Fonction d'envoi ─────────────────────────────────────────

const sendEmail = async ({ to, subject, html, text }) => {
  const transporter = createTransporter();

  // Mode dev sans SMTP : on log dans la console
  if (!transporter) {
    console.log('\n📧 [EMAIL SIMULÉ]');
    console.log(`  À       : ${to}`);
    console.log(`  Objet   : ${subject}`);
    console.log(`  Contenu : ${text || '(html)'}`);
    console.log('─'.repeat(50));
    return { simulated: true };
  }

  try {
    const info = await transporter.sendMail({
      from: `"JAEI — Journal of Agricultural and Environmental Innovation" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
      to,
      subject,
      html,
      text,
    });
    console.log(`📧 Email envoyé à ${to} — Message ID: ${info.messageId}`);
    return info;
  } catch (err) {
    // L'email ne bloque jamais les opérations métier
    console.error(`⚠️  Échec envoi email à ${to} :`, err.message);
    return null;
  }
};

// ── Templates ────────────────────────────────────────────────

const EMAIL_TEMPLATES = {

  // Bienvenue après inscription
  welcome: ({ userName, role }) => ({
    subject: 'Bienvenue sur JAEI — Votre compte a été créé',
    text: `Bonjour ${userName},\n\nVotre compte ${role} a été créé avec succès sur la plateforme JAEI.\n\nCordialement,\nL'équipe JAEI`,
    html: `
      <div style="font-family:Inter,Arial,sans-serif;max-width:600px;margin:0 auto;color:#2D2D2D">
        <div style="background:linear-gradient(135deg,#1B4427,#1E88C8);padding:24px 32px">
          <h1 style="color:#fff;margin:0;font-size:20px">JAEI</h1>
          <p style="color:rgba(255,255,255,0.7);margin:4px 0 0;font-size:13px">Journal of Agricultural and Environmental Innovation</p>
        </div>
        <div style="padding:32px">
          <h2 style="color:#1B4427;font-size:18px">Bienvenue, ${userName} !</h2>
          <p>Votre compte <strong>${role}</strong> a été créé avec succès sur la plateforme JAEI.</p>
          <p>Vous pouvez désormais vous connecter et accéder à votre espace personnel.</p>
          <div style="margin:24px 0">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/login"
               style="background:#1E88C8;color:#fff;padding:12px 24px;border-radius:4px;text-decoration:none;font-weight:600;font-size:14px">
              Se connecter
            </a>
          </div>
          <p style="color:#6B7280;font-size:12px;margin-top:32px;border-top:1px solid #F3F4F6;padding-top:16px">
            © ${new Date().getFullYear()} JAEI — Journal of Agricultural and Environmental Innovation
          </p>
        </div>
      </div>
    `,
  }),

  // Confirmation de soumission d'article
  submissionReceived: ({ authorName, articleTitle }) => ({
    subject: `JAEI — Soumission reçue : "${articleTitle}"`,
    text: `Bonjour ${authorName},\n\nVotre article "${articleTitle}" a été soumis avec succès. Nous vous informerons dès qu'une décision sera prise.\n\nCordialement,\nL'équipe éditoriale JAEI`,
    html: `
      <div style="font-family:Inter,Arial,sans-serif;max-width:600px;margin:0 auto;color:#2D2D2D">
        <div style="background:linear-gradient(135deg,#1B4427,#1E88C8);padding:24px 32px">
          <h1 style="color:#fff;margin:0;font-size:20px">JAEI</h1>
          <p style="color:rgba(255,255,255,0.7);margin:4px 0 0;font-size:13px">Journal of Agricultural and Environmental Innovation</p>
        </div>
        <div style="padding:32px">
          <h2 style="color:#1B4427;font-size:18px">Soumission reçue</h2>
          <p>Bonjour <strong>${authorName}</strong>,</p>
          <p>Votre article a bien été reçu et est en cours d'examen.</p>
          <div style="background:#F0FDF4;border:1px solid #BBF7D0;border-radius:4px;padding:16px;margin:16px 0">
            <p style="margin:0;font-weight:600;color:#15803D">${articleTitle}</p>
            <p style="margin:4px 0 0;font-size:13px;color:#6B7280">Statut : En attente d'évaluation</p>
          </div>
          <p>Vous serez notifié(e) par email à chaque étape du processus éditorial.</p>
          <p style="color:#6B7280;font-size:12px;margin-top:32px;border-top:1px solid #F3F4F6;padding-top:16px">
            © ${new Date().getFullYear()} JAEI — Journal of Agricultural and Environmental Innovation
          </p>
        </div>
      </div>
    `,
  }),

  // Assignation d'un article à un reviewer
  reviewAssigned: ({ reviewerName, articleTitle }) => ({
    subject: `JAEI — Nouvel article à évaluer : "${articleTitle}"`,
    text: `Bonjour ${reviewerName},\n\nUn article vous a été assigné pour évaluation : "${articleTitle}".\n\nConnectez-vous à votre espace pour consulter l'article et soumettre votre évaluation.\n\nCordialement,\nL'équipe éditoriale JAEI`,
    html: `
      <div style="font-family:Inter,Arial,sans-serif;max-width:600px;margin:0 auto;color:#2D2D2D">
        <div style="background:linear-gradient(135deg,#1B4427,#1E88C8);padding:24px 32px">
          <h1 style="color:#fff;margin:0;font-size:20px">JAEI</h1>
          <p style="color:rgba(255,255,255,0.7);margin:4px 0 0;font-size:13px">Journal of Agricultural and Environmental Innovation</p>
        </div>
        <div style="padding:32px">
          <h2 style="color:#1B4427;font-size:18px">Nouvel article à évaluer</h2>
          <p>Bonjour <strong>${reviewerName}</strong>,</p>
          <p>Un article vous a été assigné pour évaluation par le comité éditorial :</p>
          <div style="background:#EFF6FF;border:1px solid #BFDBFE;border-radius:4px;padding:16px;margin:16px 0">
            <p style="margin:0;font-weight:600;color:#1D4ED8">${articleTitle}</p>
          </div>
          <p>Merci de vous connecter à votre espace évaluateur pour consulter l'article et soumettre votre évaluation dans les délais impartis.</p>
          <div style="margin:24px 0">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/reviewer/dashboard"
               style="background:#1E88C8;color:#fff;padding:12px 24px;border-radius:4px;text-decoration:none;font-weight:600;font-size:14px">
              Accéder à mon espace
            </a>
          </div>
          <p style="color:#6B7280;font-size:12px;margin-top:32px;border-top:1px solid #F3F4F6;padding-top:16px">
            © ${new Date().getFullYear()} JAEI — Journal of Agricultural and Environmental Innovation
          </p>
        </div>
      </div>
    `,
  }),

  // Article publié sur le site public
  articlePublished: ({ authorName, articleTitle, articleId }) => ({
    subject: `JAEI — Votre article est maintenant publié : "${articleTitle}"`,
    text: `Bonjour ${authorName},\n\nFélicitations ! Votre article "${articleTitle}" est maintenant publié et accessible en ligne sur la plateforme JAEI.\n\nCordialement,\nL'équipe éditoriale JAEI`,
    html: `
      <div style="font-family:Inter,Arial,sans-serif;max-width:600px;margin:0 auto;color:#2D2D2D">
        <div style="background:linear-gradient(135deg,#1B4427,#1E88C8);padding:24px 32px">
          <h1 style="color:#fff;margin:0;font-size:20px">JAEI</h1>
          <p style="color:rgba(255,255,255,0.7);margin:4px 0 0;font-size:13px">Journal of Agricultural and Environmental Innovation</p>
        </div>
        <div style="padding:32px">
          <h2 style="color:#1B4427;font-size:18px">🎉 Votre article est publié !</h2>
          <p>Bonjour <strong>${authorName}</strong>,</p>
          <p>Félicitations ! Votre article est maintenant publié et accessible en accès libre à la communauté scientifique mondiale.</p>
          <div style="background:#F0FDF4;border:1px solid #BBF7D0;border-radius:4px;padding:16px;margin:16px 0">
            <p style="margin:0;font-weight:600;color:#15803D">${articleTitle}</p>
            <p style="margin:4px 0 0;font-size:13px;color:#6B7280">Statut : Publié • Accès libre</p>
          </div>
          <div style="margin:24px 0">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/articles/${articleId}"
               style="background:#1B4427;color:#fff;padding:12px 24px;border-radius:4px;text-decoration:none;font-weight:600;font-size:14px">
              Voir mon article publié
            </a>
          </div>
          <p style="color:#6B7280;font-size:12px;margin-top:32px;border-top:1px solid #F3F4F6;padding-top:16px">
            © ${new Date().getFullYear()} JAEI — Journal of Agricultural and Environmental Innovation
          </p>
        </div>
      </div>
    `,
  }),

  // Décision éditoriale (après évaluation)
  reviewCompleted: ({ authorName, articleTitle, recommendation, comments }) => {
    const LABELS = {
      accept:         { label: 'Accepté pour publication',     color: '#15803D', bg: '#F0FDF4', border: '#BBF7D0' },
      minor_revision: { label: 'Révisions mineures requises',  color: '#92400E', bg: '#FFFBEB', border: '#FDE68A' },
      major_revision: { label: 'Révisions majeures requises',  color: '#6D28D9', bg: '#F5F3FF', border: '#DDD6FE' },
      reject:         { label: 'Non retenu',                   color: '#B91C1C', bg: '#FEF2F2', border: '#FECACA' },
    };
    const cfg = LABELS[recommendation] || LABELS.minor_revision;

    return {
      subject: `JAEI — Décision éditoriale : "${articleTitle}"`,
      text: `Bonjour ${authorName},\n\nUne décision a été rendue pour votre article "${articleTitle}" : ${cfg.label}.\n\nCommentaires : ${comments}\n\nCordialement,\nL'équipe éditoriale JAEI`,
      html: `
        <div style="font-family:Inter,Arial,sans-serif;max-width:600px;margin:0 auto;color:#2D2D2D">
          <div style="background:linear-gradient(135deg,#1B4427,#1E88C8);padding:24px 32px">
            <h1 style="color:#fff;margin:0;font-size:20px">JAEI</h1>
            <p style="color:rgba(255,255,255,0.7);margin:4px 0 0;font-size:13px">Journal of Agricultural and Environmental Innovation</p>
          </div>
          <div style="padding:32px">
            <h2 style="color:#1B4427;font-size:18px">Décision éditoriale</h2>
            <p>Bonjour <strong>${authorName}</strong>,</p>
            <p>Le comité éditorial a rendu sa décision concernant votre article :</p>
            <div style="background:#F9FAFB;border:1px solid #E5E7EB;border-radius:4px;padding:16px;margin:16px 0">
              <p style="margin:0;font-weight:600;color:#374151">${articleTitle}</p>
              <span style="display:inline-block;margin-top:8px;padding:4px 10px;border-radius:4px;font-size:13px;font-weight:600;background:${cfg.bg};color:${cfg.color};border:1px solid ${cfg.border}">
                ${cfg.label}
              </span>
            </div>
            ${comments ? `
            <div style="margin:16px 0">
              <p style="font-weight:600;color:#374151;margin-bottom:8px">Commentaires de l'évaluateur :</p>
              <p style="background:#F9FAFB;padding:12px;border-radius:4px;font-size:13px;line-height:1.6;color:#4B5563;border-left:3px solid ${cfg.color}">${comments}</p>
            </div>` : ''}
            <div style="margin:24px 0">
              <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/author/dashboard"
                 style="background:#1E88C8;color:#fff;padding:12px 24px;border-radius:4px;text-decoration:none;font-weight:600;font-size:14px">
                Voir mon tableau de bord
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
