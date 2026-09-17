const mongoose = require('mongoose');
const idTransformPlugin = require('../plugins/idTransform');
const tenantScopePlugin = require('../plugins/tenantScope');

const answerSchema = new mongoose.Schema({
  questionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Question', required: true },
  // Shape varies by question type (a chosen option index, an array of
  // indices, blank strings, free text...) -- same "only the relevant shape
  // is ever populated" spirit Question itself uses for its type-specific
  // fields, kept Mixed here since the valid shape is entirely dictated by
  // the linked question's type, not by this schema.
  response: { type: mongoose.Schema.Types.Mixed, default: null },
  isCorrect: { type: Boolean, default: null },
  marksAwarded: { type: Number, default: null },
  needsManualGrading: { type: Boolean, default: false },
}, { _id: false });

// One row per attempt at one Assessment by one Student. questionOrder and
// displayOrderByQuestion are a randomization SNAPSHOT taken once at
// creation -- re-fetching an in-progress attempt must never reshuffle what
// the student already saw, so nothing here is recomputed from
// Assessment.randomizeQuestions/randomizeOptions after the attempt exists.
const assessmentAttemptSchema = new mongoose.Schema({
  schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', index: true },
  assessmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Assessment', required: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  attemptNumber: { type: Number, required: true },
  questionOrder: { type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Question' }], default: [] },
  // Map key is the question's id (as a string); value is an array of
  // original indices in the order shown to the student for that question
  // (options for mcq/true_false/multi_select, right-side items for
  // matching, initial arrangement for ordering).
  displayOrderByQuestion: { type: Map, of: [Number], default: undefined },
  answers: { type: [answerSchema], default: [] },
  startedAt: { type: Date, required: true },
  deadlineAt: { type: Date, default: null }, // null = untimed
  submittedAt: { type: Date, default: null },
  status: {
    type: String, enum: ['InProgress', 'Submitted', 'AwaitingReview', 'Graded'], default: 'InProgress',
  },
  autoScore: { type: Number, default: null },
  totalScore: { type: Number, default: null }, // == autoScore until a later phase adds manual-grading marks
  totalPossibleMarks: { type: Number, default: null },
  // Null until the school's Assessment.resultRelease policy allows the
  // student to actually see totalScore/per-question correctness.
  resultReleasedAt: { type: Date, default: null },
}, { timestamps: true });

assessmentAttemptSchema.index({
  schoolId: 1, assessmentId: 1, studentId: 1, attemptNumber: 1,
}, { unique: true });
assessmentAttemptSchema.virtual('assessment', {
  ref: 'Assessment', localField: 'assessmentId', foreignField: '_id', justOne: true,
});
assessmentAttemptSchema.virtual('student', {
  ref: 'Student', localField: 'studentId', foreignField: '_id', justOne: true,
});

assessmentAttemptSchema.plugin(idTransformPlugin);
assessmentAttemptSchema.plugin(tenantScopePlugin);

module.exports = mongoose.model('AssessmentAttempt', assessmentAttemptSchema);
