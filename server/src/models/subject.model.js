const mongoose = require('mongoose');
const idTransformPlugin = require('../plugins/idTransform');

const subjectSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, maxlength: 100 },
  // No `default: null` here on purpose — a sparse unique index only skips
  // documents where the field is truly absent, not ones explicitly set to
  // null, so an explicit default would make every codeless subject collide.
  code: { type: String, unique: true, sparse: true, maxlength: 20 },
  description: { type: String, default: null },
}, { timestamps: { createdAt: true, updatedAt: false } });

subjectSchema.virtual('teacherAssignments', { ref: 'TeacherSubjectAssignment', localField: '_id', foreignField: 'subjectId' });

subjectSchema.plugin(idTransformPlugin);

module.exports = mongoose.model('Subject', subjectSchema);
