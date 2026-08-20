const QRCode = require('qrcode');
const config = require('../config');

const buildVerificationUrl = (type, id, schoolSlug) => `${config.clientOrigin}/verify/${type}/${schoolSlug}/${id}`;

const buildVerificationQrDataUrl = async (type, id, schoolSlug) => QRCode.toDataURL(buildVerificationUrl(type, id, schoolSlug), {
  width: 110,
  margin: 1,
  color: { dark: '#322c7c', light: '#ffffff' },
});

module.exports = { buildVerificationUrl, buildVerificationQrDataUrl };
