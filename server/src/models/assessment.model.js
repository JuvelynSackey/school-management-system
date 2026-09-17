const mongoose = require('mongoose');
const idTransformPlugin = require('../plugins/idTransform');
const tenantScopePlugin = require('../plugins/tenantScope');

// A scheduled, configured test assembled from Question Bank items and
// assigned to one real class/term -- unlike Question (a reusable bank
// item), an Assessment is actually administered, so classId/subjectId/
// academicTermId are all required here. questionIds references the bank
// rather than copying question content; snapshotting at attempt-time (so a
// later edit to a bank question can't retroactively change an in-progress
// or completed test) is deliberately left to the Attempts phase, not solved
// here.
const assessmentSchema = new mongoose.Schema({
  schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', index: true },
  title: { type: String, required: true, maxlength: 200 },
  subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
  classId: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true },
  academicTermId: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicTerm', required: true },
  instructions: { type: String, default: null, maxlength: 2000 },
  assessmentType: {
    type: String, enum: ['classwork', 'homework', 'project', 'midterm', 'exam', 'other'], default: 'classwork',
  },
  // Optional link to GradingScheme.classScoreConfig.components[].key -- the
  // hook a later phase uses to feed an attempt's score into Result's own
  // classScoreDetails. Stored now, not acted on until grading exists.
  classScoreComponentKey: { type: String, default: null },
  questionIds: { type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Question' }], default: [] },
  startAt: { type: Date, default: null },
  endAt: { type: Date, default: null },
  durationMinutes: { type: Number, default: null }, // null = untimed
  maxAttempts: { type: Number, default: 1, min: 1 },
  randomizeQuestions: { type: Boolean, default: false },
  randomizeOptions: { type: Boolean, default: false },
  allowBacktracking: { type: Boolean, default: true },
  autoSubmitOnTimeUp: { type: Boolean, default: true },
  resultRelease: {
    type: String, enum: ['immediately', 'after_review', 'scheduled', 'manual'], default: 'after_review',
  },
  resultReleaseAt: { type: Date, default: null },
  status: {
    type: String, enum: ['Draft', 'Published', 'Closed'], default: 'Draft',
  },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', default: null },
}, { timestamps: true });

assessmentSchema.index({
  schoolId: 1, classId: 1, subjectId: 1, academicTermId: 1, status: 1,
});
assessmentSchema.virtual('subject', {
  ref: 'Subject', localField: 'subjectId', foreignField: '_id', justOne: true,
});
assessmentSchema.virtual('class', {
  ref: 'Class', localField: 'classId', foreignField: '_id', justOne: true,
});
assessmentSchema.virtual('academicTerm', {
  ref: 'AcademicTerm', localField: 'academicTermId', foreignField: '_id', justOne: true,
});
assessmentSchema.virtual('creator', {
  ref: 'Teacher', localField: 'createdBy', foreignField: '_id', justOne: true,
});
assessmentSchema.virtual('questions', {
  ref: 'Question', localField: 'questionIds', foreignField: '_id',
});

assessmentSchema.plugin(idTransformPlugin);
assessmentSchema.plugin(tenantScopePlugin);

module.exports = mongoose.model('Assessment', assessmentSchema);
