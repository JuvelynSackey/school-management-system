const bcrypt = require('bcryptjs');
const {
  Guardian, StudentGuardian, User, Student,
} = require('../models');
const asyncHandler = require('../middleware/asyncHandler');
const AppError = require('../utils/AppError');
const auditLog = require('../services/auditLog.service');
const { getTeacherClassIds } = require('../services/teacherScope.service');

// Guardian<->Student is many-to-many via StudentGuardian; fetch the linked
// students manually since Mongoose has no belongsToMany populate.
const withStudents = async (guardian) => {
  const links = await StudentGuardian.find({ guardianId: guardian.id }).populate('student', 'firstName lastName admissionNo');
  const data = guardian.toJSON();
  data.students = links.map((l) => l.student).filter(Boolean);
  return data;
};

// GET /guardians/list — admin sees every guardian with a linked active
// student; a teacher sees only guardians linked to a student in one of
// their own classes (same scoping pattern as StudentList for teachers) so a
// teacher never learns about a guardian's children outside classes they
// teach. Portal status is derived, not stored: hasLogin from Guardian.userId,
// loginStatus from the linked User's own status field.
const list = asyncHandler(async (req, res) => {
  const studentQuery = { status: 'active' };
  if (req.user.role === 'teacher') {
    const { classIds } = await getTeacherClassIds(req.user.id);
    studentQuery.classId = { $in: classIds };
  }
  const visibleStudents = await Student.find(studentQuery, { _id: 1 });
  const visibleStudentIds = visibleStudents.map((s) => s.id);

  const links = await StudentGuardian.find({ studentId: { $in: visibleStudentIds } })
    .populate('student', 'firstName lastName admissionNo')
    .populate('guardian');

  const guardianRows = new Map();
  links.forEach((link) => {
    if (!link.guardian || !link.student) return;
    const key = link.guardian.id;
    if (!guardianRows.has(key)) guardianRows.set(key, { guardian: link.guardian, students: [] });
    guardianRows.get(key).students.push({
      studentId: link.student.id,
      name: `${link.student.firstName} ${link.student.lastName}`,
      admissionNo: link.student.admissionNo,
      contactPriority: link.contactPriority,
      isPickupAuthorized: link.isPickupAuthorized,
    });
  });

  const userIds = [...guardianRows.values()].map(({ guardian }) => guardian.userId).filter(Boolean);
  const users = await User.find({ _id: { $in: userIds } }, { status: 1 });
  const statusByUserId = new Map(users.map((u) => [u.id, u.status]));

  const rows = [...guardianRows.values()].map(({ guardian, students }) => ({
    id: guardian.id,
    fullName: guardian.fullName,
    phone: guardian.phone,
    email: guardian.email,
    relationship: guardian.relationship,
    hasLogin: !!guardian.userId,
    loginStatus: guardian.userId ? (statusByUserId.get(guardian.userId.toString()) || null) : null,
    students,
  })).sort((a, b) => a.fullName.localeCompare(b.fullName));

  res.json({ success: true, data: rows });
});

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

module.exports = {
  list, lookupByPhone, getById, createLogin,
};
