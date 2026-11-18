// ============================================================
// JAEI — URLs de fichiers (aperçu / téléchargement)
// Remarques 5 et 6 (client, 03/08)
//
// Les fichiers Cloudinary sont stockés en `raw` : servis tels quels, le
// navigateur reçoit un `application/octet-stream` sans nom correct, d'où
// "Failed to load PDF document" à l'ouverture et des téléchargements sans
// extension. On passe donc par le proxy backend, qui impose le bon
// Content-Type et le bon Content-Disposition (inline ou attachment).
// ============================================================

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const ORIGIN   = API_BASE.replace(/\/api\/?$/, '');

/** Transforme un chemin relatif (/uploads/…) en URL absolue. */
export const absoluteUrl = (u) =>
  (!u ? '' : (u.startsWith('http') ? u : `${ORIGIN}${u}`));

const isCloudinary = (u) => /^https:\/\/res\.cloudinary\.com\//.test(u);

/** Nom de fichier propre, extension garantie. */
export const displayName = (name, url, fallbackExt = 'pdf') => {
  let n = (name || 'document').trim();
  if (!/\.[a-z0-9]{2,5}$/i.test(n)) {
    const m = (url || '').match(/\.(pdf|docx?)(?:$|\?)/i);
    n += m ? `.${m[1].toLowerCase()}` : `.${fallbackExt}`;
  }
  return n;
};

/**
 * Adresses d'affichage du résumé graphique d'un article publié (18/11/2026), d'après `graphical_abstract` de l'API
 * publique { url, full_url, name, optimized } :
 *   • `src`  : l'image à afficher — la copie web allégée (Cloudinary, diffusion publique directe) quand elle existe,
 *              sinon l'original, servi comme les autres fichiers ;
 *   • `full` : l'original en taille réelle (clic sur l'image).
 * Renvoie null sans résumé graphique : rien ne s'affiche en plus.
 */
export const graphicalAbstractUrls = (ga) => {
  if (!ga || !ga.url) return null;
  return {
    src:  ga.optimized ? absoluteUrl(ga.url) : fileUrl(ga.url, 'inline', ga.name),
    full: fileUrl(ga.full_url || ga.url, 'inline', ga.name),
  };
};

/**
 * URL à utiliser pour ouvrir (inline) ou télécharger (download) un fichier.
 * @param {string} rawUrl  URL stockée en base
 * @param {'inline'|'download'} mode
 * @param {string} [name]  nom souhaité côté navigateur
 */
export const fileUrl = (rawUrl, mode = 'inline', name) => {
  const u = absoluteUrl(rawUrl);
  if (!u) return '';
  if (!isCloudinary(u)) return u;   // fichiers locaux : déjà servis correctement
  const n = displayName(name, u);
  return `${API_BASE}/submissions/file?u=${encodeURIComponent(u)}&name=${encodeURIComponent(n)}&mode=${mode}`;
};
