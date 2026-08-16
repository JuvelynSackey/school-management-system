const mongoose = require('mongoose');
const idTransformPlugin = require('../plugins/idTransform');

const teacherSubjectAssignmentSchema = new mongoose.Schema({
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', required: true },
  subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
  classId: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true },
  academicTermId: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicTerm', default: null },
}, { timestamps: { createdAt: true, updatedAt: false } });

teacherSubjectAssignmentSchema.index(
  { teacherId: 1, subjectId: 1, classId: 1, academicTermId: 1 },
  { unique: true, partialFilterExpression: { academicTermId: { $type: 'objectId' } } },
);
teacherSubjectAssignmentSchema.virtual('teacher', { ref: 'Teacher', localField: 'teacherId', foreignField: '_id', justOne: true });
teacherSubjectAssignmentSchema.virtual('subject', { ref: 'Subject', localField: 'subjectId', foreignField: '_id', justOne: true });
teacherSubjectAssignmentSchema.virtual('class', { ref: 'Class', localField: 'classId', foreignField: '_id', justOne: true });
teacherSubjectAssignmentSchema.virtual('academicTerm', { ref: 'AcademicTerm', localField: 'academicTermId', foreignField: '_id', justOne: true });

teacherSubjectAssignmentSchema.plugin(idTransformPlugin);

module.exports = mongoose.model('TeacherSubjectAssignment', teacherSubjectAssignmentSchema);
