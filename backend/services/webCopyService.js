// ============================================================
// JAEI — Copie web allégée d'un résumé graphique (18/11/2026)
//
// Le résumé graphique s'affiche en vignette dans la liste des articles et sur la page de l'article : on n'y charge pas
// l'original (jusqu'à 10 Mo), mais une copie JPEG de 900 px au plus. C'est CLOUDINARY qui la fabrique (réduction à
// l'enregistrement, comme pour les avatars) : aucune bibliothèque de traitement d'image sur le serveur.
//   • Sans Cloudinary (développement local) : pas de copie, l'original sert.
//   • En cas d'échec (réseau, fichier illisible) : pas de copie non plus, l'original sert — l'article n'est jamais bloqué.
// La copie est un fichier de plus du même article : `published_files.web_url`, supprimée avec la ligne.
// ============================================================

const https = require('https');
const crypto = require('crypto');

const WEB_COPY_PX = 900;                       // plus grand côté de la copie
const WEB_COPY_QUALITY = 82;
const MAX_SOURCE_BYTES = 15 * 1024 * 1024;     // l'original fait 10 Mo au plus (limite des dépôts)
const FETCH_TIMEOUT_MS = 20000;

/**
 * Télécharge un fichier déjà stocké chez NOTRE compte Cloudinary (jamais une adresse arbitraire : pas de SSRF).
 * Si la diffusion publique est refusée (401/403), repli sur l'adresse authentifiée signée.
 * @returns {Promise<Buffer|null>}
 */
const fetchCloudinaryFile = (url, privateDownloadUrl) => new Promise((resolve) => {
  let parsed;
  try { parsed = new URL(url); } catch { return resolve(null); }
  const cloud = process.env.CLOUDINARY_CLOUD_NAME;
  if (parsed.protocol !== 'https:' || parsed.hostname !== 'res.cloudinary.com' || (cloud && !parsed.pathname.startsWith(`/${cloud}/`))) {
    return resolve(null);
  }
  const get = (target, allowFallback) => {
    const req = https.get(target, { timeout: FETCH_TIMEOUT_MS }, (res) => {
      if (res.statusCode !== 200) {
        res.resume();
        const fallback = allowFallback && [401, 403].includes(res.statusCode) && privateDownloadUrl ? privateDownloadUrl(parsed.href) : null;
        return fallback ? get(fallback, false) : resolve(null);
      }
      const chunks = []; let size = 0;
      res.on('data', (c) => {
        size += c.length;
        if (size > MAX_SOURCE_BYTES) { req.destroy(); resolve(null); } else chunks.push(c);
      });
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', () => resolve(null));
    });
    req.on('timeout', () => { req.destroy(); resolve(null); });
    req.on('error', () => resolve(null));
  };
  get(parsed.href, true);
});

/**
 * Fabrique la copie web d'un résumé graphique et renvoie son adresse, ou null (l'original sert alors).
 * @param {object} o
 * @param {Buffer} [o.buffer]       contenu de l'image si on l'a déjà (dépôt de l'éditeur)
 * @param {string} [o.sourceUrl]    sinon, adresse du fichier de l'auteur chez Cloudinary
 * @param {number} o.submissionId
 * @param {Function|null} o.uploadToCloudinary   null = stockage local : pas de copie
 * @param {Function|null} [o.privateDownloadUrl]
 */
const createWebCopy = async ({ buffer, sourceUrl, submissionId, uploadToCloudinary, privateDownloadUrl = null }) => {
  if (!uploadToCloudinary) return null;
  try {
    const data = buffer || (sourceUrl ? await fetchCloudinaryFile(sourceUrl, privateDownloadUrl) : null);
    if (!data || data.length === 0) return null;
    const result = await uploadToCloudinary(data, {
      folder: 'jaei/published',
      resource_type: 'image',
      public_id: `gaweb_${submissionId}_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
      format: 'jpg',
      transformation: [{ width: WEB_COPY_PX, height: WEB_COPY_PX, crop: 'limit', quality: WEB_COPY_QUALITY }],
    });
    return (result && result.secure_url) || null;
  } catch (e) {
    console.error('createWebCopy :', e.message);
    return null;
  }
};

/** Supprime une copie web chez Cloudinary (jamais l'original). Sans erreur bloquante. */
const removeWebCopy = async (url, deleteFromCloudinary) => {
  try {
    const m = String(url || '').match(/^https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/(?:v\d+\/)?(jaei\/published\/gaweb_[\w-]+)\.jpg$/);
    if (m && deleteFromCloudinary) await deleteFromCloudinary(m[1], 'image');
  } catch (e) {
    console.error('removeWebCopy :', e.message);
  }
};

module.exports = { createWebCopy, removeWebCopy, fetchCloudinaryFile, WEB_COPY_PX };
