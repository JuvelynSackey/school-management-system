const mongoose = require('mongoose');
const idTransformPlugin = require('../plugins/idTransform');
const tenantScopePlugin = require('../plugins/tenantScope');

const optionSchema = new mongoose.Schema({
  text: { type: String, required: true, maxlength: 500 },
  isCorrect: { type: Boolean, default: false },
}, { _id: false });

const matchingPairSchema = new mongoose.Schema({
  left: { type: String, required: true, maxlength: 300 },
  right: { type: String, required: true, maxlength: 300 },
}, { _id: false });

const blankSchema = new mongoose.Schema({
  acceptedAnswers: { type: [String], required: true },
}, { _id: false });

// A reusable bank item, not tied to any one assessment or attempt yet (that
// linkage is a later phase). classId is deliberately nullable -- unlike
// Result/Attendance/ExamSchedule, which always mean one specific class
// section, a question is meant to be reusable across every section teaching
// the same subject unless it's genuinely section-specific (mirrors
// TeacherSubjectAssignment.academicTermId's null-means-"all" convention).
const questionSchema = new mongoose.Schema({
  schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', index: true },
  subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
  classId: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', default: null },
  topic: { type: String, required: true, maxlength: 150 },
  curriculumStrand: { type: String, default: null, maxlength: 150 },
  curriculumSubStrand: { type: String, default: null, maxlength: 150 },
  learningObjective: { type: String, default: null, maxlength: 300 },
  difficulty: {
    type: String, required: true, enum: ['Easy', 'Medium', 'Difficult'], default: 'Medium',
  },
  type: {
    type: String,
    required: true,
    enum: ['mcq', 'true_false', 'multi_select', 'matching', 'ordering', 'fill_in_blank', 'essay', 'file_upload'],
  },
  marks: { type: Number, required: true, min: 1 },
  promptText: { type: String, required: true, maxlength: 2000 },
  // Populated by questionBank.controller.js according to `type` -- only the
  // field(s) relevant to that type are ever set; the rest stay undefined
  // rather than empty arrays, so a question's shape on disk always matches
  // what its type actually needs.
  options: { type: [optionSchema], default: undefined },
  matchingPairs: { type: [matchingPairSchema], default: undefined },
  orderItems: { type: [String], default: undefined },
  blanks: { type: [blankSchema], default: undefined },
  // Grading guidance for the human grader -- mainly essay/file_upload
  // (which have no machine-checkable answer at all), but available to any
  // type as optional teacher-facing notes.
  modelAnswer: { type: String, default: null, maxlength: 2000 },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', default: null },
}, { timestamps: true });

questionSchema.index({ schoolId: 1, subjectId: 1, classId: 1, difficulty: 1, type: 1 });
questionSchema.virtual('subject', {
  ref: 'Subject', localField: 'subjectId', foreignField: '_id', justOne: true,
});
questionSchema.virtual('class', {
  ref: 'Class', localField: 'classId', foreignField: '_id', justOne: true,
});
questionSchema.virtual('creator', {
  ref: 'Teacher', localField: 'createdBy', foreignField: '_id', justOne: true,
});

questionSchema.plugin(idTransformPlugin);
questionSchema.plugin(tenantScopePlugin);

module.exports = mongoose.model('Question', questionSchema);
