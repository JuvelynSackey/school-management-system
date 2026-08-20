const fs = require('fs');
const path = require('path');

const MIME_BY_EXT = {
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp',
};

// PDF templates are rendered via Puppeteer's page.setContent(), which has no
// base URL to resolve a relative/absolute <img src> against — embedding as a
// base64 data URI (same approach verification.service.js already uses for
// QR codes) sidesteps that entirely. Returns null if there's no logo, or if
// the file can't be read (e.g. it was uploaded then deleted) — templates
// fall back to their existing text-only header in either case.
const getLogoDataUrl = (logoUrl) => {
  if (!logoUrl) return null;
  try {
    const filename = logoUrl.split('/uploads/logos/')[1];
    if (!filename) return null;
    const filePath = path.join(__dirname, '../../uploads/logos', filename);
    const mimeType = MIME_BY_EXT[path.extname(filename).toLowerCase()];
    if (!mimeType) return null;
    const bytes = fs.readFileSync(filePath);
    return `data:${mimeType};base64,${bytes.toString('base64')}`;
  } catch {
    return null;
  }
};

module.exports = { getLogoDataUrl };
