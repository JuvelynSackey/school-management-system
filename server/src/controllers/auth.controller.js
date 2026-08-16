const bcrypt = require('bcryptjs');
const { User } = require('../models');
const asyncHandler = require('../middleware/asyncHandler');
const AppError = require('../utils/AppError');
const { signToken, toPublicUser } = require('../services/auth.service');

const login = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });
  if (!user) {
    return next(new AppError('Invalid email or password', 401));
  }

  const passwordMatches = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatches) {
    return next(new AppError('Invalid email or password', 401));
  }

  if (user.status !== 'active') {
    return next(new AppError('This account has been deactivated', 403));
  }

  const token = signToken(user);
  return res.json({ success: true, data: { token, user: toPublicUser(user) } });
});

const me = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user.id);
  if (!user) {
    return next(new AppError('User not found', 404));
  }
  return res.json({ success: true, data: toPublicUser(user) });
});

module.exports = { login, me };
