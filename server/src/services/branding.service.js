const fs = require('fs');
const path = require('path');

const MIME_BY_EXT = {
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp',
};

// PDF templates are rendered via Puppeteer's page.setContent(), which has no
// base URL to resolve a relative/absolute <img src> against — embedding as a
// base64 data URI (same approach verification.service.js already uses for
// QR codes) sidesteps that entirely. Returns null if there's no image, or if
// the file can't be read (e.g. it was uploaded then deleted) — templates
// fall back to their existing text-only rendering in either case.
//
// Logo/signature uploads (upload.js's createInMemoryImageUploader) now store
// a data URL directly rather than a /uploads/... path — nothing to read from
// disk, so it's returned as-is. The disk-path branch below only still
// matters for a value uploaded before that change, which stopped resolving
// to a real file the moment Render's ephemeral disk was next wiped anyway.
const getImageDataUrl = (fileUrl, uploadsSubdir) => {
  if (!fileUrl) return null;
  if (fileUrl.startsWith('data:')) return fileUrl;
  try {
    const filename = fileUrl.split(`/uploads/${uploadsSubdir}/`)[1];
    if (!filename) return null;
    const filePath = path.join(__dirname, `../../uploads/${uploadsSubdir}`, filename);
    const mimeType = MIME_BY_EXT[path.extname(filename).toLowerCase()];
    if (!mimeType) return null;
    const bytes = fs.readFileSync(filePath);
    return `data:${mimeType};base64,${bytes.toString('base64')}`;
  } catch {
    return null;
  }
};

const getLogoDataUrl = (logoUrl) => getImageDataUrl(logoUrl, 'logos');
const getSignatureDataUrl = (signatureUrl) => getImageDataUrl(signatureUrl, 'signatures');

module.exports = { getLogoDataUrl, getSignatureDataUrl };
