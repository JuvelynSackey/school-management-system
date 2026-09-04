const models = require('../models');
const {
  Teacher, User, Class, TeacherSubjectAssignment,
} = models;
const asyncHandler = require('../middleware/asyncHandler');
const AppError = require('../utils/AppError');
const { deleteWithCascade } = require('../services/cascadeDelete.service');
const { createTeacherAccount } = require('../services/teacherEnrollment.service');
const auditLog = require('../services/auditLog.service');

const list = asyncHandler(async (req, res) => {
  const teachers = await Teacher.find().populate('user', 'email status').sort({ firstName: 1 });
  res.json({ success: true, data: teachers });
});

const getById = asyncHandler(async (req, res, next) => {
  const teacher = await Teacher.findById(req.params.id).populate('user', 'email status');
  if (!teacher) return next(new AppError('Teacher not found', 404));
  res.json({ success: true, data: teacher });
});

const create = asyncHandler(async (req, res, next) => {
  const {
    email, staffNo, firstName, lastName, gender, phone, hireDate, qualification,
    homeroomClassId, subjectAssignments,
  } = req.body;

  let result;
  try {
    result = await createTeacherAccount({
      email, staffNo, firstName, lastName, gender, phone, hireDate, qualification, homeroomClassId, subjectAssignments,
    });
  } catch (err) {
    if (err instanceof AppError) return next(err);
    throw err;
  }
  const { teacher, user, tempPassword, homeroomAssigned, assignmentCount } = result;

  await auditLog.record({
    req,
    action: 'teacher.create',
    entityType: 'Teacher',
    entityId: teacher.id,
    description: `Created teacher: ${firstName} ${lastName} (${staffNo})`
      + (homeroomAssigned ? ', assigned as homeroom teacher' : '')
      + (assignmentCount > 0 ? `, with ${assignmentCount} subject assignment(s)` : ''),
  });

  res.status(201).json({
    success: true,
    data: { ...teacher.toJSON(), user: { id: user.id, email: user.email }, tempPassword },
  });
});

const update = asyncHandler(async (req, res, next) => {
  const teacher = await Teacher.findById(req.params.id);
  if (!teacher) return next(new AppError('Teacher not found', 404));

  const { staffNo, firstName, lastName, gender, phone, hireDate, qualification, status } = req.body;
  const previousStatus = teacher.status;

  teacher.staffNo = staffNo ?? teacher.staffNo;
  teacher.firstName = firstName ?? teacher.firstName;
  teacher.lastName = lastName ?? teacher.lastName;
  teacher.gender = gender === undefined ? teacher.gender : gender;
  teacher.phone = phone === undefined ? teacher.phone : phone;
  teacher.hireDate = hireDate === undefined ? teacher.hireDate : hireDate;
  teacher.qualification = qualification === undefined ? teacher.qualification : qualification;
  teacher.status = status ?? teacher.status;
  await teacher.save();

  if (status) {
    await User.updateOne({ _id: teacher.userId }, { $set: { status: status === 'active' ? 'active' : 'inactive' } });
  }

  if (status && status !== previousStatus) {
    await auditLog.record({
      req,
      action: 'teacher.statusChange',
      entityType: 'Teacher',
      entityId: teacher.id,
      description: `Changed status of ${teacher.firstName} ${teacher.lastName} from ${previousStatus} to ${status}`,
    });
  }

  res.json({ success: true, data: teacher });
});

const remove = asyncHandler(async (req, res, next) => {
  const teacher = await Teacher.findById(req.params.id);
  if (!teacher) return next(new AppError('Teacher not found', 404));

  // Historical Results/ResultSheets survive a delete either way (their
  // recordedBy/submittedBy just gets set to null — see
  // cascadeDelete.service.js), but a teacher still actively assigned as a
  // homeroom or subject teacher shouldn't be deletable in one click:
  // reassigning first, then deactivating, is the safe offboarding path.
  const [homeroomCount, assignmentCount] = await Promise.all([
    Class.countDocuments({ classTeacherId: teacher.id }),
    TeacherSubjectAssignment.countDocuments({ teacherId: teacher.id }),
  ]);
  if (homeroomCount > 0 || assignmentCount > 0) {
    return next(new AppError('Cannot delete teacher with active class or subject assignments. Please reassign their classes and deactivate the account instead.', 400));
  }

  await auditLog.record({
    req, action: 'teacher.remove', entityType: 'Teacher', entityId: teacher.id, description: `Deleted teacher: ${teacher.firstName} ${teacher.lastName}`,
  });
  await deleteWithCascade(models, User, teacher.userId); // cascades to the teacher profile too
  res.json({ success: true, data: null });
});

// POST /teachers/me/signature — a teacher uploading their own signature
// image, embedded on terminal report cards when they're the class's
// homeroom teacher (see reportCardTemplate.service.js). Self only: scoped
// to req.user.id, never a :id param, so a teacher can't touch another
// teacher's record.
const uploadMySignature = asyncHandler(async (req, res, next) => {
  if (!req.file) return next(new AppError('A signature image is required', 400));

  const signatureUrl = `${req.protocol}://${req.get('host')}/uploads/signatures/${req.file.filename}`;
  const teacher = await Teacher.findOneAndUpdate(
    { userId: req.user.id },
    { $set: { signatureUrl } },
    { new: true },
  );
  if (!teacher) return next(new AppError('Teacher profile not found', 404));

  await auditLog.record({
    req, action: 'teacher.signatureUpload', entityType: 'Teacher', entityId: teacher.id, description: 'Uploaded their signature',
  });

  res.json({ success: true, data: { signatureUrl } });
});

module.exports = {
  list, getById, create, update, remove, uploadMySignature,
};
