const mongoose = require('mongoose');
const idTransformPlugin = require('../plugins/idTransform');
const tenantScopePlugin = require('../plugins/tenantScope');

// Pure status/metadata tracker for one class+subject+term's worth of scores —
// deliberately does NOT store scores itself (those stay on Result, unchanged).
// Lets a teacher's subject-level submission be tracked/approved independently
// of how TerminalReport aggregates the whole student's report card.
const resultSheetSchema = new mongoose.Schema({
  schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', index: true },
  classId: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true },
  subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
  academicTermId: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicTerm', required: true },
  status: {
    type: String, required: true, enum: ['Draft', 'Submitted', 'Rejected', 'Approved'], default: 'Draft',
  },
  submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', default: null },
  submittedAt: { type: Date, default: null },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  reviewedAt: { type: Date, default: null },
  rejectionReason: { type: String, default: null, maxlength: 500 },
}, { timestamps: true });

resultSheetSchema.index({ schoolId: 1, classId: 1, subjectId: 1, academicTermId: 1 }, { unique: true });
resultSheetSchema.virtual('class', { ref: 'Class', localField: 'classId', foreignField: '_id', justOne: true });
resultSheetSchema.virtual('subject', { ref: 'Subject', localField: 'subjectId', foreignField: '_id', justOne: true });
resultSheetSchema.virtual('academicTerm', { ref: 'AcademicTerm', localField: 'academicTermId', foreignField: '_id', justOne: true });
resultSheetSchema.virtual('submitter', { ref: 'Teacher', localField: 'submittedBy', foreignField: '_id', justOne: true });

resultSheetSchema.plugin(idTransformPlugin);
resultSheetSchema.plugin(tenantScopePlugin);

module.exports = mongoose.model('ResultSheet', resultSheetSchema);
