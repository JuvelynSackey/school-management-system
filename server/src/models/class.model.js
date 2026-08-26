const mongoose = require('mongoose');
const idTransformPlugin = require('../plugins/idTransform');
const tenantScopePlugin = require('../plugins/tenantScope');
const { GRADE_LEVEL_VALUES, UNRANKED_LEVEL_ORDER } = require('../constants/gradeLevels');

const classSchema = new mongoose.Schema({
  schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', index: true },
  name: { type: String, required: true, maxlength: 50 },
  section: { type: String, default: null },
  room: { type: String, default: null },
  stage: { type: String, enum: ['Creche', 'Nursery', 'KG', 'Primary', 'JHS'], default: null },
  // gradeLevel: the precise Ghanaian hierarchy rung (see constants/gradeLevels.js),
  // separate from the coarser `stage` grouping. levelOrder is derived from it
  // at write time (classes.controller.js) and stored so every list-fetch can
  // sort with a plain .sort({levelOrder:1}) instead of re-deriving per query.
  gradeLevel: { type: String, enum: GRADE_LEVEL_VALUES, default: null },
  levelOrder: { type: Number, default: UNRANKED_LEVEL_ORDER },
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
