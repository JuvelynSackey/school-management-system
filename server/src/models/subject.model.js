const mongoose = require('mongoose');
const idTransformPlugin = require('../plugins/idTransform');
const tenantScopePlugin = require('../plugins/tenantScope');

const subjectSchema = new mongoose.Schema({
  schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', index: true },
  name: { type: String, required: true, maxlength: 100 },
  // No `default: null` here on purpose — a sparse unique index only skips
  // documents where the field is truly absent, not ones explicitly set to
  // null, so an explicit default would make every codeless subject collide.
  code: { type: String, maxlength: 20 },
  description: { type: String, default: null },
}, { timestamps: { createdAt: true, updatedAt: false } });

subjectSchema.index({ schoolId: 1, name: 1 }, { unique: true });
subjectSchema.index({ schoolId: 1, code: 1 }, {
  unique: true,
  partialFilterExpression: { code: { $type: 'string' } },
});
subjectSchema.virtual('teacherAssignments', { ref: 'TeacherSubjectAssignment', localField: '_id', foreignField: 'subjectId' });

subjectSchema.plugin(idTransformPlugin);
subjectSchema.plugin(tenantScopePlugin);

module.exports = mongoose.model('Subject', subjectSchema);
