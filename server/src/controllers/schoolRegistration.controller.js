const bcrypt = require('bcryptjs');
const { School, User, SchoolSettings } = require('../models');
const asyncHandler = require('../middleware/asyncHandler');
const AppError = require('../utils/AppError');
const { runWithSchool } = require('../middleware/tenantContext');
const { findOrCreate } = require('../utils/findOrCreate');
const { seedSchoolDefaults } = require('../services/schoolOnboarding.service');
const { sendVerificationEmail } = require('../services/emailVerification.service');
const { recordAuthEvent } = require('../services/auditLog.service');

// POST /schools/register — public, unauthenticated. Creates a School in
// 'pending' status plus its first admin user in one step, then waits for a
// super admin to approve it (PUT /super-admin/schools/:id { status:
// 'active' }) before login works at all. No separate gate was needed in
// auth.controller.js's login — it already filters
// `School.findOne({ slug, status: 'active' })`, so a pending/rejected
// school gets the same generic "Invalid school code..." failure as any
// other bad login, deliberately not a distinct "pending" message — this
// codebase already avoids leaking which specific thing was wrong on a
// failed login, and confirming to an unauthenticated caller that "this
// school exists and is pending" would be exactly that kind of leak.
const register = asyncHandler(async (req, res, next) => {
  const {
    schoolName, slug, adminFullName, adminEmail, adminPhone, password,
  } = req.body;

  const normalizedSlug = slug.toLowerCase().trim();
  const existingSchool = await School.findOne({ slug: normalizedSlug });
  if (existingSchool) return next(new AppError('A school with this login code already exists', 400));

  const school = await School.create({ name: schoolName, slug: normalizedSlug, status: 'pending' });

  await runWithSchool(school._id, () => findOrCreate(SchoolSettings, {
    where: { schoolId: school._id },
    defaults: { name: schoolName },
  }));

  const seeded = await seedSchoolDefaults(school._id, 'full_basic');

  const passwordHash = await bcrypt.hash(password, 10);
  const admin = await runWithSchool(school._id, () => User.create({
    email: adminEmail.toLowerCase().trim(),
    phone: adminPhone || null,
    passwordHash,
    fullName: adminFullName,
    role: 'admin',
    status: 'active',
    mustChangePassword: false,
  }));

  await sendVerificationEmail(admin, school);

  await recordAuthEvent({
    schoolId: school.id,
    action: 'school.selfRegistered',
    description: `${schoolName} self-registered and is awaiting super-admin approval (admin: ${admin.email})`,
    metadata: { slug: normalizedSlug, adminEmail: admin.email },
  });

  res.status(201).json({
    success: true,
    data: {
      name: school.name, slug: school.slug, status: school.status, seeded,
    },
  });
});

module.exports = { register };
