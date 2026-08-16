const QRCode = require('qrcode');
const config = require('../config');

const buildVerificationUrl = (type, id) => `${config.clientOrigin}/verify/${type}/${id}`;

const buildVerificationQrDataUrl = async (type, id) => QRCode.toDataURL(buildVerificationUrl(type, id), {
  width: 110,
  margin: 1,
  color: { dark: '#322c7c', light: '#ffffff' },
});

module.exports = { buildVerificationUrl, buildVerificationQrDataUrl };
