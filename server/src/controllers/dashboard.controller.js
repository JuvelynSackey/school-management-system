const {
  Student, Teacher, Class, Subject, Attendance, Fee, Payment, AcademicTerm, TerminalReport,
} = require('../models');
const asyncHandler = require('../middleware/asyncHandler');
const { getTeacherClassIds } = require('../services/teacherScope.service');
const { getFeeBalance } = require('../services/fees.service');

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
  const allClasses = await Class.find({}, { name: 1, section: 1, stage: 1, classTeacherId: 1 })
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
    }))
    .sort((a, b) => Number(a.submitted) - Number(b.submitted));

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

  // --- Term report approval progress ---
  let termReportApprovalPercent = null;
  if (currentTerm) {
    const [lockedCount, totalReportsCount] = await Promise.all([
      TerminalReport.countDocuments({ academicTermId: currentTerm.id, status: 'Locked' }),
      TerminalReport.countDocuments({ academicTermId: currentTerm.id }),
    ]);
    termReportApprovalPercent = totalReportsCount > 0 ? (lockedCount / totalReportsCount) * 100 : null;
  }

  return {
    role: 'admin',
    counts: { students: studentCount, teachers: teacherCount, classes: classCount, subjects: subjectCount },
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

const getTeacherDashboard = async (userId) => {
  const { classIds } = await getTeacherClassIds(userId);
  const studentCount = await Student.countDocuments({ classId: { $in: classIds }, status: 'active' });

  const today = new Date().toISOString().slice(0, 10);
  const todayAttendance = await Attendance.find({ classId: { $in: classIds }, attendanceDate: today });
  const attendanceStats = todayAttendance.reduce((acc, r) => {
    acc[r.status] = (acc[r.status] || 0) + 1;
    acc.total += 1;
    return acc;
  }, { total: 0, Present: 0, Absent: 0, Late: 0, Excused: 0 });

  return {
    role: 'teacher',
    counts: { classes: classIds.length, students: studentCount },
    attendanceStats,
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

const getDashboard = asyncHandler(async (req, res) => {
  let data;
  if (req.user.role === 'admin') data = await getAdminDashboard();
  else if (req.user.role === 'teacher') data = await getTeacherDashboard(req.user.id);
  else data = await getStudentDashboard(req.user.id);

  res.json({ success: true, data });
});

module.exports = { getDashboard };
