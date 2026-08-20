const mongoose = require('mongoose');
const idTransformPlugin = require('../plugins/idTransform');
const tenantScopePlugin = require('../plugins/tenantScope');

const attendanceSchema = new mongoose.Schema({
  schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', index: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  classId: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true },
  academicTermId: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicTerm', default: null },
  attendanceDate: { type: String, required: true },
  status: { type: String, required: true, enum: ['Present', 'Absent', 'Late', 'Excused'] },
  recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  remarks: { type: String, default: null },
}, { timestamps: { createdAt: true, updatedAt: false } });

attendanceSchema.index({ schoolId: 1, studentId: 1, attendanceDate: 1 }, { unique: true });
attendanceSchema.index({ classId: 1, attendanceDate: 1 });
attendanceSchema.virtual('student', { ref: 'Student', localField: 'studentId', foreignField: '_id', justOne: true });
attendanceSchema.virtual('class', { ref: 'Class', localField: 'classId', foreignField: '_id', justOne: true });
attendanceSchema.virtual('academicTerm', { ref: 'AcademicTerm', localField: 'academicTermId', foreignField: '_id', justOne: true });
attendanceSchema.virtual('recorder', { ref: 'User', localField: 'recordedBy', foreignField: '_id', justOne: true });

attendanceSchema.plugin(idTransformPlugin);
attendanceSchema.plugin(tenantScopePlugin);

module.exports = mongoose.model('Attendance', attendanceSchema);
