const jwt = require('jsonwebtoken');
const config = require('../config');

const signToken = (user, schoolId) => jwt.sign(
  { id: user.id, role: user.role, schoolId },
  config.jwt.secret,
  { expiresIn: config.jwt.expiresIn },
);

const toPublicUser = (user, school) => ({
  id: user.id,
  email: user.email,
  phone: user.phone || null,
  fullName: user.fullName,
  role: user.role,
  status: user.status,
  emailVerified: Boolean(user.emailVerified),
  mustChangePassword: Boolean(user.mustChangePassword),
  schoolName: school?.name || null,
  schoolSlug: school?.slug || null,
});

module.exports = { signToken, toPublicUser };
