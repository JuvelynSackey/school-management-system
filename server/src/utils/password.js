const crypto = require('crypto');

// Generates a readable temporary password for admin-created accounts, e.g. "Kx7m-Qp2r".
const generateTempPassword = () => {
  const part = () => crypto.randomBytes(3).toString('hex');
  return `${part()}-${part()}`;
};

module.exports = { generateTempPassword };
