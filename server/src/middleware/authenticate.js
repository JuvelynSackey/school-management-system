const jwt = require('jsonwebtoken');
const config = require('../config');
const AppError = require('../utils/AppError');

const authenticate = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return next(new AppError('Authentication required', 401));
  }

  const token = header.slice('Bearer '.length);

  try {
    const payload = jwt.verify(token, config.jwt.secret);
    req.user = { id: payload.id, role: payload.role };
    return next();
  } catch (err) {
    return next(new AppError('Invalid or expired token', 401));
  }
};

module.exports = authenticate;
