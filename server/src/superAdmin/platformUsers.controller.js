const bcrypt = require('bcryptjs');
const { User } = require('../models');
const SuperAdmin = require('./superAdmin.model');
const asyncHandler = require('../middleware/asyncHandler');
const AppError = require('../utils/AppError');
const { generateTempPassword } = require('../utils/password');
const { recordSuperAdmin } = require('../services/auditLog.service');

// --- School Admins (tenant Users with role 'admin'), viewed cross-tenant ---

// GET /super-admin/school-admins?schoolId=
const listSchoolAdmins = asyncHandler(async (req, res) => {
  const { schoolId } = req.query;
  const where = { role: 'admin', ...(schoolId ? { schoolId } : {}) };
  const admins = await User.find(where).setOptions({ skipTenantScope: true }).populate('schoolId', 'name slug').sort({ createdAt: -1 });
  res.json({
    success: true,
    data: admins.map((a) => ({
      id: a.id,
      email: a.email,
      fullName: a.fullName,
      status: a.status,
      createdAt: a.createdAt,
      school: a.schoolId ? { id: a.schoolId.id, name: a.schoolId.name, slug: a.schoolId.slug } : null,
    })),
  });
});

const findSchoolAdminOr404 = async (id, next) => {
  const admin = await User.findOne({ _id: id, role: 'admin' }).setOptions({ skipTenantScope: true });
  if (!admin) {
    next(new AppError('School admin not found', 404));
    return null;
  }
  return admin;
};

// PUT /super-admin/school-admins/:id/status { status }
const setSchoolAdminStatus = asyncHandler(async (req, res, next) => {
  const admin = await findSchoolAdminOr404(req.params.id, next);
  if (!admin) return;
  admin.status = req.body.status;
  await admin.save();
  await recordSuperAdmin({
    req, action: 'schoolAdmin.statusChange', entityType: 'User', entityId: admin.id, description: `Set ${admin.email}'s status to ${admin.status}`, schoolId: admin.schoolId,
  });
  res.json({ success: true, data: { id: admin.id, status: admin.status } });
});

// POST /super-admin/school-admins/:id/reset-password
const resetSchoolAdminPassword = asyncHandler(async (req, res, next) => {
  const admin = await findSchoolAdminOr404(req.params.id, next);
  if (!admin) return;
  const tempPassword = generateTempPassword();
  admin.passwordHash = await bcrypt.hash(tempPassword, 10);
  await admin.save();
  await recordSuperAdmin({
    req, action: 'schoolAdmin.resetPassword', entityType: 'User', entityId: admin.id, description: `Reset password for ${admin.email}`, schoolId: admin.schoolId,
  });
  res.json({ success: true, data: { id: admin.id, email: admin.email, tempPassword } });
});

// --- Super-Admins ---

const toPublicSuperAdmin = (sa) => ({
  id: sa.id, email: sa.email, fullName: sa.fullName, status: sa.status, createdAt: sa.createdAt,
});

// GET /super-admin/super-admins
const listSuperAdmins = asyncHandler(async (req, res) => {
  const admins = await SuperAdmin.find().sort({ createdAt: -1 });
  res.json({ success: true, data: admins.map(toPublicSuperAdmin) });
});

// POST /super-admin/super-admins { email, fullName, password }
const createSuperAdmin = asyncHandler(async (req, res, next) => {
  const { email, fullName, password } = req.body;
  const existing = await SuperAdmin.findOne({ email });
  if (existing) return next(new AppError('A super admin with this email already exists', 400));

  const passwordHash = await bcrypt.hash(password, 10);
  const admin = await SuperAdmin.create({ email, fullName, passwordHash, status: 'active' });
  await recordSuperAdmin({
    req, action: 'superAdmin.create', entityType: 'SuperAdmin', entityId: admin.id, description: `Created super-admin account: ${admin.email}`,
  });
  res.status(201).json({ success: true, data: toPublicSuperAdmin(admin) });
});

// PUT /super-admin/super-admins/:id/status { status }
const setSuperAdminStatus = asyncHandler(async (req, res, next) => {
  if (req.params.id === req.superAdmin.id) {
    return next(new AppError('You cannot change the status of your own account', 400));
  }
  const admin = await SuperAdmin.findById(req.params.id);
  if (!admin) return next(new AppError('Super admin not found', 404));
  admin.status = req.body.status;
  await admin.save();
  await recordSuperAdmin({
    req, action: 'superAdmin.statusChange', entityType: 'SuperAdmin', entityId: admin.id, description: `Set super-admin ${admin.email}'s status to ${admin.status}`,
  });
  res.json({ success: true, data: toPublicSuperAdmin(admin) });
});

module.exports = {
  listSchoolAdmins,
  setSchoolAdminStatus,
  resetSchoolAdminPassword,
  listSuperAdmins,
  createSuperAdmin,
  setSuperAdminStatus,
};
