const {
  mongoose, Result, Subject, AcademicTerm,
} = require('../models');
const { getSchemeForSchool } = require('./grading.service');

const round1 = (n) => Math.round(n * 10) / 10;

// Result.aggregate() bypasses tenantScopePlugin (only find/findOne/etc. are
// scoped, not aggregate) — schoolId must be matched explicitly in every
// aggregate here to avoid leaking another tenant's scores.
const classAverages = (schoolId, academicTermId) => Result.aggregate([
  { $match: { schoolId: new mongoose.Types.ObjectId(schoolId), academicTermId: new mongoose.Types.ObjectId(academicTermId) } },
  { $group: { _id: '$classId', average: { $avg: '$totalScore' }, count: { $sum: 1 } } },
]);

const subjectAverages = (schoolId, academicTermId) => Result.aggregate([
  { $match: { schoolId: new mongoose.Types.ObjectId(schoolId), academicTermId: new mongoose.Types.ObjectId(academicTermId) } },
  { $group: { _id: '$subjectId', average: { $avg: '$totalScore' }, count: { $sum: 1 } } },
]);

// "Pass" is defined as scoring at or above the grading scheme's
// second-lowest band minimum — the lowest band is the scheme's fail grade
// by definition (e.g. F9 in the NaCCA default). Same definition used by
// ai.controller.js's computeSubjectPerformance.
const passCutoffFor = (scheme) => {
  const sortedBands = [...scheme.bands].sort((a, b) => a.min - b.min);
  return sortedBands[1]?.min ?? 0;
};

const overallPassRate = async (schoolId, academicTermId) => {
  const scheme = await getSchemeForSchool(schoolId);
  const passCutoff = passCutoffFor(scheme);

  const [row] = await Result.aggregate([
    { $match: { schoolId: new mongoose.Types.ObjectId(schoolId), academicTermId: new mongoose.Types.ObjectId(academicTermId) } },
    {
      $group: {
        _id: null,
        count: { $sum: 1 },
        passCount: { $sum: { $cond: [{ $gte: ['$totalScore', passCutoff] }, 1, 0] } },
      },
    },
  ]);

  return row && row.count > 0 ? round1((row.passCount / row.count) * 100) : null;
};

// Per-subject pass rate — used by the Intelligence view to flag subjects a
// large share of students are failing. Distinct from subjectAverages (which
// only reports the mean score, not a pass/fail split).
const subjectPassRates = async (schoolId, academicTermId) => {
  const scheme = await getSchemeForSchool(schoolId);
  const passCutoff = passCutoffFor(scheme);

  const rows = await Result.aggregate([
    { $match: { schoolId: new mongoose.Types.ObjectId(schoolId), academicTermId: new mongoose.Types.ObjectId(academicTermId) } },
    {
      $group: {
        _id: '$subjectId',
        average: { $avg: '$totalScore' },
        count: { $sum: 1 },
        passCount: { $sum: { $cond: [{ $gte: ['$totalScore', passCutoff] }, 1, 0] } },
      },
    },
  ]);

  const subjects = await Subject.find({ _id: { $in: rows.map((r) => r._id) } }, { name: 1 });
  const nameById = new Map(subjects.map((s) => [s.id, s.name]));

  return rows.map((r) => ({
    subjectId: r._id.toString(),
    subjectName: nameById.get(r._id.toString()) || 'Unknown subject',
    average: round1(r.average),
    passRate: Math.round((r.passCount / r.count) * 100),
    resultCount: r.count,
  }));
};

const resolvePreviousTerm = async (schoolId, currentTerm) => {
  const terms = await AcademicTerm.find({ schoolId }).sort({ academicYear: 1, termNumber: 1 });
  const idx = terms.findIndex((t) => t.id === currentTerm.id);
  return idx > 0 ? terms[idx - 1] : null;
};

module.exports = {
  round1, classAverages, subjectAverages, overallPassRate, subjectPassRates, resolvePreviousTerm,
};
