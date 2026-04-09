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

module.exports = { uploadToCloudinary, deleteFromCloudinary };
