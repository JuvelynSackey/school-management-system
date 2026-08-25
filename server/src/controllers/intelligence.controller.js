const { AcademicTerm } = require('../models');
const asyncHandler = require('../middleware/asyncHandler');
const AppError = require('../utils/AppError');
const { getSchemeForSchool } = require('../services/grading.service');
const { buildIntelligenceSummary } = require('../services/intelligenceSummary.service');

// GET /intelligence/summary?academicTermId=
const getSummary = asyncHandler(async (req, res, next) => {
  let { academicTermId } = req.query;
  if (!academicTermId) {
    const currentTerm = await AcademicTerm.findOne({ isCurrent: true });
    if (!currentTerm) return next(new AppError('No current academic term is set for this school', 400));
    academicTermId = currentTerm.id;
  }

  const scheme = await getSchemeForSchool(req.user.schoolId);
  const summary = await buildIntelligenceSummary({ schoolId: req.user.schoolId, academicTermId, scheme });

  res.json({ success: true, data: summary });
});

module.exports = { getSummary };
