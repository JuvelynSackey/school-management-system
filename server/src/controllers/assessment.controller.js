const {
  Assessment, Teacher, Subject, Class, AcademicTerm, Question,
} = require('../models');
const asyncHandler = require('../middleware/asyncHandler');
const AppError = require('../utils/AppError');

const populateForDisplay = (query) => query
  .populate('subject', 'name')
  .populate('class', 'name section')
  .populate('academicTerm', 'name academicYear termNumber')
  .populate('creator', 'firstName lastName')
  .populate('questions', 'topic type marks difficulty promptText');

// Same ownership rule as questionBank.controller.js: anyone with route
// access can view any assessment, but only its own creator or an admin can
// change or delete it.
const assertCanManage = async (req, assessment, next) => {
  if (req.user.role === 'admin') return true;
  const teacher = await Teacher.findOne({ userId: req.user.id });
  if (teacher && assessment.createdBy && teacher.id === assessment.createdBy.toString()) return true;
  next(new AppError('You can only edit or delete assessments you created', 403));
  return false;
};

// Every referenced question must actually exist and belong to this school --
// tenantScopePlugin already scopes the query to the caller's school, so a
// count mismatch means at least one id was invalid, deleted, or cross-tenant.
const assertQuestionsExist = async (questionIds) => {
  if (!questionIds || questionIds.length === 0) return;
  const count = await Question.countDocuments({ _id: { $in: questionIds } });
  if (count !== questionIds.length) throw new AppError('One or more selected questions could not be found', 400);
};

// GET /assessments?classId=&subjectId=&academicTermId=&status=
const list = asyncHandler(async (req, res) => {
  const {
    classId, subjectId, academicTermId, status,
  } = req.query;
  const where = {};
  if (classId) where.classId = classId;
  if (subjectId) where.subjectId = subjectId;
  if (academicTermId) where.academicTermId = academicTermId;
  if (status) where.status = status;

  const assessments = await populateForDisplay(Assessment.find(where)).sort({ createdAt: -1 });
  res.json({ success: true, data: assessments });
});

const getById = asyncHandler(async (req, res, next) => {
  const assessment = await populateForDisplay(Assessment.findById(req.params.id));
  if (!assessment) return next(new AppError('Assessment not found', 404));
  res.json({ success: true, data: assessment });
});

const create = asyncHandler(async (req, res, next) => {
  const {
    title, subjectId, classId, academicTermId, instructions, assessmentType, classScoreComponentKey,
    questionIds, startAt, endAt, durationMinutes, maxAttempts, randomizeQuestions, randomizeOptions,
    allowBacktracking, autoSubmitOnTimeUp, resultRelease, resultReleaseAt, status,
  } = req.body;

  if (!(await Subject.findById(subjectId))) return next(new AppError('Subject not found', 400));
  if (!(await Class.findById(classId))) return next(new AppError('Class not found', 400));
  if (!(await AcademicTerm.findById(academicTermId))) return next(new AppError('Academic term not found', 400));
  await assertQuestionsExist(questionIds);

  const teacher = await Teacher.findOne({ userId: req.user.id });

  const assessment = await Assessment.create({
    title,
    subjectId,
    classId,
    academicTermId,
    instructions: instructions || null,
    assessmentType: assessmentType || 'classwork',
    classScoreComponentKey: classScoreComponentKey || null,
    questionIds: questionIds || [],
    startAt: startAt || null,
    endAt: endAt || null,
    durationMinutes: durationMinutes || null,
    maxAttempts: maxAttempts || 1,
    randomizeQuestions: Boolean(randomizeQuestions),
    randomizeOptions: Boolean(randomizeOptions),
    allowBacktracking: allowBacktracking !== false,
    autoSubmitOnTimeUp: autoSubmitOnTimeUp !== false,
    resultRelease: resultRelease || 'after_review',
    resultReleaseAt: resultRelease === 'scheduled' ? (resultReleaseAt || null) : null,
    status: status || 'Draft',
    createdBy: teacher?.id || null,
  });

  const full = await populateForDisplay(Assessment.findById(assessment.id));
  res.status(201).json({ success: true, data: full });
});

const update = asyncHandler(async (req, res, next) => {
  const assessment = await Assessment.findById(req.params.id);
  if (!assessment) return next(new AppError('Assessment not found', 404));
  if (!(await assertCanManage(req, assessment, next))) return;

  const {
    title, subjectId, classId, academicTermId, instructions, assessmentType, classScoreComponentKey,
    questionIds, startAt, endAt, durationMinutes, maxAttempts, randomizeQuestions, randomizeOptions,
    allowBacktracking, autoSubmitOnTimeUp, resultRelease, resultReleaseAt, status,
  } = req.body;

  if (subjectId && !(await Subject.findById(subjectId))) return next(new AppError('Subject not found', 400));
  if (classId && !(await Class.findById(classId))) return next(new AppError('Class not found', 400));
  if (academicTermId && !(await AcademicTerm.findById(academicTermId))) return next(new AppError('Academic term not found', 400));
  if (questionIds) await assertQuestionsExist(questionIds);

  assessment.title = title ?? assessment.title;
  assessment.subjectId = subjectId ?? assessment.subjectId;
  assessment.classId = classId ?? assessment.classId;
  assessment.academicTermId = academicTermId ?? assessment.academicTermId;
  assessment.instructions = instructions !== undefined ? (instructions || null) : assessment.instructions;
  assessment.assessmentType = assessmentType ?? assessment.assessmentType;
  assessment.classScoreComponentKey = classScoreComponentKey !== undefined ? (classScoreComponentKey || null) : assessment.classScoreComponentKey;
  assessment.questionIds = questionIds ?? assessment.questionIds;
  assessment.startAt = startAt !== undefined ? (startAt || null) : assessment.startAt;
  assessment.endAt = endAt !== undefined ? (endAt || null) : assessment.endAt;
  assessment.durationMinutes = durationMinutes !== undefined ? (durationMinutes || null) : assessment.durationMinutes;
  assessment.maxAttempts = maxAttempts ?? assessment.maxAttempts;
  assessment.randomizeQuestions = randomizeQuestions !== undefined ? Boolean(randomizeQuestions) : assessment.randomizeQuestions;
  assessment.randomizeOptions = randomizeOptions !== undefined ? Boolean(randomizeOptions) : assessment.randomizeOptions;
  assessment.allowBacktracking = allowBacktracking !== undefined ? Boolean(allowBacktracking) : assessment.allowBacktracking;
  assessment.autoSubmitOnTimeUp = autoSubmitOnTimeUp !== undefined ? Boolean(autoSubmitOnTimeUp) : assessment.autoSubmitOnTimeUp;
  assessment.resultRelease = resultRelease ?? assessment.resultRelease;
  assessment.resultReleaseAt = assessment.resultRelease === 'scheduled' ? (resultReleaseAt || assessment.resultReleaseAt || null) : null;
  assessment.status = status ?? assessment.status;

  await assessment.save();
  const full = await populateForDisplay(Assessment.findById(assessment.id));
  res.json({ success: true, data: full });
});

const remove = asyncHandler(async (req, res, next) => {
  const assessment = await Assessment.findById(req.params.id);
  if (!assessment) return next(new AppError('Assessment not found', 404));
  if (!(await assertCanManage(req, assessment, next))) return;
  await assessment.deleteOne();
  res.json({ success: true, data: null });
});

module.exports = {
  list, getById, create, update, remove,
};
