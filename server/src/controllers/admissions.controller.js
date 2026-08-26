const models = require('../models');
const {
  Admission, Class, Student, User,
} = models;
const asyncHandler = require('../middleware/asyncHandler');
const AppError = require('../utils/AppError');
const { createStudentAccount } = require('../services/studentEnrollment.service');
const auditLog = require('../services/auditLog.service');

const populateForDisplay = (query) => query
  .populate('desiredClass', 'name section')
  .populate('enrolledStudent', 'firstName lastName admissionNo');

// GET /admissions?status=
const list = asyncHandler(async (req, res) => {
  const { status } = req.query;
  const where = status ? { status } : {};
  const admissions = await populateForDisplay(Admission.find(where)).sort({ createdAt: -1 });
  res.json({ success: true, data: admissions });
});

const findAdmissionOr404 = async (id, next) => {
  const admission = await Admission.findById(id);
  if (!admission) {
    next(new AppError('Admission not found', 404));
    return null;
  }
  return admission;
};

// GET /admissions/next-admission-no — a pre-fill suggestion only, freely editable
const nextAdmissionNo = asyncHandler(async (req, res) => {
  const count = await Student.countDocuments();
  res.json({ success: true, data: { suggested: `ADM-${String(count + 1).padStart(4, '0')}` } });
});

// POST /admissions
const create = asyncHandler(async (req, res, next) => {
  const {
    firstName, lastName, gender, dateOfBirth, address, desiredClassId, guardians,
  } = req.body;
  if (desiredClassId && !(await Class.findById(desiredClassId))) return next(new AppError('Class not found', 400));

  const admission = await Admission.create({
    firstName,
    lastName,
    gender: gender || null,
    dateOfBirth: dateOfBirth || null,
    address: address || null,
    desiredClassId: desiredClassId || null,
    guardians: Array.isArray(guardians) ? guardians : [],
    status: 'Applied',
  });
  const full = await populateForDisplay(Admission.findById(admission.id));
  res.status(201).json({ success: true, data: full });
});

// PUT /admissions/:id — only while Applied
const update = asyncHandler(async (req, res, next) => {
  const admission = await findAdmissionOr404(req.params.id, next);
  if (!admission) return;
  if (admission.status !== 'Applied') {
    return next(new AppError('Only applications still in Applied status can be edited', 400));
  }

  const {
    firstName, lastName, gender, dateOfBirth, address, desiredClassId, guardians,
  } = req.body;
  if (desiredClassId && !(await Class.findById(desiredClassId))) return next(new AppError('Class not found', 400));

  admission.firstName = firstName ?? admission.firstName;
  admission.lastName = lastName ?? admission.lastName;
  admission.gender = gender === undefined ? admission.gender : gender;
  admission.dateOfBirth = dateOfBirth === undefined ? admission.dateOfBirth : dateOfBirth;
  admission.address = address === undefined ? admission.address : address;
  admission.desiredClassId = desiredClassId === undefined ? admission.desiredClassId : (desiredClassId || null);
  if (Array.isArray(guardians)) admission.guardians = guardians;
  await admission.save();

  const full = await populateForDisplay(Admission.findById(admission.id));
  res.json({ success: true, data: full });
});

// POST /admissions/:id/approve
const approve = asyncHandler(async (req, res, next) => {
  const admission = await findAdmissionOr404(req.params.id, next);
  if (!admission) return;
  if (admission.status !== 'Applied') return next(new AppError('Only applied applications can be approved', 400));

  admission.status = 'Approved';
  admission.reviewedBy = req.user.id;
  admission.reviewedAt = new Date();
  admission.rejectionReason = null;
  await admission.save();
  await auditLog.record({
    req, action: 'admission.approve', entityType: 'Admission', entityId: admission.id, description: `Approved admission application: ${admission.firstName} ${admission.lastName}`,
  });
  res.json({ success: true, data: admission });
});

// POST /admissions/:id/reject { rejectionReason }
const reject = asyncHandler(async (req, res, next) => {
  const admission = await findAdmissionOr404(req.params.id, next);
  if (!admission) return;
  if (!['Applied', 'Approved'].includes(admission.status)) {
    return next(new AppError('Only applied or approved applications can be rejected', 400));
  }

  admission.status = 'Rejected';
  admission.reviewedBy = req.user.id;
  admission.reviewedAt = new Date();
  admission.rejectionReason = req.body.rejectionReason;
  await admission.save();
  await auditLog.record({
    req,
    action: 'admission.reject',
    entityType: 'Admission',
    entityId: admission.id,
    description: `Rejected admission application: ${admission.firstName} ${admission.lastName} — ${admission.rejectionReason}`,
  });
  res.json({ success: true, data: admission });
});

// POST /admissions/:id/enroll { email, admissionNo, classId, admissionDate }
const enroll = asyncHandler(async (req, res, next) => {
  const admission = await findAdmissionOr404(req.params.id, next);
  if (!admission) return;
  if (admission.status !== 'Approved') return next(new AppError('Only approved applications can be enrolled', 400));

  const {
    email, admissionNo, classId, admissionDate,
  } = req.body;

  const existing = email ? await User.findOne({ email }) : null;
  if (existing) return next(new AppError('A user with this email already exists', 400));

  const resolvedClassId = classId || admission.desiredClassId;
  if (resolvedClassId && !(await Class.findById(resolvedClassId))) return next(new AppError('Class not found', 400));

  const { student, tempPassword } = await createStudentAccount({
    email,
    admissionNo,
    firstName: admission.firstName,
    lastName: admission.lastName,
    gender: admission.gender,
    dateOfBirth: admission.dateOfBirth,
    classId: resolvedClassId,
    address: admission.address,
    admissionDate,
    guardians: admission.guardians,
    safetyNotes: [],
  });

  admission.status = 'Enrolled';
  admission.enrolledStudentId = student.id;
  await admission.save();

  await auditLog.record({
    req,
    action: 'admission.enroll',
    entityType: 'Admission',
    entityId: admission.id,
    description: `Enrolled admission application: ${admission.firstName} ${admission.lastName}`,
    metadata: { studentId: student.id },
  });

  res.status(201).json({ success: true, data: { studentId: student.id, tempPassword } });
});

// DELETE /admissions/:id — only Applied or Rejected
const remove = asyncHandler(async (req, res, next) => {
  const admission = await findAdmissionOr404(req.params.id, next);
  if (!admission) return;
  if (!['Applied', 'Rejected'].includes(admission.status)) {
    return next(new AppError('Only applied or rejected applications can be deleted', 400));
  }
  await auditLog.record({
    req, action: 'admission.remove', entityType: 'Admission', entityId: admission.id, description: `Deleted admission application: ${admission.firstName} ${admission.lastName}`,
  });
  await admission.deleteOne();
  res.json({ success: true, data: null });
});

module.exports = {
  list, create, update, approve, reject, enroll, nextAdmissionNo, remove,
};
