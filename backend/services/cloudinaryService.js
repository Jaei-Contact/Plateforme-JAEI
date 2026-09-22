const cloudinary = require('cloudinary').v2;

// ============================================================
// JAEI — Cloudinary Service
// Handles all file uploads (PDFs, Word docs, avatars)
// Requires in .env:
//   CLOUDINARY_CLOUD_NAME=
//   CLOUDINARY_API_KEY=
//   CLOUDINARY_API_SECRET=
// ============================================================

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Upload a file buffer to Cloudinary.
 * @param {Buffer} buffer   - File buffer from multer memoryStorage
 * @param {object} options  - Cloudinary upload options (folder, resource_type, etc.)
 * @returns {Promise<object>} Cloudinary upload result (secure_url, public_id, ...)
 */
const uploadToCloudinary = (buffer, options = {}) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(options, (error, result) => {
      if (error) reject(error);
      else resolve(result);
    });
    stream.end(buffer);
  });
};

/**
 * Delete a file from Cloudinary by its public_id.
 * Non-blocking — errors are logged but not thrown.
 * @param {string} publicId
 * @param {string} resourceType - 'raw' for PDFs/docs, 'image' for avatars
 */
const deleteFromCloudinary = async (publicId, resourceType = 'raw') => {
  if (!publicId) return;
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
  } catch (err) {
    console.error('Cloudinary delete error:', err.message);
  }
};

/**
 * URL de téléchargement authentifiée (API Cloudinary, signée, valable 5 min)
 * pour une URL de diffusion `res.cloudinary.com/...`.
 *
 * Remarque 9 (22/09) : un compte Cloudinary gratuit bloque la diffusion
 * publique des PDF (401 "deny or ACL failure"), alors que les .docx passent.
 * L'API de téléchargement authentifiée n'est pas soumise à ce blocage.
 * @param {string} deliveryUrl
 * @returns {string|null} null si l'URL n'est pas une URL Cloudinary reconnue
 */
const privateDownloadUrl = (deliveryUrl) => {
  const m = String(deliveryUrl || '').match(
    /^https:\/\/res\.cloudinary\.com\/[^/]+\/(raw|image|video)\/(upload|private|authenticated)\/(?:v\d+\/)?(.+)$/
  );
  if (!m) return null;
  const [, resourceType, type, rawId] = m;
  // raw : l'extension fait partie du public_id ; image/vidéo : elle est le format
  let publicId = decodeURIComponent(rawId);
  let format = '';
  if (resourceType !== 'raw') {
    const dot = publicId.lastIndexOf('.');
    if (dot > 0) { format = publicId.slice(dot + 1); publicId = publicId.slice(0, dot); }
  }
  return cloudinary.utils.private_download_url(publicId, format, {
    resource_type: resourceType,
    type,
    expires_at: Math.floor(Date.now() / 1000) + 300,
  });
};

module.exports = { uploadToCloudinary, deleteFromCloudinary, privateDownloadUrl };
