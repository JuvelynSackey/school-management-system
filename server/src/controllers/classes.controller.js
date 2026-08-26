const models = require('../models');
const { Class, ClassSubject, Teacher, TeacherSubjectAssignment } = models;
const asyncHandler = require('../middleware/asyncHandler');
const AppError = require('../utils/AppError');
const { deleteWithCascade } = require('../services/cascadeDelete.service');
const { LEVEL_ORDER_BY_GRADE, STAGE_BY_GRADE_LEVEL, UNRANKED_LEVEL_ORDER } = require('../constants/gradeLevels');
const { isHomeroomTeacher } = require('../services/teacherScope.service');

// gradeLevel present -> stage is force-derived from it (the two can never
// disagree). gradeLevel absent/cleared -> stage passes through untouched,
// levelOrder resets to the sentinel (sorts last, not first).
const resolveGradeFields = (gradeLevel, fallbackStage) => (gradeLevel
  ? { gradeLevel, levelOrder: LEVEL_ORDER_BY_GRADE[gradeLevel], stage: STAGE_BY_GRADE_LEVEL[gradeLevel] }
  : { gradeLevel: null, levelOrder: UNRANKED_LEVEL_ORDER, stage: fallbackStage });

const list = asyncHandler(async (req, res) => {
  const classes = await Class.find()
    .populate('classTeacher', 'firstName lastName')
    .populate('students', '_id')
    .sort({ levelOrder: 1, name: 1, section: 1 });
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

// GET /classes/:id/my-access -- for the logged-in teacher, what they can do
// in this one class: homeroom (Master Entry: every subject, attendance,
// remarks) or just their own assigned subjects. Drives the frontend's
// subject-picker filtering and Homeroom/Subject-Specialist badge. Admins
// get isHomeroom: true implicitly -- nothing to filter for them.
const getMyAccess = asyncHandler(async (req, res, next) => {
  const classRow = await Class.findById(req.params.id, { _id: 1 });
  if (!classRow) return next(new AppError('Class not found', 404));

  if (req.user.role === 'admin') {
    return res.json({ success: true, data: { isHomeroom: true, subjectIds: [] } });
  }
  if (req.user.role !== 'teacher') {
    return next(new AppError('You do not have permission to perform this action', 403));
  }

  const [isHomeroom, teacher] = await Promise.all([
    isHomeroomTeacher(req.user.id, classRow.id),
    Teacher.findOne({ userId: req.user.id }),
  ]);
  const assignments = teacher
    ? await TeacherSubjectAssignment.find({ teacherId: teacher.id, classId: classRow.id }, { subjectId: 1 })
    : [];

  res.json({ success: true, data: { isHomeroom, subjectIds: assignments.map((a) => a.subjectId.toString()) } });
});

const create = asyncHandler(async (req, res) => {
  const {
    name, section, room, stage, gradeLevel, classTeacherId,
  } = req.body;
  const graded = resolveGradeFields(gradeLevel || null, stage || null);
  const classRow = await Class.create({
    name,
    section: section || null,
    room: room || null,
    stage: graded.stage,
    gradeLevel: graded.gradeLevel,
    levelOrder: graded.levelOrder,
    classTeacherId: classTeacherId || null,
  });
  res.status(201).json({ success: true, data: classRow });
});

const update = asyncHandler(async (req, res, next) => {
  const classRow = await Class.findById(req.params.id);
  if (!classRow) return next(new AppError('Class not found', 404));

  const {
    name, section, room, stage, gradeLevel, classTeacherId,
  } = req.body;
  classRow.name = name ?? classRow.name;
  classRow.section = section === undefined ? classRow.section : section;
  classRow.room = room === undefined ? classRow.room : room;
  classRow.classTeacherId = classTeacherId === undefined ? classRow.classTeacherId : classTeacherId;

  if (gradeLevel === undefined) {
    // Not part of this request at all -- only an independently-sent stage
    // may change; existing gradeLevel/levelOrder are left fully alone.
    classRow.stage = stage === undefined ? classRow.stage : stage;
  } else {
    const fallbackStage = stage === undefined ? classRow.stage : stage;
    const graded = resolveGradeFields(gradeLevel || null, fallbackStage);
    classRow.gradeLevel = graded.gradeLevel;
    classRow.levelOrder = graded.levelOrder;
    classRow.stage = graded.stage;
  }
  await classRow.save();
  res.json({ success: true, data: classRow });
});

const remove = asyncHandler(async (req, res, next) => {
  const classRow = await Class.findById(req.params.id);
  if (!classRow) return next(new AppError('Class not found', 404));
  await deleteWithCascade(models, Class, classRow.id);
  res.json({ success: true, data: null });
});

module.exports = {
  list, getById, getMyAccess, create, update, remove,
};
