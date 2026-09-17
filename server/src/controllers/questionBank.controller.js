const {
  Question, Teacher, Subject, Class,
} = require('../models');
const asyncHandler = require('../middleware/asyncHandler');
const AppError = require('../utils/AppError');

// Validates and extracts only the answer-shape field(s) this type actually
// needs -- called from create/update rather than express-validator, same
// division of labor announcements.controller.js uses for its own
// targetType-conditional fields. A thrown AppError here propagates through
// the surrounding asyncHandler's promise chain to the normal error
// middleware, same as any other throw in an async controller.
const normalizeTypeFields = (type, body) => {
  if (type === 'mcq' || type === 'multi_select') {
    const options = Array.isArray(body.options) ? body.options : [];
    if (options.length < 2) throw new AppError('At least 2 options are required', 400);
    const cleaned = options.map((o) => ({ text: String(o.text || '').trim(), isCorrect: Boolean(o.isCorrect) }));
    if (cleaned.some((o) => !o.text)) throw new AppError('Every option needs text', 400);
    const correctCount = cleaned.filter((o) => o.isCorrect).length;
    if (correctCount === 0) throw new AppError('At least one option must be marked correct', 400);
    if (type === 'mcq' && correctCount !== 1) throw new AppError('A multiple-choice question needs exactly one correct option', 400);
    return { options: cleaned };
  }
  if (type === 'true_false') {
    const isTrueCorrect = body.correctBoolean === true || body.correctBoolean === 'true';
    return { options: [{ text: 'True', isCorrect: isTrueCorrect }, { text: 'False', isCorrect: !isTrueCorrect }] };
  }
  if (type === 'matching') {
    const pairs = Array.isArray(body.matchingPairs) ? body.matchingPairs : [];
    if (pairs.length < 2) throw new AppError('At least 2 matching pairs are required', 400);
    const cleaned = pairs.map((p) => ({ left: String(p.left || '').trim(), right: String(p.right || '').trim() }));
    if (cleaned.some((p) => !p.left || !p.right)) throw new AppError('Every matching pair needs both sides filled in', 400);
    return { matchingPairs: cleaned };
  }
  if (type === 'ordering') {
    const items = Array.isArray(body.orderItems) ? body.orderItems.map((i) => String(i || '').trim()) : [];
    if (items.length < 2) throw new AppError('At least 2 items are required to order', 400);
    if (items.some((i) => !i)) throw new AppError('Every item needs text', 400);
    return { orderItems: items };
  }
  if (type === 'fill_in_blank') {
    const blanks = Array.isArray(body.blanks) ? body.blanks : [];
    if (blanks.length < 1) throw new AppError('At least 1 blank is required', 400);
    const cleaned = blanks.map((b) => ({
      acceptedAnswers: (Array.isArray(b.acceptedAnswers) ? b.acceptedAnswers : String(b.acceptedAnswers || '').split(','))
        .map((a) => String(a).trim()).filter(Boolean),
    }));
    if (cleaned.some((b) => b.acceptedAnswers.length === 0)) throw new AppError('Every blank needs at least one accepted answer', 400);
    return { blanks: cleaned };
  }
  // essay, file_upload -- no machine-checkable answer shape at all.
  return {};
};

const populateForDisplay = (query) => query
  .populate('subject', 'name')
  .populate('class', 'name section')
  .populate('creator', 'firstName lastName');

// Anyone with route access can view/reuse any question, but only its own
// creator or an admin can change or delete it -- a shared bank one teacher
// contributes to shouldn't let another silently overwrite their item.
const assertCanManage = async (req, question, next) => {
  if (req.user.role === 'admin') return true;
  const teacher = await Teacher.findOne({ userId: req.user.id });
  if (teacher && question.createdBy && teacher.id === question.createdBy.toString()) return true;
  next(new AppError('You can only edit or delete questions you created', 403));
  return false;
};

// GET /question-bank?subjectId=&classId=&topic=&difficulty=&type=
const list = asyncHandler(async (req, res) => {
  const {
    subjectId, classId, topic, difficulty, type,
  } = req.query;
  const where = {};
  if (subjectId) where.subjectId = subjectId;
  if (classId) where.classId = classId;
  if (difficulty) where.difficulty = difficulty;
  if (type) where.type = type;
  if (topic) where.topic = { $regex: topic, $options: 'i' };

  const questions = await populateForDisplay(Question.find(where)).sort({ createdAt: -1 });
  res.json({ success: true, data: questions });
});

const getById = asyncHandler(async (req, res, next) => {
  const question = await populateForDisplay(Question.findById(req.params.id));
  if (!question) return next(new AppError('Question not found', 404));
  res.json({ success: true, data: question });
});

const create = asyncHandler(async (req, res, next) => {
  const {
    subjectId, classId, topic, curriculumStrand, curriculumSubStrand, learningObjective,
    difficulty, type, marks, promptText, modelAnswer,
  } = req.body;

  if (!(await Subject.findById(subjectId))) return next(new AppError('Subject not found', 400));
  if (classId && !(await Class.findById(classId))) return next(new AppError('Class not found', 400));

  const typeFields = normalizeTypeFields(type, req.body);
  const teacher = await Teacher.findOne({ userId: req.user.id });

  const question = await Question.create({
    subjectId,
    classId: classId || null,
    topic,
    curriculumStrand: curriculumStrand || null,
    curriculumSubStrand: curriculumSubStrand || null,
    learningObjective: learningObjective || null,
    difficulty,
    type,
    marks,
    promptText,
    modelAnswer: modelAnswer || null,
    createdBy: teacher?.id || null,
    ...typeFields,
  });

  const full = await populateForDisplay(Question.findById(question.id));
  res.status(201).json({ success: true, data: full });
});

const update = asyncHandler(async (req, res, next) => {
  const question = await Question.findById(req.params.id);
  if (!question) return next(new AppError('Question not found', 404));
  if (!(await assertCanManage(req, question, next))) return;

  const {
    subjectId, classId, topic, curriculumStrand, curriculumSubStrand, learningObjective,
    difficulty, type, marks, promptText, modelAnswer,
  } = req.body;

  if (subjectId && !(await Subject.findById(subjectId))) return next(new AppError('Subject not found', 400));
  if (classId && !(await Class.findById(classId))) return next(new AppError('Class not found', 400));

  const effectiveType = type || question.type;
  const typeFields = normalizeTypeFields(effectiveType, req.body);

  question.subjectId = subjectId ?? question.subjectId;
  question.classId = classId !== undefined ? (classId || null) : question.classId;
  question.topic = topic ?? question.topic;
  question.curriculumStrand = curriculumStrand !== undefined ? (curriculumStrand || null) : question.curriculumStrand;
  question.curriculumSubStrand = curriculumSubStrand !== undefined ? (curriculumSubStrand || null) : question.curriculumSubStrand;
  question.learningObjective = learningObjective !== undefined ? (learningObjective || null) : question.learningObjective;
  question.difficulty = difficulty ?? question.difficulty;
  question.type = effectiveType;
  question.marks = marks ?? question.marks;
  question.promptText = promptText ?? question.promptText;
  question.modelAnswer = modelAnswer !== undefined ? (modelAnswer || null) : question.modelAnswer;
  question.options = undefined;
  question.matchingPairs = undefined;
  question.orderItems = undefined;
  question.blanks = undefined;
  Object.assign(question, typeFields);

  await question.save();
  const full = await populateForDisplay(Question.findById(question.id));
  res.json({ success: true, data: full });
});

const remove = asyncHandler(async (req, res, next) => {
  const question = await Question.findById(req.params.id);
  if (!question) return next(new AppError('Question not found', 404));
  if (!(await assertCanManage(req, question, next))) return;
  await question.deleteOne();
  res.json({ success: true, data: null });
});

module.exports = {
  list, getById, create, update, remove,
};
