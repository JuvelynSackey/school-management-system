const crypto = require('crypto');

// Generates a readable temporary password for admin-created accounts, e.g. "Kx7m-Qp2r".
const generateTempPassword = () => {
  const part = () => crypto.randomBytes(3).toString('hex');
  return `${part()}-${part()}`;
};

// A short numeric PIN, used for student and guardian/parent accounts (not
// the longer alphanumeric temp password admin/teacher accounts get) — easy
// for a young pupil or a phone-only parent to be told and type. Weaker than
// a real password by design; the existing /auth/login rate limiter
// (20 attempts/15min) is this app's only brute-force defense for it, same
// as every other account.
const generatePin = () => String(crypto.randomInt(0, 10000)).padStart(4, '0');

module.exports = { generateTempPassword, generatePin };
