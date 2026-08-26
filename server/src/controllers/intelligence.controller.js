const { AcademicTerm } = require('../models');
const asyncHandler = require('../middleware/asyncHandler');
const AppError = require('../utils/AppError');
const { getSchemeForSchool } = require('../services/grading.service');
const { buildIntelligenceSummary } = require('../services/intelligenceSummary.service');
const { computeHealthScore } = require('../services/schoolHealth.service');

const resolveTermOrCurrent = async (academicTermId, next) => {
  if (academicTermId) return academicTermId;
  const currentTerm = await AcademicTerm.findOne({ isCurrent: true });
  if (!currentTerm) {
    next(new AppError('No current academic term is set for this school', 400));
    return null;
  }
  return currentTerm.id;
};

// GET /intelligence/summary?academicTermId=
const getSummary = asyncHandler(async (req, res, next) => {
  const academicTermId = await resolveTermOrCurrent(req.query.academicTermId, next);
  if (!academicTermId) return;

  const scheme = await getSchemeForSchool(req.user.schoolId);
  const summary = await buildIntelligenceSummary({ schoolId: req.user.schoolId, academicTermId, scheme });

  res.json({ success: true, data: summary });
});

// GET /intelligence/health-score?academicTermId=
const getHealthScore = asyncHandler(async (req, res, next) => {
  const academicTermId = await resolveTermOrCurrent(req.query.academicTermId, next);
  if (!academicTermId) return;

  const health = await computeHealthScore({ schoolId: req.user.schoolId, academicTermId });
  res.json({ success: true, data: health });
});

module.exports = { getSummary, getHealthScore };
