const { GradingScheme } = require('../models');
const { findOrCreate } = require('../utils/findOrCreate');

// Ghanaian NaCCA basic-education grading scale, applied to class_score + exam_score
// (each 0-50, so their sum is already a 0-100 percentage — no division needed).
const SCALE = [
  { min: 80, grade: 'A1', label: 'Excellent' },
  { min: 70, grade: 'B2', label: 'Very Good' },
  { min: 65, grade: 'B3', label: 'Good' },
  { min: 60, grade: 'C4', label: 'Credit' },
  { min: 55, grade: 'C5', label: 'Credit' },
  { min: 50, grade: 'C6', label: 'Credit' },
  { min: 45, grade: 'D7', label: 'Pass' },
  { min: 40, grade: 'E8', label: 'Pass' },
  { min: 0, grade: 'F9', label: 'Fail' },
];

const computeGrade = (classScore, examScore) => {
  const total = Number(classScore) + Number(examScore);
  const match = SCALE.find((tier) => total >= tier.min);
  return match ? match.grade : 'F9';
};

// Same shape as computeGrade, but against an already-fetched school-specific
// scheme's bands instead of the hardcoded SCALE. Kept synchronous — callers
// fetch the scheme once per request (see getSchemeForSchool) and pass it
// into every computeGradeWithScheme call in a loop, rather than awaiting per row.
const computeGradeWithScheme = (classScore, examScore, scheme) => {
  const total = Number(classScore) + Number(examScore);
  const bands = scheme?.bands?.length ? scheme.bands : SCALE;
  const sorted = [...bands].sort((a, b) => b.min - a.min);
  const match = sorted.find((tier) => total >= tier.min);
  return match ? match.grade : (sorted[sorted.length - 1]?.grade || 'F9');
};

// Auto-creates a school's GradingScheme on first access, seeded with today's
// hardcoded NaCCA scale — so every existing school keeps identical behavior
// until an admin explicitly edits their scheme via GET/PUT /grading-scheme.
const getSchemeForSchool = async (schoolId) => {
  const [scheme] = await findOrCreate(GradingScheme, {
    where: { schoolId },
    defaults: { classScoreMax: 50, examScoreMax: 50, bands: SCALE },
  });
  return scheme;
};

module.exports = {
  computeGrade, SCALE, computeGradeWithScheme, getSchemeForSchool,
};
