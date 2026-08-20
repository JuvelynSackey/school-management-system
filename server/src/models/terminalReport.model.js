const mongoose = require('mongoose');
const idTransformPlugin = require('../plugins/idTransform');
const tenantScopePlugin = require('../plugins/tenantScope');
const { RATING_SCALE } = require('../services/personalAttributes.service');

const attributeRatingSchema = new mongoose.Schema({
  attributeId: { type: mongoose.Schema.Types.ObjectId, ref: 'PersonalAttribute', required: true },
  rating: { type: String, enum: RATING_SCALE, required: true },
}, { _id: false });

const terminalReportSchema = new mongoose.Schema({
  schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', index: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  classId: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true },
  academicTermId: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicTerm', required: true },
  totalMarksObtained: { type: Number, default: null },
  averageScore: { type: Number, default: null },
  classPosition: { type: Number, default: null },
  totalAttendance: { type: Number, default: null },
  outOfAttendance: { type: Number, default: null },
  teacherRemark: { type: String, default: null, maxlength: 500 },
  teacherSignatureName: { type: String, default: null, maxlength: 150 },
  headteacherRemark: { type: String, default: null, maxlength: 500 },
  headteacherSignatureName: { type: String, default: null, maxlength: 150 },
  status: { type: String, required: true, enum: ['Draft', 'Submitted', 'Rejected', 'Locked', 'Published'], default: 'Draft' },
  rejectionReason: { type: String, default: null, maxlength: 500 },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  reviewedAt: { type: Date, default: null },
  personalAttributeRatings: { type: [attributeRatingSchema], default: [] },
}, { timestamps: true });

terminalReportSchema.index({ schoolId: 1, studentId: 1, academicTermId: 1 }, { unique: true });
terminalReportSchema.virtual('student', { ref: 'Student', localField: 'studentId', foreignField: '_id', justOne: true });
terminalReportSchema.virtual('class', { ref: 'Class', localField: 'classId', foreignField: '_id', justOne: true });
terminalReportSchema.virtual('academicTerm', { ref: 'AcademicTerm', localField: 'academicTermId', foreignField: '_id', justOne: true });

terminalReportSchema.plugin(idTransformPlugin);
terminalReportSchema.plugin(tenantScopePlugin);

module.exports = mongoose.model('TerminalReport', terminalReportSchema);
