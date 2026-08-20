const bcrypt = require('bcryptjs');
const { User, School } = require('../models');
const asyncHandler = require('../middleware/asyncHandler');
const AppError = require('../utils/AppError');
const { toPublicUser } = require('../services/auth.service');

// PUT /auth/me — self-service edit of the caller's own fullName/phone
const updateMe = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user.id);
  if (!user) return next(new AppError('User not found', 404));

  const { fullName, phone } = req.body;

  if (phone) {
    const existing = await User.findOne({ schoolId: req.user.schoolId, phone, _id: { $ne: user.id } });
    if (existing) return next(new AppError('That phone number is already in use by another account', 400));
  }

  user.fullName = fullName ?? user.fullName;
  user.phone = phone === undefined ? user.phone : (phone || null);
  await user.save();

  const school = await School.findById(req.user.schoolId);
  res.json({ success: true, data: toPublicUser(user, school) });
});

// POST /auth/change-password
const changePassword = asyncHandler(async (req, res, next) => {
  const { currentPassword, newPassword } = req.body;
  const user = await User.findById(req.user.id);
  if (!user) return next(new AppError('User not found', 404));

  const matches = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!matches) return next(new AppError('Current password is incorrect', 400));

  user.passwordHash = await bcrypt.hash(newPassword, 10);
  user.mustChangePassword = false;
  await user.save();
  res.json({ success: true, data: null });
});

module.exports = { updateMe, changePassword };
