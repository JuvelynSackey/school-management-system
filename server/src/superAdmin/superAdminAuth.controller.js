const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const config = require('../config');
const SuperAdmin = require('./superAdmin.model');
const asyncHandler = require('../middleware/asyncHandler');
const AppError = require('../utils/AppError');
const { recordAuthEvent } = require('../services/auditLog.service');

const toPublic = (sa) => ({
  id: sa.id, email: sa.email, fullName: sa.fullName, status: sa.status,
});

const login = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;

  const fail = async (reason) => {
    await recordAuthEvent({
      action: 'auth.superAdminLoginFailed',
      description: `Failed super-admin login for "${email}" — ${reason}`,
      metadata: { identifier: email, reason },
    });
    return next(new AppError('Invalid email or password', 401));
  };

  const superAdmin = await SuperAdmin.findOne({ email });
  if (!superAdmin) return fail('unknown email');

  const passwordMatches = await bcrypt.compare(password, superAdmin.passwordHash);
  if (!passwordMatches) return fail('wrong password');

  if (superAdmin.status !== 'active') {
    await recordAuthEvent({
      actorType: 'super-admin', actorName: superAdmin.fullName, actorRole: 'super-admin',
      action: 'auth.superAdminLoginFailed', description: `Super-admin login blocked for "${email}" — account is deactivated`,
      metadata: { identifier: email, reason: 'inactive account' },
    });
    return next(new AppError('This account has been deactivated', 403));
  }

  await recordAuthEvent({
    actorType: 'super-admin', actorName: superAdmin.fullName, actorRole: 'super-admin',
    action: 'auth.superAdminLoginSuccess', description: `${superAdmin.fullName} logged in as super-admin`,
  });

  const token = jwt.sign(
    { id: superAdmin.id, type: 'super-admin' },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn },
  );
  return res.json({ success: true, data: { token, superAdmin: toPublic(superAdmin) } });
});

const me = asyncHandler(async (req, res, next) => {
  const superAdmin = await SuperAdmin.findById(req.superAdmin.id);
  if (!superAdmin) return next(new AppError('Super admin not found', 404));
  return res.json({ success: true, data: toPublic(superAdmin) });
});

module.exports = { login, me };
