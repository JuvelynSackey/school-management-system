const bcrypt = require('bcryptjs');
const { Guardian, StudentGuardian, User } = require('../models');
const asyncHandler = require('../middleware/asyncHandler');
const AppError = require('../utils/AppError');
const auditLog = require('../services/auditLog.service');

// Guardian<->Student is many-to-many via StudentGuardian; fetch the linked
// students manually since Mongoose has no belongsToMany populate.
const withStudents = async (guardian) => {
  const links = await StudentGuardian.find({ guardianId: guardian.id }).populate('student', 'firstName lastName admissionNo');
  const data = guardian.toJSON();
  data.students = links.map((l) => l.student).filter(Boolean);
  return data;
};

// GET /guardians?phone=  -> lookup for the enrolment form's "auto-link siblings" flow
const lookupByPhone = asyncHandler(async (req, res, next) => {
  const { phone } = req.query;
  if (!phone) return next(new AppError('phone is required', 400));

  const guardian = await Guardian.findOne({ phone });
  if (!guardian) return res.json({ success: true, data: null });
  res.json({ success: true, data: await withStudents(guardian) });
});

const getById = asyncHandler(async (req, res, next) => {
  const guardian = await Guardian.findById(req.params.id);
  if (!guardian) return next(new AppError('Guardian not found', 404));
  res.json({ success: true, data: await withStudents(guardian) });
});

// POST /guardians/:id/login { email, password } — gives an existing guardian
// contact record a parent-role login (admin-created, per this app's convention).
const createLogin = asyncHandler(async (req, res, next) => {
  const guardian = await Guardian.findById(req.params.id);
  if (!guardian) return next(new AppError('Guardian not found', 404));
  if (guardian.userId) return next(new AppError('This guardian already has a login', 400));

  const { email, password } = req.body;
  const existing = await User.findOne({ email });
  if (existing) return next(new AppError('A user with this email already exists', 400));

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({
    email, passwordHash, fullName: guardian.fullName, role: 'parent', status: 'active',
  });

  guardian.userId = user.id;
  await guardian.save();

  await auditLog.record({
    req, action: 'guardian.createLogin', entityType: 'Guardian', entityId: guardian.id, description: `Created parent login for guardian: ${guardian.fullName}`,
  });

  res.status(201).json({ success: true, data: await withStudents(guardian) });
});

module.exports = { lookupByPhone, getById, createLogin };
