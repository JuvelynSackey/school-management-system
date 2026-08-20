const jwt = require('jsonwebtoken');
const config = require('../config');
const AppError = require('../utils/AppError');

// Deliberately does not open tenant context (runWithSchool) — super-admin
// routes operate on School itself, which is never tenant-scoped.
const authenticateSuperAdmin = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return next(new AppError('Authentication required', 401));
  }

  const token = header.slice('Bearer '.length);

  try {
    const payload = jwt.verify(token, config.jwt.secret);
    if (payload.type !== 'super-admin') {
      return next(new AppError('Invalid or expired token', 401));
    }
    req.superAdmin = { id: payload.id };
    return next();
  } catch (err) {
    return next(new AppError('Invalid or expired token', 401));
  }
};

module.exports = authenticateSuperAdmin;
