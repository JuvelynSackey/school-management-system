const jwt = require('jsonwebtoken');
const config = require('../config');
const AppError = require('../utils/AppError');
const { runWithSchool } = require('./tenantContext');

const authenticate = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return next(new AppError('Authentication required', 401));
  }

  const token = header.slice('Bearer '.length);

  try {
    const payload = jwt.verify(token, config.jwt.secret);
    if (!payload.schoolId) {
      // Pre-multi-tenant tokens have no schoolId claim — reject rather than
      // proceed with an ambiguous tenant, forcing a fresh login.
      return next(new AppError('Invalid or expired token', 401));
    }
    req.user = { id: payload.id, role: payload.role, schoolId: payload.schoolId };
    return runWithSchool(payload.schoolId, next);
  } catch (err) {
    return next(new AppError('Invalid or expired token', 401));
  }
};

module.exports = authenticate;
