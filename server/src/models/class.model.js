const mongoose = require('mongoose');
const idTransformPlugin = require('../plugins/idTransform');
const tenantScopePlugin = require('../plugins/tenantScope');

const classSchema = new mongoose.Schema({
  schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', index: true },
  name: { type: String, required: true, maxlength: 50 },
  section: { type: String, default: null },
  room: { type: String, default: null },
  stage: { type: String, enum: ['Creche', 'Nursery', 'KG', 'Primary', 'JHS'], default: null },
  classTeacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', default: null },
}, { timestamps: true });

// Matches MySQL's NULL-distinct unique semantics: only enforced when a
// section is actually set (mirrors uq_class_name_section).
classSchema.index({ schoolId: 1, name: 1, section: 1 }, {
  unique: true,
  partialFilterExpression: { section: { $type: 'string' } },
});
classSchema.virtual('classTeacher', { ref: 'Teacher', localField: 'classTeacherId', foreignField: '_id', justOne: true });
classSchema.virtual('students', { ref: 'Student', localField: '_id', foreignField: 'classId' });
classSchema.virtual('teacherAssignments', { ref: 'TeacherSubjectAssignment', localField: '_id', foreignField: 'classId' });

classSchema.plugin(idTransformPlugin);
classSchema.plugin(tenantScopePlugin);

module.exports = mongoose.model('Class', classSchema);
