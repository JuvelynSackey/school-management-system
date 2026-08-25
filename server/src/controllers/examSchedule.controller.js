const {
  ExamSchedule, Class, Subject, AcademicTerm, Student,
} = require('../models');
const asyncHandler = require('../middleware/asyncHandler');
const AppError = require('../utils/AppError');
const { getTeacherClassIds } = require('../services/teacherScope.service');
const { getParentStudentIds } = require('../services/parentScope.service');
const auditLog = require('../services/auditLog.service');

const populate = (query) => query
  .populate('class', 'name section')
  .populate('subject', 'name')
  .populate('academicTerm', 'name academicYear');

// Every role sees the same shape, just pre-filtered to what they're allowed
// to see -- admins get everything (optionally filtered), everyone else is
// scoped to their own class(es) before classId/academicTermId query filters
// are applied on top.
const resolveVisibleClassIds = async (req) => {
  if (req.user.role === 'admin') return null; // null = no restriction
  if (req.user.role === 'teacher') {
    const { classIds } = await getTeacherClassIds(req.user.id);
    return classIds;
  }
  if (req.user.role === 'student') {
    const student = await Student.findOne({ userId: req.user.id }, { classId: 1 });
    return student?.classId ? [student.classId.toString()] : [];
  }
  if (req.user.role === 'parent') {
    const { studentIds } = await getParentStudentIds(req.user.id);
    if (studentIds.length === 0) return [];
    const children = await Student.find({ _id: { $in: studentIds } }, { classId: 1 });
    return [...new Set(children.map((c) => c.classId?.toString()).filter(Boolean))];
  }
  return [];
};

// GET /exam-schedules?classId=&academicTermId=
const list = asyncHandler(async (req, res) => {
  const { classId, academicTermId } = req.query;
  const visibleClassIds = await resolveVisibleClassIds(req);

  const where = {};
  if (academicTermId) where.academicTermId = academicTermId;
  if (visibleClassIds === null) {
    if (classId) where.classId = classId;
  } else {
    where.classId = classId ? { $in: visibleClassIds.filter((id) => id === classId) } : { $in: visibleClassIds };
  }

  const rows = await populate(ExamSchedule.find(where)).sort({ examDate: 1, startTime: 1 });
  res.json({ success: true, data: rows });
});

// POST /exam-schedules { academicTermId, classId, subjectId, examDate, startTime, endTime, room }
const create = asyncHandler(async (req, res, next) => {
  const {
    academicTermId, classId, subjectId, examDate, startTime, endTime, room,
  } = req.body;

  const [term, classRow, subject] = await Promise.all([
    AcademicTerm.findById(academicTermId),
    Class.findById(classId),
    Subject.findById(subjectId),
  ]);
  if (!term) return next(new AppError('Academic term not found', 404));
  if (!classRow) return next(new AppError('Class not found', 404));
  if (!subject) return next(new AppError('Subject not found', 404));

  if (startTime >= endTime) return next(new AppError('startTime must be before endTime', 400));

  const existing = await ExamSchedule.findOne({ academicTermId, classId, subjectId });
  if (existing) return next(new AppError('An exam is already scheduled for this class/subject/term', 400));

  const schedule = await ExamSchedule.create({
    academicTermId, classId, subjectId, examDate, startTime, endTime, room: room || null,
  });

  await auditLog.record({
    req,
    action: 'examSchedule.create',
    entityType: 'ExamSchedule',
    entityId: schedule.id,
    description: `Scheduled ${subject.name} exam for ${classRow.name} ${classRow.section || ''} on ${examDate}`,
  });

  res.status(201).json({ success: true, data: await populate(ExamSchedule.findById(schedule.id)) });
});

// PUT /exam-schedules/:id { examDate, startTime, endTime, room }
const update = asyncHandler(async (req, res, next) => {
  const schedule = await ExamSchedule.findById(req.params.id);
  if (!schedule) return next(new AppError('Exam schedule not found', 404));

  const {
    examDate, startTime, endTime, room,
  } = req.body;
  const nextStart = startTime ?? schedule.startTime;
  const nextEnd = endTime ?? schedule.endTime;
  if (nextStart >= nextEnd) return next(new AppError('startTime must be before endTime', 400));

  schedule.examDate = examDate ?? schedule.examDate;
  schedule.startTime = nextStart;
  schedule.endTime = nextEnd;
  schedule.room = room === undefined ? schedule.room : (room || null);
  await schedule.save();

  await auditLog.record({
    req, action: 'examSchedule.update', entityType: 'ExamSchedule', entityId: schedule.id, description: 'Updated an exam schedule entry',
  });

  res.json({ success: true, data: await populate(ExamSchedule.findById(schedule.id)) });
});

// DELETE /exam-schedules/:id
const remove = asyncHandler(async (req, res, next) => {
  const schedule = await ExamSchedule.findById(req.params.id);
  if (!schedule) return next(new AppError('Exam schedule not found', 404));
  await schedule.deleteOne();

  await auditLog.record({
    req, action: 'examSchedule.remove', entityType: 'ExamSchedule', entityId: schedule.id, description: 'Removed an exam schedule entry',
  });

  res.json({ success: true, data: null });
});

module.exports = {
  list, create, update, remove,
};
