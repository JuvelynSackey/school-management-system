const {
  Student, Teacher, Class, Subject, Attendance, Fee, Payment, AcademicTerm, TerminalReport, SchoolSettings,
  TeacherSubjectAssignment, GradingScheme,
} = require('../models');
const asyncHandler = require('../middleware/asyncHandler');
const { getTeacherClassIds } = require('../services/teacherScope.service');
const { getParentStudentIds } = require('../services/parentScope.service');
const { getFeeBalance } = require('../services/fees.service');
const { getTeachersWithUnsubmittedMarksheets } = require('../services/teacherSubmissionStatus.service');
const teacherInsights = require('../services/teacherInsights.service');

const STAGES = ['Creche', 'Nursery', 'KG', 'Primary', 'JHS'];

const sumFeeStats = async (fees) => {
  const stats = { totalDue: 0, totalPaid: 0, outstanding: 0 };
  await Promise.all(fees.map(async (fee) => {
    const { amountPaid, balance } = await getFeeBalance(fee);
    stats.totalDue += Number(fee.amountDue);
    stats.totalPaid += amountPaid;
    stats.outstanding += balance;
  }));
  return stats;
};

const getAdminDashboard = async () => {
  const [studentCount, teacherCount, classCount, subjectCount] = await Promise.all([
    Student.countDocuments({ status: 'active' }),
    Teacher.countDocuments({ status: 'active' }),
    Class.countDocuments(),
    Subject.countDocuments(),
  ]);

  const today = new Date().toISOString().slice(0, 10);
  const todayAttendance = await Attendance.find({ attendanceDate: today });
  const attendanceStats = todayAttendance.reduce((acc, r) => {
    acc[r.status] = (acc[r.status] || 0) + 1;
    acc.total += 1;
    return acc;
  }, { total: 0, Present: 0, Absent: 0, Late: 0, Excused: 0 });
  const todayAttendancePercent = attendanceStats.total > 0
    ? ((attendanceStats.Present + attendanceStats.Late) / attendanceStats.total) * 100
    : null;

  const fees = await Fee.find();
  const feeStats = await sumFeeStats(fees);

  const currentTerm = await AcademicTerm.findOne({ isCurrent: true });
  const currentTermFees = currentTerm ? await Fee.find({ academicTermId: currentTerm.id }) : [];
  const currentTermFeeStats = await sumFeeStats(currentTermFees);

  const recentStudents = await Student.find()
    .select('firstName lastName admissionNo')
    .sort({ createdAt: -1 })
    .limit(5);
  const recentPayments = await Payment.find()
    .sort({ createdAt: -1 })
    .limit(5)
    .populate({ path: 'fee', populate: { path: 'student', select: 'firstName lastName' } });

  // --- Class enrolment breakdown by stage ---
  const allClasses = await Class.find({}, {
    name: 1, section: 1, stage: 1, classTeacherId: 1, levelOrder: 1,
  })
    .populate('classTeacher', 'firstName lastName');
  const activeStudents = await Student.find({ status: 'active' }, { classId: 1 });
  const classById = new Map(allClasses.map((c) => [c.id, c]));
  const classEnrolmentByStage = Object.fromEntries(STAGES.map((s) => [s, 0]));
  activeStudents.forEach((s) => {
    const stage = classById.get(s.classId?.toString())?.stage;
    if (stage && classEnrolmentByStage[stage] !== undefined) classEnrolmentByStage[stage] += 1;
  });

  // --- Daily attendance monitor: every class's submitted/pending status today ---
  const classesWithTodayAttendance = new Set(todayAttendance.map((a) => a.classId.toString()));
  const attendanceMonitor = allClasses
    .map((c) => ({
      id: c.id,
      name: c.name,
      section: c.section,
      teacherName: c.classTeacher ? `${c.classTeacher.firstName} ${c.classTeacher.lastName}` : null,
      submitted: classesWithTodayAttendance.has(c.id),
      levelOrder: c.levelOrder,
    }))
    .sort((a, b) => Number(a.submitted) - Number(b.submitted) || a.levelOrder - b.levelOrder);

  // --- Alerts ---
  const pendingApprovalsCount = await TerminalReport.countDocuments({ status: 'Submitted' });

  const unassignedClasses = allClasses
    .filter((c) => !c.classTeacherId)
    .map((c) => ({ id: c.id, name: c.name, section: c.section }));

  const overdueFeeRows = await Fee.find({ dueDate: { $lt: today }, status: { $ne: 'Paid' } });
  const overdueBalances = await Promise.all(overdueFeeRows.map((f) => getFeeBalance(f)));
  const overdueFees = {
    count: overdueFeeRows.length,
    total: overdueBalances.reduce((sum, b) => sum + b.balance, 0),
  };

  // "unsubmitted marks" count for the Action Center — shared with Ask
  // JesManage's "which teachers have unsubmitted marksheets" query so the
  // two can never quietly report different numbers for the same thing.
  const teachersUnsubmittedCount = currentTerm
    ? (await getTeachersWithUnsubmittedMarksheets(currentTerm.id)).length
    : 0;

  // --- Term report approval progress ---
  let termReportApprovalPercent = null;
  if (currentTerm) {
    const [lockedCount, totalReportsCount] = await Promise.all([
      TerminalReport.countDocuments({ academicTermId: currentTerm.id, status: 'Locked' }),
      TerminalReport.countDocuments({ academicTermId: currentTerm.id }),
    ]);
    termReportApprovalPercent = totalReportsCount > 0 ? (lockedCount / totalReportsCount) * 100 : null;
  }

  // --- Setup readiness (surfaced as a banner until the school is fully set up) ---
  const settings = await SchoolSettings.findOne();
  // findOne, not exists() -- exists() isn't in tenantScopePlugin's scoped
  // op list (only find/findOne/countDocuments/etc. are), so it would read
  // across every school in the database instead of just this one.
  const [hasAcademicTermDoc, hasGradingSchemeDoc] = await Promise.all([
    AcademicTerm.findOne({}, { _id: 1 }),
    // Meaningful even though getSchemeForSchool() elsewhere auto-creates a
    // NaCCA-default scheme on first read -- a brand-new school that hasn't
    // touched results/grading anywhere yet (the exact audience this banner
    // is for) won't have triggered that, so this still reads as "not done"
    // at the point that actually matters.
    GradingScheme.findOne({}, { _id: 1 }),
  ]);
  const setupChecklist = {
    hasSchoolInfo: Boolean(settings?.address && settings?.phone),
    hasLogo: Boolean(settings?.logoUrl),
    hasClassesAndSubjects: classCount > 0 && subjectCount > 0,
    hasTeachers: teacherCount > 0,
    hasStudents: studentCount > 0,
    hasAcademicTerm: Boolean(hasAcademicTermDoc),
    hasGradingScheme: Boolean(hasGradingSchemeDoc),
  };
  const completedCount = Object.values(setupChecklist).filter(Boolean).length;
  const setupStatus = {
    ...setupChecklist,
    percentComplete: Math.round((completedCount / Object.keys(setupChecklist).length) * 100),
  };

  return {
    role: 'admin',
    counts: { students: studentCount, teachers: teacherCount, classes: classCount, subjects: subjectCount },
    currentTermId: currentTerm?.id || null,
    setupStatus,
    attendanceStats,
    todayAttendancePercent,
    termReportApprovalPercent,
    feeStats,
    currentTermFeeStats,
    classEnrolmentByStage,
    attendanceMonitor,
    alerts: {
      pendingApprovalsCount,
      unassignedClasses,
      overdueFees,
      teachersUnsubmittedCount,
    },
    recentActivity: {
      students: recentStudents,
      payments: recentPayments.map((p) => ({
        id: p.id,
        amountPaid: p.amountPaid,
        paymentDate: p.paymentDate,
        studentName: p.fee?.student ? `${p.fee.student.firstName} ${p.fee.student.lastName}` : null,
      })),
    },
  };
};

const getTeacherDashboard = async (userId, schoolId) => {
  const { teacherId, classIds } = await getTeacherClassIds(userId);
  const studentCount = await Student.countDocuments({ classId: { $in: classIds }, status: 'active' });

  const today = new Date().toISOString().slice(0, 10);
  const todayAttendance = await Attendance.find({ classId: { $in: classIds }, attendanceDate: today });
  const attendanceStats = todayAttendance.reduce((acc, r) => {
    acc[r.status] = (acc[r.status] || 0) + 1;
    acc.total += 1;
    return acc;
  }, { total: 0, Present: 0, Absent: 0, Late: 0, Excused: 0 });

  // The class/subject pairs this teacher is assigned to, for the dashboard's
  // "My Classes" cards. There's no timetable/period model in this app, so
  // this is every assignment the teacher has — not literally filtered to
  // "today" — deduped since an assignment can exist once per term plus once
  // with a null (all-terms) academicTermId.
  const assignments = teacherId
    ? await TeacherSubjectAssignment.find({ teacherId })
      .populate('class', 'name section')
      .populate('subject', 'name')
    : [];
  const seenPairs = new Set();
  const myClasses = assignments
    .filter((a) => a.class && a.subject)
    .filter((a) => {
      const key = `${a.classId}:${a.subjectId}`;
      if (seenPairs.has(key)) return false;
      seenPairs.add(key);
      return true;
    })
    .map((a) => ({
      classId: a.classId.toString(),
      className: `${a.class.name} ${a.class.section || ''}`.trim(),
      subjectId: a.subjectId.toString(),
      subjectName: a.subject.name,
    }));

  // Insights only need the current term's data and only make sense once the
  // teacher actually has assignments/classes — skipped otherwise rather
  // than running empty aggregates.
  const currentTerm = await AcademicTerm.findOne({ isCurrent: true });
  const [assignmentPerformance, topImprovingStudents] = currentTerm
    ? await Promise.all([
      teacherInsights.getAssignmentPerformance(schoolId, currentTerm.id, myClasses),
      teacherInsights.getTopImprovingStudents(schoolId, classIds),
    ])
    : [[], []];

  return {
    role: 'teacher',
    counts: { classes: classIds.length, students: studentCount },
    attendanceStats,
    myClasses,
    insights: {
      currentTermId: currentTerm?.id || null,
      assignmentPerformance,
      topImprovingStudents,
    },
  };
};

const getStudentDashboard = async (userId) => {
  const student = await Student.findOne({ userId });
  if (!student) return { role: 'student', counts: {}, attendanceStats: null, feeStats: null };

  const records = await Attendance.find({ studentId: student.id });
  const attendanceStats = records.reduce((acc, r) => {
    acc[r.status] = (acc[r.status] || 0) + 1;
    acc.total += 1;
    return acc;
  }, { total: 0, Present: 0, Absent: 0, Late: 0, Excused: 0 });

  const fees = await Fee.find({ studentId: student.id });
  const feeStats = await sumFeeStats(fees);

  return { role: 'student', attendanceStats, feeStats };
};

const getParentDashboard = async (userId) => {
  const { studentIds } = await getParentStudentIds(userId);
  const children = await Student.find({ _id: { $in: studentIds } })
    .populate('class', 'name section')
    .select('firstName lastName admissionNo classId status');

  const childSummaries = await Promise.all(children.map(async (child) => {
    const records = await Attendance.find({ studentId: child.id });
    const attendanceStats = records.reduce((acc, r) => {
      acc[r.status] = (acc[r.status] || 0) + 1;
      acc.total += 1;
      return acc;
    }, { total: 0, Present: 0, Absent: 0, Late: 0, Excused: 0 });

    const fees = await Fee.find({ studentId: child.id });
    const feeStats = await sumFeeStats(fees);

    return {
      id: child.id,
      firstName: child.firstName,
      lastName: child.lastName,
      admissionNo: child.admissionNo,
      className: child.class ? `${child.class.name} ${child.class.section || ''}`.trim() : null,
      attendanceStats,
      feeStats,
    };
  }));

  return { role: 'parent', children: childSummaries };
};

const getDashboard = asyncHandler(async (req, res) => {
  let data;
  if (req.user.role === 'admin') data = await getAdminDashboard();
  else if (req.user.role === 'teacher') data = await getTeacherDashboard(req.user.id, req.user.schoolId);
  else if (req.user.role === 'parent') data = await getParentDashboard(req.user.id);
  else data = await getStudentDashboard(req.user.id);

  res.json({ success: true, data });
});

module.exports = { getDashboard };
