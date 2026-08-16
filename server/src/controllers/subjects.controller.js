const models = require('../models');
const { Subject, Class, ClassSubject } = models;
const asyncHandler = require('../middleware/asyncHandler');
const AppError = require('../utils/AppError');
const { findOrCreate } = require('../utils/findOrCreate');
const { deleteWithCascade } = require('../services/cascadeDelete.service');

const list = asyncHandler(async (req, res) => {
  const subjects = await Subject.find().sort({ name: 1 });
  res.json({ success: true, data: subjects });
});

const create = asyncHandler(async (req, res) => {
  const { name, code, description } = req.body;
  // code stays entirely unset (not null) when absent — a sparse unique
  // index only excludes documents missing the field, not null-valued ones.
  const subject = await Subject.create({ name, code: code || undefined, description: description || null });
  res.status(201).json({ success: true, data: subject });
});

const update = asyncHandler(async (req, res, next) => {
  const subject = await Subject.findById(req.params.id);
  if (!subject) return next(new AppError('Subject not found', 404));
  const { name, code, description } = req.body;
  subject.name = name ?? subject.name;
  subject.code = code === undefined ? subject.code : (code || undefined);
  subject.description = description === undefined ? subject.description : description;
  await subject.save();
  res.json({ success: true, data: subject });
});

const remove = asyncHandler(async (req, res, next) => {
  const subject = await Subject.findById(req.params.id);
  if (!subject) return next(new AppError('Subject not found', 404));
  await deleteWithCascade(models, Subject, subject.id);
  res.json({ success: true, data: null });
});

// Assign a subject to a class (optionally scoped to a term)
const assignToClass = asyncHandler(async (req, res, next) => {
  const { classId, subjectId, academicTermId } = req.body;

  const [classRow, subject] = await Promise.all([
    Class.findById(classId),
    Subject.findById(subjectId),
  ]);
  if (!classRow) return next(new AppError('Class not found', 404));
  if (!subject) return next(new AppError('Subject not found', 404));

  const [link, created] = await findOrCreate(ClassSubject, {
    where: { classId, subjectId, academicTermId: academicTermId || null },
  });
  res.status(created ? 201 : 200).json({ success: true, data: link });
});

const unassignFromClass = asyncHandler(async (req, res, next) => {
  const link = await ClassSubject.findById(req.params.linkId);
  if (!link) return next(new AppError('Assignment not found', 404));
  await link.deleteOne();
  res.json({ success: true, data: null });
});

const listByClass = asyncHandler(async (req, res) => {
  const links = await ClassSubject.find({ classId: req.params.classId }).populate('subject');
  res.json({ success: true, data: links });
});

module.exports = { list, create, update, remove, assignToClass, unassignFromClass, listByClass };
