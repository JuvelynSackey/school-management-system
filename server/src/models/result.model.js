const mongoose = require('mongoose');
const idTransformPlugin = require('../plugins/idTransform');
const tenantScopePlugin = require('../plugins/tenantScope');

const resultSchema = new mongoose.Schema({
  schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', index: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
  classId: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true },
  academicTermId: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicTerm', required: true },
  classScore: { type: Number, required: true },
  examScore: { type: Number, required: true },
  totalScore: { type: Number, default: null },
  grade: { type: String, default: null, maxlength: 3 },
  subjectPosition: { type: Number, default: null },
  remarks: { type: String, default: null },
  recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', default: null },
  // Set only by the historical-scores migration importer (migration.service.js)
  // -- lets a school distinguish live-entered marks from backfilled legacy
  // records without needing a separate collection or query path.
  isMigrated: { type: Boolean, default: false },
  migratedAt: { type: Date, default: null },
}, { timestamps: true });

resultSchema.index({ schoolId: 1, studentId: 1, subjectId: 1, academicTermId: 1 }, { unique: true });

// Was a MySQL GENERATED ALWAYS AS (class_score + exam_score) STORED column.
resultSchema.pre('save', function computeTotalScore(next) {
  this.totalScore = Number(this.classScore) + Number(this.examScore);
  next();
});

resultSchema.virtual('student', { ref: 'Student', localField: 'studentId', foreignField: '_id', justOne: true });
resultSchema.virtual('subject', { ref: 'Subject', localField: 'subjectId', foreignField: '_id', justOne: true });
resultSchema.virtual('class', { ref: 'Class', localField: 'classId', foreignField: '_id', justOne: true });
resultSchema.virtual('academicTerm', { ref: 'AcademicTerm', localField: 'academicTermId', foreignField: '_id', justOne: true });
resultSchema.virtual('recorder', { ref: 'Teacher', localField: 'recordedBy', foreignField: '_id', justOne: true });

resultSchema.plugin(idTransformPlugin);
resultSchema.plugin(tenantScopePlugin);

module.exports = mongoose.model('Result', resultSchema);
