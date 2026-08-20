const { Student, AcademicTerm } = require('../models');
const asyncHandler = require('../middleware/asyncHandler');
const AppError = require('../utils/AppError');
const { getTeacherClassIds } = require('../services/teacherScope.service');
const { getSchemeForSchool } = require('../services/grading.service');
const { getOutstandingBalanceForStudentTerm } = require('../services/fees.service');
const earlyWarning = require('../services/earlyWarning.service');
const aiService = require('../services/ai.service');

// GET /early-warning/at-risk-students?academicTermId=
// JesManage Intelligence, Stage 6 Phase 4. Admin sees every active student
// in the school; a teacher sees only students in their own assigned classes
// — there is no school-wide view for a teacher. Purely advisory: nothing
// here blocks any action anywhere else in the app, and appearing on this
// list changes nothing automatically.
const getAtRiskStudents = asyncHandler(async (req, res, next) => {
  let { academicTermId } = req.query;
  if (!academicTermId) {
    const currentTerm = await AcademicTerm.findOne({ isCurrent: true });
    if (!currentTerm) return next(new AppError('No current academic term is set for this school', 400));
    academicTermId = currentTerm.id;
  }

  const studentQuery = { status: 'active' };
  if (req.user.role === 'teacher') {
    const { classIds } = await getTeacherClassIds(req.user.id);
    studentQuery.classId = { $in: classIds };
  }
  // admin: no extra filter — every active student in the school.

  const students = await Student.find(studentQuery)
    .select('firstName lastName classId')
    .populate('classId', 'name section');
  const scheme = await getSchemeForSchool(req.user.schoolId);

  const flaggedStudents = (await Promise.all(students.map(async (s) => {
    const academicFlags = await earlyWarning.detectRiskFlags({ studentId: s.id, academicTermId, scheme });
    if (academicFlags.length === 0) return null;

    // Fee status is supportive context on a student ALREADY flagged for a
    // real academic/attendance reason — it never causes a student to appear
    // here on its own (see earlyWarning.service.js's boundary note).
    const outstandingBalance = await getOutstandingBalanceForStudentTerm(s.id, academicTermId);

    return {
      studentId: s.id,
      firstName: s.firstName,
      lastName: s.lastName,
      className: s.classId ? `${s.classId.name} ${s.classId.section || ''}`.trim() : null,
      academicFlags,
      outstandingBalance,
    };
  }))).filter(Boolean);

  let aiSynthesis = null;
  if (flaggedStudents.length > 0 && aiService.isAIConfigured()) {
    try {
      aiSynthesis = await aiService.generateInterventionSynthesis(flaggedStudents);
    } catch {
      aiSynthesis = null; // enrichment only — the flagged list below still stands on its own
    }
  }

  res.json({ success: true, data: { students: flaggedStudents, aiSynthesis } });
});

module.exports = { getAtRiskStudents };
