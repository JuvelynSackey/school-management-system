const { Result, Student, Subject, AcademicTerm, Teacher, TerminalReport } = require('../models');
const asyncHandler = require('../middleware/asyncHandler');
const AppError = require('../utils/AppError');
const { computeGrade } = require('../services/grading.service');
const { getTeacherClassIds } = require('../services/teacherScope.service');
const { recalculateSubjectPositions } = require('../services/terminalReports.service');

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

// GET /results/roster?classId=&subjectId=&academicTermId=
const getRoster = asyncHandler(async (req, res, next) => {
  const { classId, subjectId, academicTermId } = req.query;
  if (!classId || !subjectId || !academicTermId) {
    return next(new AppError('classId, subjectId, and academicTermId are required', 400));
  }

  await assertClassAccess(req, classId);

  const students = await Student.find({ classId, status: 'active' })
    .select('firstName lastName admissionNo')
    .sort({ firstName: 1 });

  const results = await Result.find({ classId, subjectId, academicTermId });
  const byStudent = new Map(results.map((r) => [r.studentId.toString(), r]));

  const roster = students.map((s) => {
    const existing = byStudent.get(s.id);
    return {
      studentId: s.id,
      firstName: s.firstName,
      lastName: s.lastName,
      admissionNo: s.admissionNo,
      classScore: existing?.classScore ?? '',
      examScore: existing?.examScore ?? '',
      totalScore: existing?.totalScore ?? null,
      grade: existing?.grade ?? null,
      subjectPosition: existing?.subjectPosition ?? null,
    };
  });

  res.json({ success: true, data: roster });
});

// POST /results/bulk { classId, subjectId, academicTermId, records: [{studentId, classScore, examScore, remarks}] }
const recordBulk = asyncHandler(async (req, res, next) => {
  const { classId, subjectId, academicTermId, records } = req.body;
  if (!classId || !subjectId || !academicTermId || !Array.isArray(records)) {
    return next(new AppError('classId, subjectId, academicTermId, and records are required', 400));
  }

  await assertClassAccess(req, classId);

  const studentIds = records.map((r) => r.studentId);
  const lockedCount = await TerminalReport.countDocuments({
    studentId: { $in: studentIds }, academicTermId, status: 'Locked',
  });
  if (lockedCount > 0) {
    return next(new AppError('One or more students\' terminal reports are locked for this term. Ask an admin to unlock before editing scores.', 400));
  }

  const teacher = req.user.role === 'teacher' ? await Teacher.findOne({ userId: req.user.id }) : null;

  await Promise.all(records.map((r) => Result.findOneAndUpdate(
    { studentId: r.studentId, subjectId, academicTermId },
    {
      $set: {
        studentId: r.studentId,
        subjectId,
        classId,
        academicTermId,
        classScore: r.classScore,
        examScore: r.examScore,
        totalScore: Number(r.classScore) + Number(r.examScore),
        grade: computeGrade(r.classScore, r.examScore),
        remarks: r.remarks || null,
        recordedBy: teacher?.id || null,
      },
    },
    { upsert: true },
  )));

  await recalculateSubjectPositions(classId, subjectId, academicTermId);

  const results = await Result.find({ classId, subjectId, academicTermId });
  res.json({ success: true, data: results });
});

const populateForHistory = (query) => query
  .populate('subject', 'name')
  .populate('academicTerm', 'name');

// GET /results/student/:studentId
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

  const results = await populateForHistory(Result.find({ studentId })).sort({ createdAt: -1 });

  res.json({ success: true, data: results });
});

// GET /results/me
const getMyResults = asyncHandler(async (req, res, next) => {
  const student = await Student.findOne({ userId: req.user.id });
  if (!student) return next(new AppError('Student profile not found', 404));

  const results = await populateForHistory(Result.find({ studentId: student.id })).sort({ createdAt: -1 });

  res.json({ success: true, data: results });
});

module.exports = { getRoster, recordBulk, getForStudent, getMyResults };
