const { Class } = require('../models');
const asyncHandler = require('../middleware/asyncHandler');
const AppError = require('../utils/AppError');
const feedingFeesService = require('../services/feedingFees.service');
const auditLog = require('../services/auditLog.service');

// GET /feeding-fees/daily?classId=&date=
const getDaily = asyncHandler(async (req, res, next) => {
  const { classId, date } = req.query;
  if (!classId || !date) return next(new AppError('classId and date are required', 400));
  if (!(await Class.findById(classId))) return next(new AppError('Class not found', 400));

  const roster = await feedingFeesService.getRoster({ classId, date });
  res.json({ success: true, data: roster });
});

// POST /feeding-fees/charge { classId, date, studentIds? }
const chargeDay = asyncHandler(async (req, res, next) => {
  const { classId, date } = req.body;
  if (!classId || !date) return next(new AppError('classId and date are required', 400));
  const classRow = await Class.findById(classId);
  if (!classRow) return next(new AppError('Class not found', 400));

  let { studentIds } = req.body;
  if (!Array.isArray(studentIds) || studentIds.length === 0) {
    const roster = await feedingFeesService.getRoster({ classId, date });
    studentIds = roster.filter((r) => r.billableByDefault && !r.alreadyCharged).map((r) => r.studentId);
  }

  const results = await feedingFeesService.chargeDay({
    classId, date, studentIds, req,
  });

  await auditLog.record({
    req,
    action: 'feedingFee.chargeDay',
    entityType: 'FeedingCharge',
    description: `Charged feeding fees for ${classRow.name} ${classRow.section || ''} on ${date}: ${results.charged.length} student(s)`,
    metadata: { classId, date, chargedCount: results.charged.length, skippedCount: results.skipped.length },
  });

  res.status(201).json({ success: true, data: results });
});

// GET /feeding-fees/summary?classId=&date=
const getSummary = asyncHandler(async (req, res, next) => {
  const { classId, date } = req.query;
  if (!classId || !date) return next(new AppError('classId and date are required', 400));
  if (!(await Class.findById(classId))) return next(new AppError('Class not found', 400));

  const summary = await feedingFeesService.getDaySummary({ classId, date });
  res.json({ success: true, data: summary });
});

module.exports = { getDaily, chargeDay, getSummary };
