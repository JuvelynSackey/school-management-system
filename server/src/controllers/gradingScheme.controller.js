const { GradingScheme } = require('../models');
const asyncHandler = require('../middleware/asyncHandler');
const AppError = require('../utils/AppError');
const { getSchemeForSchool } = require('../services/grading.service');
const { validateClassScoreConfig } = require('../services/result.service');
const auditLog = require('../services/auditLog.service');

// One grading scheme per school — auto-created seeded with today's
// hardcoded NaCCA scale on first read, so nothing changes for a school
// until an admin explicitly edits it.
const get = asyncHandler(async (req, res) => {
  const scheme = await getSchemeForSchool(req.user.schoolId);
  res.json({ success: true, data: scheme });
});

// PUT /grading-scheme { classScoreMax, examScoreMax, bands: [{min, grade, label}], classScoreConfig? }
const update = asyncHandler(async (req, res, next) => {
  const {
    classScoreMax, examScoreMax, bands, classScoreConfig,
  } = req.body;

  if (!Array.isArray(bands) || bands.length === 0) {
    return next(new AppError('At least one grade band is required', 400));
  }
  const sorted = [...bands].sort((a, b) => b.min - a.min);
  if (sorted[sorted.length - 1].min !== 0) {
    return next(new AppError('The lowest grade band must start at 0', 400));
  }
  const grades = sorted.map((b) => b.grade);
  if (new Set(grades).size !== grades.length) {
    return next(new AppError('Grade codes must be unique', 400));
  }
  for (let i = 0; i < sorted.length - 1; i += 1) {
    if (sorted[i].min === sorted[i + 1].min) {
      return next(new AppError('Grade band minimums must be unique', 400));
    }
  }

  if (classScoreConfig?.enabled) {
    try {
      validateClassScoreConfig(classScoreConfig.components, classScoreMax || 50);
    } catch (err) {
      return next(new AppError(err.message, 400));
    }
  }

  // classScoreConfig is only overwritten when the request actually sent
  // one -- an admin editing just the grade bands shouldn't silently reset
  // an already-configured decomposition back to nothing.
  const setFields = {
    classScoreMax: classScoreMax || 50,
    examScoreMax: examScoreMax || 50,
    bands: sorted,
  };
  if (classScoreConfig !== undefined) setFields.classScoreConfig = classScoreConfig;

  const scheme = await GradingScheme.findOneAndUpdate(
    { schoolId: req.user.schoolId },
    { $set: setFields },
    { upsert: true, new: true },
  );

  await auditLog.record({
    req, action: 'gradingScheme.update', entityType: 'GradingScheme', entityId: scheme.id, description: 'Updated the school\'s grading scheme',
  });

  res.json({ success: true, data: scheme });
});

module.exports = { get, update };
