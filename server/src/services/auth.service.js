const jwt = require('jsonwebtoken');
const config = require('../config');

const signToken = (user, schoolId) => jwt.sign(
  { id: user.id, role: user.role, schoolId },
  config.jwt.secret,
  { expiresIn: config.jwt.expiresIn },
);

// teacher: the caller's own Teacher profile doc, when user.role === 'teacher'
// (auth.controller.js fetches it) — merges in staff-only fields without
// touching what a non-teacher session looks like. `phone` here stays
// User.phone (the login-identifier phone MyAccount.jsx edits) unchanged;
// `staffPhone` is the separate Teacher.phone entered at onboarding, kept as
// its own field rather than silently overwriting `phone` so editing one
// never looks like it's editing the other.
const toPublicUser = (user, school, teacher) => ({
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
  ...(teacher ? {
    staffNo: teacher.staffNo,
    staffPhone: teacher.phone || null,
    qualification: teacher.qualification || null,
    gender: teacher.gender || null,
  } : {}),
});

module.exports = { signToken, toPublicUser };
