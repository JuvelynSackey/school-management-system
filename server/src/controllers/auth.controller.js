const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { User, School, PlatformSettings, Teacher, Student } = require('../models');
const asyncHandler = require('../middleware/asyncHandler');
const AppError = require('../utils/AppError');
const config = require('../config');
const { signToken, toPublicUser } = require('../services/auth.service');
const { recordAuthEvent } = require('../services/auditLog.service');
const { sendEmail } = require('../services/email.service');

const RESET_TOKEN_TTL_MS = 15 * 60 * 1000;
const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

const login = asyncHandler(async (req, res, next) => {
  const { schoolCode, identifier, password } = req.body;
  const normalizedSchoolCode = schoolCode.toLowerCase().trim();

  // Maintenance mode only blocks *new* tenant logins — it deliberately does
  // not force out already-authenticated sessions, which would be a much
  // more disruptive behavior than "no new logins while we work on this."
  const platformSettings = await PlatformSettings.findOne({});
  if (platformSettings?.maintenanceMode?.enabled) {
    return next(new AppError(platformSettings.maintenanceMode.message, 503));
  }

  // Deliberately the same generic error for a bad school code, a bad
  // email/phone, and a bad password — don't leak which one failed to the
  // client. The reason IS captured server-side, for the Security Center.
  const invalidCredentials = async (school, reason) => {
    await recordAuthEvent({
      schoolId: school?.id || null,
      action: 'auth.loginFailed',
      description: `Failed login for "${identifier}" at school code "${normalizedSchoolCode}" — ${reason}`,
      metadata: { identifier, schoolCode: normalizedSchoolCode, reason },
    });
    return next(new AppError('Invalid school code, email/phone, or password', 401));
  };

  const school = await School.findOne({ slug: normalizedSchoolCode, status: 'active' });
  if (!school) return invalidCredentials(null, 'unknown or inactive school code');

  const normalized = identifier.trim();
  let user = await User.findOne({
    schoolId: school._id,
    $or: [{ email: normalized.toLowerCase() }, { phone: normalized }],
  });

  // Admission number is only ever a Student thing, and lives on Student,
  // not User -- checked as a fallback (not merged into the $or above) so it
  // never has to be duplicated onto User just to make one query possible.
  if (!user) {
    const student = await Student.findOne({ schoolId: school._id, admissionNo: normalized });
    // findById alone would throw here -- login() has no tenant context yet
    // (same reason the Teacher lookup below needs schoolId in its filter).
    if (student) user = await User.findOne({ _id: student.userId, schoolId: school._id });
  }
  if (!user) return invalidCredentials(school, 'unknown identifier');

  const passwordMatches = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatches) return invalidCredentials(school, 'wrong password');

  if (user.status !== 'active') {
    await recordAuthEvent({
      schoolId: school.id,
      actorId: user.id,
      actorType: 'user',
      actorName: user.fullName,
      actorRole: user.role,
      action: 'auth.loginFailed',
      description: `Login blocked for "${identifier}" — account is deactivated`,
      metadata: { identifier, schoolCode: normalizedSchoolCode, reason: 'inactive account' },
    });
    return next(new AppError('This account has been deactivated', 403));
  }

  await recordAuthEvent({
    schoolId: school.id,
    actorId: user.id,
    actorType: 'user',
    actorName: user.fullName,
    actorRole: user.role,
    action: 'auth.loginSuccess',
    description: `${user.fullName} logged in`,
  });

  // login() runs before any tenant context is established (there's no JWT
  // yet) — schoolId must be in the filter itself, same as the User lookup
  // above, or tenantScopePlugin has nothing to read and throws.
  const teacher = user.role === 'teacher' ? await Teacher.findOne({ userId: user.id, schoolId: school.id }) : null;
  const token = signToken(user, school.id);
  return res.json({ success: true, data: { token, user: toPublicUser(user, school, teacher) } });
});

const me = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user.id);
  if (!user) {
    return next(new AppError('User not found', 404));
  }
  const school = await School.findById(req.user.schoolId);
  const teacher = user.role === 'teacher' ? await Teacher.findOne({ userId: user.id, schoolId: req.user.schoolId }) : null;
  return res.json({ success: true, data: toPublicUser(user, school, teacher) });
});

// POST /auth/forgot-password { schoolCode, identifier }
const forgotPassword = asyncHandler(async (req, res) => {
  const { schoolCode, identifier } = req.body;
  // Deliberately the same response whether or not a matching account exists
  // — same anti-enumeration principle as login's generic error message.
  const genericResponse = () => res.json({
    success: true,
    data: { message: 'If that account exists, a password reset link has been sent to its email address.' },
  });

  const school = await School.findOne({ slug: schoolCode.toLowerCase().trim(), status: 'active' });
  if (!school) return genericResponse();

  const normalized = identifier.trim();
  const user = await User.findOne({
    schoolId: school._id,
    $or: [{ email: normalized.toLowerCase() }, { phone: normalized }],
  });
  if (!user || !user.email || user.status !== 'active') return genericResponse();

  const token = crypto.randomBytes(32).toString('hex');
  user.passwordResetTokenHash = hashToken(token);
  user.passwordResetExpiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);
  await user.save();

  const link = `${config.clientOrigin}/reset-password?schoolCode=${encodeURIComponent(school.slug)}&token=${encodeURIComponent(token)}`;
  await sendEmail({
    to: user.email,
    subject: `Reset your JesManage password — ${school.name}`,
    text: `Hi ${user.fullName},\n\nSomeone requested a password reset for your JesManage account. This link expires in 15 minutes:\n\n${link}\n\nIf you didn't request this, you can safely ignore this email.`,
  }).catch((err) => console.error('Failed to send password reset email:', err.message));

  await recordAuthEvent({
    schoolId: school.id,
    actorId: user.id,
    actorType: 'user',
    actorName: user.fullName,
    actorRole: user.role,
    action: 'auth.passwordResetRequested',
    description: `Password reset requested for "${identifier}"`,
  });

  return genericResponse();
});

// POST /auth/reset-password { schoolCode, token, newPassword }
const resetPassword = asyncHandler(async (req, res, next) => {
  const { schoolCode, token, newPassword } = req.body;

  const school = await School.findOne({ slug: schoolCode.toLowerCase().trim(), status: 'active' });
  if (!school) return next(new AppError('Invalid or expired reset link', 400));

  const user = await User.findOne({
    schoolId: school._id,
    passwordResetTokenHash: hashToken(token),
    passwordResetExpiresAt: { $gt: new Date() },
  });
  if (!user) return next(new AppError('Invalid or expired reset link', 400));

  user.passwordHash = await bcrypt.hash(newPassword, 10);
  user.passwordResetTokenHash = null;
  user.passwordResetExpiresAt = null;
  await user.save();

  await recordAuthEvent({
    schoolId: school.id,
    actorId: user.id,
    actorType: 'user',
    actorName: user.fullName,
    actorRole: user.role,
    action: 'auth.passwordReset',
    description: `${user.fullName} reset their password via the forgot-password link`,
  });

  res.json({ success: true, data: null });
});

// POST /auth/verify-email { schoolCode, token }
const verifyEmail = asyncHandler(async (req, res, next) => {
  const { schoolCode, token } = req.body;

  let payload;
  try {
    payload = jwt.verify(token, config.jwt.secret);
  } catch {
    return next(new AppError('Invalid or expired verification link', 400));
  }
  if (payload.type !== 'email-verify') return next(new AppError('Invalid verification link', 400));

  const school = await School.findOne({ slug: schoolCode.toLowerCase().trim() });
  if (!school || school.id !== payload.schoolId) return next(new AppError('Invalid verification link', 400));

  const user = await User.findOne({ _id: payload.userId, schoolId: school._id });
  if (!user) return next(new AppError('Account not found', 404));

  user.emailVerified = true;
  await user.save();

  res.json({ success: true, data: { email: user.email } });
});

module.exports = {
  login, me, forgotPassword, resetPassword, verifyEmail,
};
