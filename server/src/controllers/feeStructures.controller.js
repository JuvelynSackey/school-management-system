const models = require('../models');
const { FeeStructure, Fee, Student, Class } = models;
const asyncHandler = require('../middleware/asyncHandler');
const AppError = require('../utils/AppError');
const { findOrCreate } = require('../utils/findOrCreate');
const { deleteWithCascade } = require('../services/cascadeDelete.service');

const list = asyncHandler(async (req, res) => {
  const structures = await FeeStructure.find().populate('academicTerm', 'name').sort({ name: 1 });
  res.json({ success: true, data: structures });
});

const create = asyncHandler(async (req, res) => {
  const { name, category, amount, academicTermId } = req.body;
  const structure = await FeeStructure.create({
    name, category: category || 'Tuition', amount, academicTermId: academicTermId || null,
  });
  res.status(201).json({ success: true, data: structure });
});

const update = asyncHandler(async (req, res, next) => {
  const structure = await FeeStructure.findById(req.params.id);
  if (!structure) return next(new AppError('Fee structure not found', 404));
  const { name, category, amount, academicTermId } = req.body;
  structure.name = name ?? structure.name;
  structure.category = category ?? structure.category;
  structure.amount = amount ?? structure.amount;
  structure.academicTermId = academicTermId === undefined ? structure.academicTermId : academicTermId;
  await structure.save();
  res.json({ success: true, data: structure });
});

const remove = asyncHandler(async (req, res, next) => {
  const structure = await FeeStructure.findById(req.params.id);
  if (!structure) return next(new AppError('Fee structure not found', 404));
  await deleteWithCascade(models, FeeStructure, structure.id);
  res.json({ success: true, data: null });
});

// POST /fee-structures/:id/apply { target: 'class'|'stage'|'all', classId?, stage?, dueDate? }
const apply = asyncHandler(async (req, res, next) => {
  const structure = await FeeStructure.findById(req.params.id);
  if (!structure) return next(new AppError('Fee structure not found', 404));

  const { target, classId, stage, dueDate } = req.body;

  const where = { status: 'active' };
  if (target === 'class') {
    if (!classId) return next(new AppError('classId is required for target=class', 400));
    if (!(await Class.findById(classId))) return next(new AppError('Class not found', 400));
    where.classId = classId;
  } else if (target === 'stage') {
    if (!stage) return next(new AppError('stage is required for target=stage', 400));
    const classesInStage = await Class.find({ stage }, { _id: 1 });
    where.classId = { $in: classesInStage.map((c) => c.id) };
    if (classesInStage.length === 0) {
      return res.json({ success: true, data: { created: 0, skipped: 0 } });
    }
  } else if (target !== 'all') {
    return next(new AppError('target must be one of class, stage, all', 400));
  }

  const students = await Student.find(where);

  let created = 0;
  let skipped = 0;

  for (const student of students) {
    const [, wasCreated] = await findOrCreate(Fee, {
      where: {
        studentId: student.id,
        feeStructureId: structure.id,
        academicTermId: structure.academicTermId || null,
      },
      defaults: {
        feeType: structure.name,
        category: structure.category,
        amountDue: structure.amount,
        dueDate: dueDate || null,
        status: 'Pending',
      },
    });
    if (wasCreated) created += 1;
    else skipped += 1;
  }

  res.json({ success: true, data: { created, skipped } });
});

module.exports = { list, create, update, remove, apply };
