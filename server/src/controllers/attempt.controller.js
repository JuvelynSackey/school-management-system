const {
  Assessment, AssessmentAttempt, Question, Student, Teacher,
} = require('../models');
const asyncHandler = require('../middleware/asyncHandler');
const AppError = require('../utils/AppError');
const { gradeAttempt } = require('../services/assessmentGrading.service');
const { redactQuestionForStudent, redactAttemptForStudent } = require('../services/attemptRedaction.service');

const resolveStudent = async (req, next) => {
  const student = await Student.findOne({ userId: req.user.id });
  if (!student) { next(new AppError('Student profile not found', 404)); return null; }
  return student;
};

// Same ownership rule as Question/Assessment: the assessment's own creator
// or an admin.
const assertCanManageAssessment = async (req, assessment, next) => {
  if (req.user.role === 'admin') return true;
  const teacher = await Teacher.findOne({ userId: req.user.id });
  if (teacher && assessment.createdBy && teacher.id === assessment.createdBy.toString()) return true;
  next(new AppError('You do not have permission to manage this assessment', 403));
  return false;
};

const shuffle = (arr) => {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

// Randomization snapshot, taken once at attempt creation -- see
// assessmentAttempt.model.js for why this is never recomputed afterward.
const buildSnapshot = (assessment, orderedQuestions) => {
  const finalOrder = assessment.randomizeQuestions ? shuffle(orderedQuestions) : orderedQuestions;
  const questionOrder = finalOrder.map((q) => q.id);
  const displayOrderByQuestion = new Map();
  finalOrder.forEach((q) => {
    if (q.type === 'matching') {
      displayOrderByQuestion.set(q.id, shuffle(q.matchingPairs.map((_, i) => i)));
    } else if (q.type === 'ordering') {
      displayOrderByQuestion.set(q.id, shuffle(q.orderItems.map((_, i) => i)));
    } else if (assessment.randomizeOptions && ['mcq', 'true_false', 'multi_select'].includes(q.type)) {
      displayOrderByQuestion.set(q.id, shuffle(q.options.map((_, i) => i)));
    }
  });
  return { questionOrder, displayOrderByQuestion };
};

// An attempt's score is only shown to the student once fully auto-graded
// AND the assessment's release policy actually allows it -- AwaitingReview
// (manual-grade questions still pending) never shows a partial score.
const isReleased = (attempt, assessment) => {
  if (attempt.status !== 'Graded') return false;
  if (attempt.resultReleasedAt) return true;
  if (assessment.resultRelease === 'scheduled' && assessment.resultReleaseAt) {
    return new Date() >= new Date(assessment.resultReleaseAt);
  }
  return false;
};

const buildStudentAttemptResponse = async (attempt, assessment) => {
  const questions = await Question.find({ _id: { $in: attempt.questionOrder } });
  const questionsById = new Map(questions.map((q) => [q.id, q]));
  const orderedQuestions = attempt.questionOrder.map((id) => questionsById.get(id.toString())).filter(Boolean);
  const redactedQuestions = orderedQuestions.map((q) => redactQuestionForStudent(q, attempt.displayOrderByQuestion?.get(q.id)));

  return {
    ...redactAttemptForStudent(attempt.toJSON(), isReleased(attempt, assessment)),
    questions: redactedQuestions,
    // A student can't call GET /assessments/:id (admin/teacher only), so the
    // handful of non-answer-related fields their own attempt page needs to
    // render (title, instructions, config it should respect) are included
    // here instead of requiring a second endpoint.
    assessment: {
      id: assessment.id,
      title: assessment.title,
      instructions: assessment.instructions,
      maxAttempts: assessment.maxAttempts,
      autoSubmitOnTimeUp: assessment.autoSubmitOnTimeUp,
    },
  };
};

// Shared by submit() and the deadline-triggered auto-submit in saveAnswer()
// -- exactly one grading code path regardless of what triggered it.
const finalizeSubmission = async (attempt, assessment) => {
  const questions = await Question.find({ _id: { $in: attempt.questionOrder } });
  const questionsById = new Map(questions.map((q) => [q.id, q]));
  const {
    gradedAnswers, autoScore, totalPossibleMarks, needsManualGrading,
  } = gradeAttempt(attempt.answers, questionsById);

  attempt.answers = gradedAnswers;
  attempt.autoScore = autoScore;
  attempt.totalScore = autoScore; // no manual-grading contribution exists yet (later phase)
  attempt.totalPossibleMarks = totalPossibleMarks;
  attempt.submittedAt = new Date();
  attempt.status = needsManualGrading ? 'AwaitingReview' : 'Graded';
  if (attempt.status === 'Graded' && assessment.resultRelease === 'immediately') {
    attempt.resultReleasedAt = new Date();
  }
  await attempt.save();
  return attempt;
};

// POST /assessments/:assessmentId/attempts
const startAttempt = asyncHandler(async (req, res, next) => {
  const assessment = await Assessment.findById(req.params.assessmentId);
  if (!assessment) return next(new AppError('Assessment not found', 404));
  if (assessment.status !== 'Published') return next(new AppError('This assessment is not currently available', 400));

  const now = new Date();
  if (assessment.startAt && now < assessment.startAt) return next(new AppError('This assessment has not started yet', 400));
  if (assessment.endAt && now > assessment.endAt) return next(new AppError('This assessment is no longer available', 400));

  const student = await resolveStudent(req, next);
  if (!student) return;
  if (student.classId.toString() !== assessment.classId.toString()) {
    return next(new AppError("You are not assigned to this assessment's class", 403));
  }

  const inProgress = await AssessmentAttempt.findOne({ assessmentId: assessment.id, studentId: student.id, status: 'InProgress' });
  if (inProgress) {
    return res.json({ success: true, data: await buildStudentAttemptResponse(inProgress, assessment) });
  }

  const existingCount = await AssessmentAttempt.countDocuments({ assessmentId: assessment.id, studentId: student.id });
  if (existingCount >= assessment.maxAttempts) {
    return next(new AppError('You have used all of your attempts for this assessment', 400));
  }
  if (assessment.questionIds.length === 0) return next(new AppError('This assessment has no questions yet', 400));

  const questions = await Question.find({ _id: { $in: assessment.questionIds } });
  const orderedByAssessment = assessment.questionIds
    .map((id) => questions.find((q) => q.id === id.toString()))
    .filter(Boolean);
  const { questionOrder, displayOrderByQuestion } = buildSnapshot(assessment, orderedByAssessment);

  let deadlineAt = null;
  if (assessment.durationMinutes) deadlineAt = new Date(now.getTime() + assessment.durationMinutes * 60000);
  if (assessment.endAt && (!deadlineAt || assessment.endAt < deadlineAt)) deadlineAt = assessment.endAt;

  const attempt = await AssessmentAttempt.create({
    assessmentId: assessment.id,
    studentId: student.id,
    attemptNumber: existingCount + 1,
    questionOrder,
    displayOrderByQuestion,
    answers: orderedByAssessment.map((q) => ({ questionId: q.id, response: null })),
    startedAt: now,
    deadlineAt,
    status: 'InProgress',
  });

  res.status(201).json({ success: true, data: await buildStudentAttemptResponse(attempt, assessment) });
});

// GET /assessments/:assessmentId/my-attempt
const getMyAttempt = asyncHandler(async (req, res, next) => {
  const assessment = await Assessment.findById(req.params.assessmentId);
  if (!assessment) return next(new AppError('Assessment not found', 404));
  const student = await resolveStudent(req, next);
  if (!student) return;

  const attempt = await AssessmentAttempt.findOne({ assessmentId: assessment.id, studentId: student.id }).sort({ attemptNumber: -1 });
  if (!attempt) return res.json({ success: true, data: null });
  res.json({ success: true, data: await buildStudentAttemptResponse(attempt, assessment) });
});

// PUT /attempts/:id/answer { questionId, response }
const saveAnswer = asyncHandler(async (req, res, next) => {
  const attempt = await AssessmentAttempt.findById(req.params.id);
  if (!attempt) return next(new AppError('Attempt not found', 404));
  const student = await resolveStudent(req, next);
  if (!student) return;
  if (attempt.studentId.toString() !== student.id) return next(new AppError('This is not your attempt', 403));
  if (attempt.status !== 'InProgress') return next(new AppError('This attempt is no longer open for changes', 400, undefined, 'ATTEMPT_LOCKED'));

  if (attempt.deadlineAt && new Date() > attempt.deadlineAt) {
    const assessment = await Assessment.findById(attempt.assessmentId);
    await finalizeSubmission(attempt, assessment);
    return next(new AppError('Time is up — this attempt has been submitted automatically', 400, undefined, 'ATTEMPT_EXPIRED'));
  }

  const { questionId, response } = req.body;
  const answerIndex = attempt.answers.findIndex((a) => a.questionId.toString() === questionId);
  if (answerIndex === -1) return next(new AppError('This question is not part of this attempt', 400));

  attempt.answers[answerIndex].response = response;
  await attempt.save();
  res.json({ success: true, data: { saved: true } });
});

// POST /attempts/:id/submit
const submit = asyncHandler(async (req, res, next) => {
  const attempt = await AssessmentAttempt.findById(req.params.id);
  if (!attempt) return next(new AppError('Attempt not found', 404));
  const student = await resolveStudent(req, next);
  if (!student) return;
  if (attempt.studentId.toString() !== student.id) return next(new AppError('This is not your attempt', 403));
  if (attempt.status !== 'InProgress') return next(new AppError('This attempt has already been submitted', 400));

  const assessment = await Assessment.findById(attempt.assessmentId);
  await finalizeSubmission(attempt, assessment);
  res.json({ success: true, data: await buildStudentAttemptResponse(attempt, assessment) });
});

// POST /attempts/:id/release (teacher/admin)
const release = asyncHandler(async (req, res, next) => {
  const attempt = await AssessmentAttempt.findById(req.params.id);
  if (!attempt) return next(new AppError('Attempt not found', 404));
  const assessment = await Assessment.findById(attempt.assessmentId);
  if (!assessment) return next(new AppError('Assessment not found', 404));
  if (!(await assertCanManageAssessment(req, assessment, next))) return;
  if (attempt.status !== 'Graded') return next(new AppError('This attempt is not fully graded yet', 400));

  attempt.resultReleasedAt = new Date();
  await attempt.save();
  res.json({ success: true, data: { released: true } });
});

// GET /assessments/:id/attempts (teacher/admin)
const listForAssessment = asyncHandler(async (req, res, next) => {
  const assessment = await Assessment.findById(req.params.id);
  if (!assessment) return next(new AppError('Assessment not found', 404));
  if (!(await assertCanManageAssessment(req, assessment, next))) return;

  const attempts = await AssessmentAttempt.find({ assessmentId: assessment.id })
    .populate('student', 'firstName lastName admissionNo')
    .sort({ attemptNumber: -1 });
  res.json({ success: true, data: attempts });
});

module.exports = {
  startAttempt, getMyAttempt, saveAnswer, submit, release, listForAssessment,
};
