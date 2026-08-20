// The three deterministic query templates behind the Natural-Language Admin
// Assistant, plus the hint-resolution helpers. Every query here is an
// ordinary Mongoose call running inside the caller's own request — tenant
// scoping is enforced by the same plugin as everywhere else in the app,
// regardless of what a hint string says. A hint that matches nothing in
// THIS school resolves to "not found"; it can never reach into another
// tenant's data, because this was never a raw AI-supplied query to begin
// with — only a short hint string used to look something up normally.
const {
  Class, AcademicTerm, Student, Result, Subject,
} = require('../models');
const { getOutstandingBalanceForStudentTerm } = require('./fees.service');
const earlyWarning = require('./earlyWarning.service');
const { getSchemeForSchool } = require('./grading.service');

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

module.exports = {
  resolveClassHint, resolveTermHint, runFeeArrearsQuery, runSubjectAverageQuery, runAtRiskStudentsQuery,
};
