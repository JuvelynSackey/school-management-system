const models = require('../models');
const { Class, ClassSubject } = models;
const asyncHandler = require('../middleware/asyncHandler');
const AppError = require('../utils/AppError');
const { deleteWithCascade } = require('../services/cascadeDelete.service');

const list = asyncHandler(async (req, res) => {
  const classes = await Class.find()
    .populate('classTeacher', 'firstName lastName')
    .populate('students', '_id')
    .sort({ name: 1, section: 1 });
  res.json({ success: true, data: classes });
});

const getById = asyncHandler(async (req, res, next) => {
  const classRow = await Class.findById(req.params.id)
    .populate('classTeacher', 'firstName lastName')
    .populate('students', 'firstName lastName admissionNo');
  if (!classRow) return next(new AppError('Class not found', 404));

  // Class<->Subject is many-to-many via ClassSubject; Mongoose has no direct
  // equivalent of Sequelize's belongsToMany populate, so fetch it manually.
  const links = await ClassSubject.find({ classId: classRow.id }).populate('subject');
  const data = classRow.toJSON();
  data.subjects = links.map((l) => l.subject).filter(Boolean);

  res.json({ success: true, data });
});

const create = asyncHandler(async (req, res) => {
  const { name, section, room, stage, classTeacherId } = req.body;
  const classRow = await Class.create({
    name,
    section: section || null,
    room: room || null,
    stage: stage || null,
    classTeacherId: classTeacherId || null,
  });
  res.status(201).json({ success: true, data: classRow });
});

const update = asyncHandler(async (req, res, next) => {
  const classRow = await Class.findById(req.params.id);
  if (!classRow) return next(new AppError('Class not found', 404));

  const { name, section, room, stage, classTeacherId } = req.body;
  classRow.name = name ?? classRow.name;
  classRow.section = section === undefined ? classRow.section : section;
  classRow.room = room === undefined ? classRow.room : room;
  classRow.stage = stage === undefined ? classRow.stage : stage;
  classRow.classTeacherId = classTeacherId === undefined ? classRow.classTeacherId : classTeacherId;
  await classRow.save();
  res.json({ success: true, data: classRow });
});

const remove = asyncHandler(async (req, res, next) => {
  const classRow = await Class.findById(req.params.id);
  if (!classRow) return next(new AppError('Class not found', 404));
  await deleteWithCascade(models, Class, classRow.id);
  res.json({ success: true, data: null });
});

module.exports = { list, getById, create, update, remove };
