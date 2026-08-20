const { Attendance, Student, Class } = require('../models');
const asyncHandler = require('../middleware/asyncHandler');
const AppError = require('../utils/AppError');
const { getTeacherClassIds } = require('../services/teacherScope.service');
const { getParentStudentIds } = require('../services/parentScope.service');

const assertClassAccess = async (req, classId) => {
  if (req.user.role === 'admin') return;
  if (req.user.role === 'teacher') {
    const { classIds } = await getTeacherClassIds(req.user.id);
    if (!classIds.includes(String(classId))) {
      throw new AppError('You are not assigned to this class', 403);
    }
    return;
  }
  throw new AppError('You do not have permission to perform this action', 403);
};

// GET /attendance?classId=&date=  -> roster for that class with any existing attendance for that date
const getByClassDate = asyncHandler(async (req, res, next) => {
  const { classId, date } = req.query;
  if (!classId || !date) return next(new AppError('classId and date are required', 400));

  await assertClassAccess(req, classId);

  const students = await Student.find({ classId, status: 'active' })
    .select('firstName lastName admissionNo')
    .sort({ firstName: 1 });

  const records = await Attendance.find({ classId, attendanceDate: date });
  const byStudent = new Map(records.map((r) => [r.studentId.toString(), r]));

  const roster = students.map((s) => ({
    studentId: s.id,
    firstName: s.firstName,
    lastName: s.lastName,
    admissionNo: s.admissionNo,
    status: byStudent.get(s.id)?.status || null,
    remarks: byStudent.get(s.id)?.remarks || '',
  }));

  res.json({ success: true, data: roster });
});

// POST /attendance/bulk  { classId, date, academicTermId, records: [{studentId, status, remarks}] }
const recordBulk = asyncHandler(async (req, res, next) => {
  const { classId, date, academicTermId, records } = req.body;
  if (!classId || !date || !Array.isArray(records)) {
    return next(new AppError('classId, date, and records are required', 400));
  }
  if (!(await Class.findById(classId))) return next(new AppError('Class not found', 400));

  await assertClassAccess(req, classId);

  const results = await Promise.all(records.map((r) => Attendance.findOneAndUpdate(
    { studentId: r.studentId, attendanceDate: date },
    {
      $set: {
        studentId: r.studentId,
        classId,
        academicTermId: academicTermId || null,
        attendanceDate: date,
        status: r.status,
        remarks: r.remarks || null,
        recordedBy: req.user.id,
      },
    },
    { upsert: true, new: true },
  )));

  res.json({ success: true, data: results });
});

// GET /attendance/student/:studentId -> full history + summary for one student
const getForStudent = asyncHandler(async (req, res, next) => {
  const { studentId } = req.params;
  const student = await Student.findById(studentId);
  if (!student) return next(new AppError('Student not found', 404));

  if (req.user.role === 'student' && student.userId.toString() !== req.user.id) {
    return next(new AppError('You do not have permission to view this record', 403));
  }
  if (req.user.role === 'teacher') {
    const { classIds } = await getTeacherClassIds(req.user.id);
    if (!classIds.includes(student.classId?.toString())) {
      return next(new AppError('You do not have permission to view this record', 403));
    }
  }
  if (req.user.role === 'parent') {
    const { studentIds } = await getParentStudentIds(req.user.id);
    if (!studentIds.includes(student.id)) {
      return next(new AppError('You do not have permission to view this record', 403));
    }
  }

  const records = await Attendance.find({ studentId })
    .populate('academicTerm', 'name')
    .sort({ attendanceDate: -1 });

  const summary = records.reduce((acc, r) => {
    acc[r.status] = (acc[r.status] || 0) + 1;
    acc.total += 1;
    return acc;
  }, { total: 0, Present: 0, Absent: 0, Late: 0, Excused: 0 });

  res.json({ success: true, data: { records, summary } });
});

// GET /attendance/class/:classId/summary?date= -> per-student summary for a class (optionally up to a date)
const getClassSummary = asyncHandler(async (req, res, next) => {
  const { classId } = req.params;
  await assertClassAccess(req, classId);

  const students = await Student.find({ classId, status: 'active' }).select('firstName lastName admissionNo');

  const records = await Attendance.find({ classId });
  const byStudent = new Map();
  students.forEach((s) => byStudent.set(s.id, { total: 0, Present: 0, Absent: 0, Late: 0, Excused: 0 }));
  records.forEach((r) => {
    const bucket = byStudent.get(r.studentId.toString());
    if (!bucket) return;
    bucket[r.status] = (bucket[r.status] || 0) + 1;
    bucket.total += 1;
  });

  const summary = students.map((s) => ({
    studentId: s.id,
    firstName: s.firstName,
    lastName: s.lastName,
    admissionNo: s.admissionNo,
    ...byStudent.get(s.id),
  }));

  res.json({ success: true, data: summary });
});

// GET /attendance/me -> convenience wrapper for the logged-in student
const getMyAttendance = asyncHandler(async (req, res, next) => {
  const student = await Student.findOne({ userId: req.user.id });
  if (!student) return next(new AppError('Student profile not found', 404));

  const records = await Attendance.find({ studentId: student.id })
    .populate('academicTerm', 'name')
    .sort({ attendanceDate: -1 });

  const summary = records.reduce((acc, r) => {
    acc[r.status] = (acc[r.status] || 0) + 1;
    acc.total += 1;
    return acc;
  }, { total: 0, Present: 0, Absent: 0, Late: 0, Excused: 0 });

  res.json({ success: true, data: { records, summary } });
});

module.exports = { getByClassDate, recordBulk, getForStudent, getClassSummary, getMyAttendance };
