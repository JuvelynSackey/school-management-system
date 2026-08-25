const mongoose = require('mongoose');
const idTransformPlugin = require('../plugins/idTransform');
const tenantScopePlugin = require('../plugins/tenantScope');

// One entry per class/subject/term — when that subject's exam for that
// class happens. examDate is a String (ISO date, "2026-11-10"), same
// convention as AcademicTerm.startDate/endDate and Attendance.attendanceDate
// elsewhere in this app, not a native Date type.
const examScheduleSchema = new mongoose.Schema({
  schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', index: true },
  academicTermId: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicTerm', required: true },
  classId: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true },
  subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
  examDate: { type: String, required: true },
  startTime: { type: String, required: true },
  endTime: { type: String, required: true },
  room: { type: String, default: null },
}, { timestamps: true });

// One scheduled exam per class/subject/term -- prevents accidentally
// double-booking the same subject twice for the same class in one term.
examScheduleSchema.index({ schoolId: 1, academicTermId: 1, classId: 1, subjectId: 1 }, { unique: true });
examScheduleSchema.index({ schoolId: 1, academicTermId: 1, examDate: 1 });

examScheduleSchema.virtual('class', {
  ref: 'Class', localField: 'classId', foreignField: '_id', justOne: true,
});
examScheduleSchema.virtual('subject', {
  ref: 'Subject', localField: 'subjectId', foreignField: '_id', justOne: true,
});
examScheduleSchema.virtual('academicTerm', {
  ref: 'AcademicTerm', localField: 'academicTermId', foreignField: '_id', justOne: true,
});

examScheduleSchema.plugin(idTransformPlugin);
examScheduleSchema.plugin(tenantScopePlugin);

module.exports = mongoose.model('ExamSchedule', examScheduleSchema);
