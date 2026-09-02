// The three deterministic query templates behind the Natural-Language Admin
// Assistant, plus the hint-resolution helpers. Every query here is an
// ordinary Mongoose call running inside the caller's own request — tenant
// scoping is enforced by the same plugin as everywhere else in the app,
// regardless of what a hint string says. A hint that matches nothing in
// THIS school resolves to "not found"; it can never reach into another
// tenant's data, because this was never a raw AI-supplied query to begin
// with — only a short hint string used to look something up normally.
const {
  Class, AcademicTerm, Student, Result, Subject, Guardian, StudentGuardian, Attendance,
} = require('../models');
const { getOutstandingBalanceForStudentTerm } = require('./fees.service');
const earlyWarning = require('./earlyWarning.service');
const { getSchemeForSchool } = require('./grading.service');
const { classAverages, subjectPassRates, round1 } = require('./academicAnalytics.service');
const { getTeachersWithUnsubmittedMarksheets } = require('./teacherSubmissionStatus.service');
const { computeAggregatesForStudent } = require('./terminalReports.service');

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const resolveClassHint = async (hint) => {
  if (!hint) return { classId: null, notFound: false };
  const match = await Class.findOne({ name: new RegExp(escapeRegex(hint), 'i') });
  return { classId: match?.id || null, notFound: !match };
};

const resolveTermHint = async (hint) => {
  if (!hint) {
    const current = await AcademicTerm.findOne({ isCurrent: true });
    return { academicTermId: current?.id || null, notFound: !current };
  }
  const match = await AcademicTerm.findOne({ name: new RegExp(escapeRegex(hint), 'i') });
  return { academicTermId: match?.id || null, notFound: !match };
};

// "which students owe more than X" / "unpaid tuition in class Y"
const runFeeArrearsQuery = async ({ classId, minBalance }, academicTermId) => {
  const studentQuery = { status: 'active' };
  if (classId) studentQuery.classId = classId;
  const students = await Student.find(studentQuery).select('firstName lastName classId').populate('classId', 'name section');

  const rows = (await Promise.all(students.map(async (s) => {
    const balance = await getOutstandingBalanceForStudentTerm(s.id, academicTermId);
    if (balance <= 0) return null;
    if (minBalance != null && balance < minBalance) return null;
    return {
      studentId: s.id,
      name: `${s.firstName} ${s.lastName}`,
      className: s.classId ? `${s.classId.name} ${s.classId.section || ''}`.trim() : null,
      outstandingBalance: balance,
    };
  }))).filter(Boolean);

  return rows.sort((a, b) => b.outstandingBalance - a.outstandingBalance);
};

// "which subjects had the lowest average scores in Term 2"
const runSubjectAverageQuery = async (academicTermId) => {
  const results = await Result.find({ academicTermId }).select('subjectId totalScore');
  const bySubject = new Map();
  results.forEach((r) => {
    const key = r.subjectId.toString();
    if (!bySubject.has(key)) bySubject.set(key, []);
    bySubject.get(key).push(r.totalScore);
  });

  const subjectIds = [...bySubject.keys()];
  const subjects = await Subject.find({ _id: { $in: subjectIds } }).select('name');
  const nameById = new Map(subjects.map((s) => [s.id, s.name]));

  return subjectIds
    .map((id) => {
      const scores = bySubject.get(id);
      const averageScore = Math.round((scores.reduce((sum, v) => sum + v, 0) / scores.length) * 10) / 10;
      return {
        subjectId: id, subjectName: nameById.get(id) || 'Unknown subject', averageScore, studentCount: scores.length,
      };
    })
    .sort((a, b) => a.averageScore - b.averageScore);
};

// "which students need attention this term" — reuses Phase 4's exact
// detection logic (earlyWarning.service.js), school-wide, since this
// endpoint is admin-only.
const runAtRiskStudentsQuery = async (academicTermId, schoolId) => {
  const students = await Student.find({ status: 'active' }).select('firstName lastName classId').populate('classId', 'name section');
  const scheme = await getSchemeForSchool(schoolId);

  const flagged = (await Promise.all(students.map(async (s) => {
    const academicFlags = await earlyWarning.detectRiskFlags({ studentId: s.id, academicTermId, scheme });
    if (academicFlags.length === 0) return null;
    return {
      studentId: s.id,
      name: `${s.firstName} ${s.lastName}`,
      className: s.classId ? `${s.classId.name} ${s.classId.section || ''}`.trim() : null,
      flagTypes: academicFlags.map((f) => f.type),
    };
  }))).filter(Boolean);

  return flagged;
};

// "which subjects have pass rates below 50%" — reuses the exact same
// per-subject pass-rate aggregate the Intelligence page's "Subjects Needing
// Attention" card already computes, so the two never quietly disagree.
const runSubjectsBelowPassRateQuery = async (schoolId, academicTermId, threshold) => {
  const cutoff = threshold ?? 50;
  const rates = await subjectPassRates(schoolId, academicTermId);
  return rates
    .filter((r) => r.passRate < cutoff)
    .sort((a, b) => a.passRate - b.passRate);
};

// "which class performed best" — reuses the same classAverages aggregate
// the /analytics page and /intelligence's "Class Performance" card use.
const runClassPerformanceRankingQuery = async (schoolId, academicTermId) => {
  const rows = await classAverages(schoolId, academicTermId);
  const classes = await Class.find({ _id: { $in: rows.map((r) => r._id) } }, { name: 1, section: 1 });
  const classById = new Map(classes.map((c) => [c.id, c]));

  return rows
    .map((r) => {
      const key = r._id.toString();
      const cls = classById.get(key);
      return {
        classId: key,
        className: cls ? `${cls.name} ${cls.section || ''}`.trim() : 'Unknown',
        average: round1(r.average),
        resultCount: r.count,
      };
    })
    .sort((a, b) => b.average - a.average);
};

// "which teachers have unsubmitted marksheets" — reuses the exact same
// definition the admin dashboard's Action Center count uses.
const runTeachersUnsubmittedMarksheetsQuery = async (academicTermId) => getTeachersWithUnsubmittedMarksheets(academicTermId);

// "which guardians don't have a portal login yet" — Guardian.userId has no
// `default`, same reasoning as every other sparse-partial-index field in
// this app (Subject.code, Student.waecIndexNumber): a truly-absent field is
// what "$exists: false" means, not an explicit null.
const runGuardiansWithoutLoginQuery = async () => {
  const guardians = await Guardian.find({ userId: { $exists: false } });
  const links = await StudentGuardian.find({ guardianId: { $in: guardians.map((g) => g.id) } }).populate('student', 'firstName lastName');
  const childrenByGuardian = new Map();
  links.forEach((l) => {
    if (!l.student) return;
    const key = l.guardianId.toString();
    if (!childrenByGuardian.has(key)) childrenByGuardian.set(key, []);
    childrenByGuardian.get(key).push(`${l.student.firstName} ${l.student.lastName}`);
  });

  return guardians.map((g) => ({
    guardianId: g.id,
    name: g.fullName,
    phone: g.phone,
    children: childrenByGuardian.get(g.id)?.join(', ') || null,
  }));
};

// "which classes have no homeroom teacher"
const runClassesWithoutHomeroomQuery = async () => {
  const classes = await Class.find({ classTeacherId: null }, { name: 1, section: 1 });
  return classes.map((c) => ({ classId: c.id, className: `${c.name} ${c.section || ''}`.trim() }));
};

// Teacher-scoped: "how is attendance in my classes this term" — classIds
// comes from getTeacherClassIds(req.user.id) in the controller, never from
// a client-supplied value, so this can only ever cover classes the
// requesting teacher actually teaches/homerooms.
const runMyClassAttendanceSummaryQuery = async (classIds, academicTermId) => {
  if (classIds.length === 0) return [];
  const [classes, records] = await Promise.all([
    Class.find({ _id: { $in: classIds } }, { name: 1, section: 1 }),
    Attendance.find({ classId: { $in: classIds }, academicTermId }),
  ]);

  const byClass = new Map();
  records.forEach((r) => {
    const key = r.classId.toString();
    if (!byClass.has(key)) byClass.set(key, { present: 0, absent: 0, late: 0, excused: 0 });
    const bucket = byClass.get(key);
    if (r.status === 'Present') bucket.present += 1;
    else if (r.status === 'Absent') bucket.absent += 1;
    else if (r.status === 'Late') bucket.late += 1;
    else if (r.status === 'Excused') bucket.excused += 1;
  });

  return classes.map((c) => ({
    classId: c.id,
    className: `${c.name} ${c.section || ''}`.trim(),
    ...(byClass.get(c.id) || {
      present: 0, absent: 0, late: 0, excused: 0,
    }),
  }));
};

// Teacher-scoped: "which of my marksheets are still unsubmitted" — reuses
// the whole-school function, then narrows to the one row matching the
// requesting teacher's own teacherId (resolved server-side from
// req.user.id in the controller, never a client-supplied id).
const runMyUnsubmittedMarksheetsQuery = async (teacherId, academicTermId) => {
  const all = await getTeachersWithUnsubmittedMarksheets(academicTermId);
  const own = all.find((row) => row.teacherId === teacherId);
  return own ? own.pending : [];
};

// Parent-scoped: "how much do I owe" — studentIds comes from
// getParentStudentIds(req.user.id) in the controller.
const runMyChildFeeBalanceQuery = async (studentIds, academicTermId) => {
  if (studentIds.length === 0) return [];
  const students = await Student.find({ _id: { $in: studentIds } }).select('firstName lastName classId').populate('classId', 'name section');
  return Promise.all(students.map(async (s) => ({
    studentId: s.id,
    name: `${s.firstName} ${s.lastName}`,
    className: s.classId ? `${s.classId.name} ${s.classId.section || ''}`.trim() : null,
    outstandingBalance: await getOutstandingBalanceForStudentTerm(s.id, academicTermId),
  })));
};

// Parent-scoped: "how is my child doing" — same computeAggregatesForStudent
// already used for terminal report generation, so this can never quietly
// disagree with the actual report card.
const runMyChildResultsSummaryQuery = async (studentIds, academicTermId) => {
  if (studentIds.length === 0) return [];
  const students = await Student.find({ _id: { $in: studentIds } }).select('firstName lastName classId');
  return Promise.all(students.map(async (s) => {
    const aggregates = await computeAggregatesForStudent(s.id, s.classId, academicTermId);
    return {
      studentId: s.id,
      name: `${s.firstName} ${s.lastName}`,
      averageScore: aggregates.averageScore != null ? round1(aggregates.averageScore) : null,
      totalAttendance: aggregates.totalAttendance,
      outOfAttendance: aggregates.outOfAttendance,
    };
  }));
};

module.exports = {
  resolveClassHint,
  resolveTermHint,
  runFeeArrearsQuery,
  runSubjectAverageQuery,
  runAtRiskStudentsQuery,
  runSubjectsBelowPassRateQuery,
  runClassPerformanceRankingQuery,
  runTeachersUnsubmittedMarksheetsQuery,
  runGuardiansWithoutLoginQuery,
  runClassesWithoutHomeroomQuery,
  runMyClassAttendanceSummaryQuery,
  runMyUnsubmittedMarksheetsQuery,
  runMyChildFeeBalanceQuery,
  runMyChildResultsSummaryQuery,
};
