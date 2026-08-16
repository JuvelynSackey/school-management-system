const { TeacherSubjectAssignment, Teacher, Subject } = require('../models');
const asyncHandler = require('../middleware/asyncHandler');
const AppError = require('../utils/AppError');
const { findOrCreate } = require('../utils/findOrCreate');

const listByClass = asyncHandler(async (req, res) => {
  const assignments = await TeacherSubjectAssignment.find({ classId: req.params.classId })
    .populate('teacher', 'firstName lastName')
    .populate('subject', 'name');
  res.json({ success: true, data: assignments });
});

const create = asyncHandler(async (req, res, next) => {
  const { teacherId, subjectId, classId, academicTermId } = req.body;

  const [teacher, subject] = await Promise.all([
    Teacher.findById(teacherId),
    Subject.findById(subjectId),
  ]);
  if (!teacher) return next(new AppError('Teacher not found', 404));
  if (!subject) return next(new AppError('Subject not found', 404));

  const [assignment, created] = await findOrCreate(TeacherSubjectAssignment, {
    where: { teacherId, subjectId, classId, academicTermId: academicTermId || null },
  });
  res.status(created ? 201 : 200).json({ success: true, data: assignment });
});

const remove = asyncHandler(async (req, res, next) => {
  const assignment = await TeacherSubjectAssignment.findById(req.params.id);
  if (!assignment) return next(new AppError('Assignment not found', 404));
  await assignment.deleteOne();
  res.json({ success: true, data: null });
});

module.exports = { listByClass, create, remove };
