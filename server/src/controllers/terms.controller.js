const models = require('../models');
const { AcademicTerm } = models;
const asyncHandler = require('../middleware/asyncHandler');
const AppError = require('../utils/AppError');
const { deleteWithCascade } = require('../services/cascadeDelete.service');

const list = asyncHandler(async (req, res) => {
  const terms = await AcademicTerm.find().sort({ academicYear: -1, termNumber: -1 });
  res.json({ success: true, data: terms });
});

const create = asyncHandler(async (req, res) => {
  const { name, academicYear, termNumber, startDate, endDate, isCurrent } = req.body;

  if (isCurrent) {
    await AcademicTerm.updateMany({}, { $set: { isCurrent: false } });
  }

  const term = await AcademicTerm.create({
    name,
    academicYear,
    termNumber,
    startDate: startDate || null,
    endDate: endDate || null,
    isCurrent: Boolean(isCurrent),
  });
  res.status(201).json({ success: true, data: term });
});

const update = asyncHandler(async (req, res, next) => {
  const term = await AcademicTerm.findById(req.params.id);
  if (!term) return next(new AppError('Academic term not found', 404));

  const { name, academicYear, termNumber, startDate, endDate, isCurrent } = req.body;

  if (isCurrent) {
    await AcademicTerm.updateMany({}, { $set: { isCurrent: false } });
  }

  term.name = name ?? term.name;
  term.academicYear = academicYear ?? term.academicYear;
  term.termNumber = termNumber ?? term.termNumber;
  term.startDate = startDate ?? term.startDate;
  term.endDate = endDate ?? term.endDate;
  term.isCurrent = isCurrent ?? term.isCurrent;
  await term.save();
  res.json({ success: true, data: term });
});

const remove = asyncHandler(async (req, res, next) => {
  const term = await AcademicTerm.findById(req.params.id);
  if (!term) return next(new AppError('Academic term not found', 404));
  await deleteWithCascade(models, AcademicTerm, term.id);
  res.json({ success: true, data: null });
});

module.exports = { list, create, update, remove };
