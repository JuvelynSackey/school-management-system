const mongoose = require('mongoose');
const idTransformPlugin = require('../plugins/idTransform');
const tenantScopePlugin = require('../plugins/tenantScope');

const classSubjectSchema = new mongoose.Schema({
  schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', index: true },
  classId: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true },
  subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
  academicTermId: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicTerm', default: null },
}, { timestamps: { createdAt: true, updatedAt: false } });

classSubjectSchema.index({ schoolId: 1, classId: 1, subjectId: 1, academicTermId: 1 }, {
  unique: true,
  partialFilterExpression: { academicTermId: { $type: 'objectId' } },
});
classSubjectSchema.virtual('class', { ref: 'Class', localField: 'classId', foreignField: '_id', justOne: true });
classSubjectSchema.virtual('subject', { ref: 'Subject', localField: 'subjectId', foreignField: '_id', justOne: true });
classSubjectSchema.virtual('academicTerm', { ref: 'AcademicTerm', localField: 'academicTermId', foreignField: '_id', justOne: true });

classSubjectSchema.plugin(idTransformPlugin);
classSubjectSchema.plugin(tenantScopePlugin);

module.exports = mongoose.model('ClassSubject', classSubjectSchema);
