const mongoose = require('mongoose');
const idTransformPlugin = require('../plugins/idTransform');
const tenantScopePlugin = require('../plugins/tenantScope');

const teacherSchema = new mongoose.Schema({
  schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  staffNo: { type: String, required: true, maxlength: 50 },
  firstName: { type: String, required: true, maxlength: 80 },
  lastName: { type: String, required: true, maxlength: 80 },
  gender: { type: String, default: null },
  phone: { type: String, default: null },
  hireDate: { type: String, default: null },
  qualification: { type: String, default: null },
  status: { type: String, required: true, enum: ['active', 'inactive'], default: 'active' },
  // Self-uploaded via POST /teachers/me/signature — embedded on terminal
  // report cards next to the class-teacher remark when this teacher is the
  // class's homeroom teacher (see reportCardTemplate.service.js).
  signatureUrl: { type: String, default: null },
}, { timestamps: true });

teacherSchema.index({ schoolId: 1, userId: 1 }, { unique: true });
teacherSchema.index({ schoolId: 1, staffNo: 1 }, { unique: true });
teacherSchema.virtual('user', { ref: 'User', localField: 'userId', foreignField: '_id', justOne: true });
teacherSchema.virtual('homeroomClasses', { ref: 'Class', localField: '_id', foreignField: 'classTeacherId' });
teacherSchema.virtual('subjectAssignments', { ref: 'TeacherSubjectAssignment', localField: '_id', foreignField: 'teacherId' });

teacherSchema.plugin(idTransformPlugin);
teacherSchema.plugin(tenantScopePlugin);

module.exports = mongoose.model('Teacher', teacherSchema);
