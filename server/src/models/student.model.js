const mongoose = require('mongoose');
const idTransformPlugin = require('../plugins/idTransform');
const tenantScopePlugin = require('../plugins/tenantScope');
const { GHANA_REGIONS } = require('../constants/ghanaRegions');

const studentSchema = new mongoose.Schema({
  schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  admissionNo: { type: String, required: true, maxlength: 50 },
  firstName: { type: String, required: true, maxlength: 80 },
  lastName: { type: String, required: true, maxlength: 80 },
  gender: { type: String, default: null },
  dateOfBirth: { type: String, default: null },
  classId: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', default: null },
  address: { type: String, default: null },
  admissionDate: { type: String, default: null },
  category: { type: String, enum: ['Day', 'Boarding', null], default: null },
  programme: { type: String, default: null, maxlength: 100 },
  // Additive to the original 3 -- 'active'/'inactive'/'archived' are used
  // throughout the app (dashboard counts, reports, results, attendance) and
  // stay unchanged; 'transferred'/'withdrawn'/'graduated' are new lifecycle
  // end-states rather than replacements, so every existing status: 'active'
  // filter keeps working exactly as before.
  status: {
    type: String,
    required: true,
    enum: ['active', 'inactive', 'archived', 'transferred', 'withdrawn', 'graduated'],
    default: 'active',
  },
  photoUrl: { type: String, default: null },
  // Mirrors fields on the physical Ghanaian basic-school admission form.
  nationality: { type: String, default: 'Ghanaian', maxlength: 100 },
  religion: { type: String, default: null, maxlength: 100 },
  hometown: { type: String, default: null, maxlength: 100 },
  // No default region on purpose -- defaulting every unset student to
  // "Greater Accra Region" would silently misattribute pupils at schools
  // in any of the other 15 regions. Left null (an honest "not set") until
  // an admin actually picks one from the dropdown.
  region: { type: String, enum: [...GHANA_REGIONS, null], default: null },
  primaryLanguage: { type: String, default: null, maxlength: 100 },
  // No `default: null` here on purpose — same reasoning as subject.model.js's
  // `code` field: a sparse unique index only skips documents where the field
  // is truly absent, not ones explicitly set to null, so an explicit default
  // would make every student without a WAEC index number collide.
  waecIndexNumber: { type: String, maxlength: 20 },
}, { timestamps: true });

studentSchema.index({ schoolId: 1, userId: 1 }, { unique: true });
studentSchema.index({ schoolId: 1, admissionNo: 1 }, { unique: true });
studentSchema.index({ schoolId: 1, waecIndexNumber: 1 }, {
  unique: true,
  partialFilterExpression: { waecIndexNumber: { $type: 'string' } },
});
studentSchema.virtual('user', { ref: 'User', localField: 'userId', foreignField: '_id', justOne: true });
studentSchema.virtual('class', { ref: 'Class', localField: 'classId', foreignField: '_id', justOne: true });
studentSchema.virtual('safetyNotes', { ref: 'StudentSafetyNote', localField: '_id', foreignField: 'studentId' });
studentSchema.virtual('attendanceRecords', { ref: 'Attendance', localField: '_id', foreignField: 'studentId' });
studentSchema.virtual('results', { ref: 'Result', localField: '_id', foreignField: 'studentId' });
studentSchema.virtual('fees', { ref: 'Fee', localField: '_id', foreignField: 'studentId' });
studentSchema.virtual('terminalReports', { ref: 'TerminalReport', localField: '_id', foreignField: 'studentId' });
studentSchema.virtual('guardianLinks', { ref: 'StudentGuardian', localField: '_id', foreignField: 'studentId' });

studentSchema.plugin(idTransformPlugin);
studentSchema.plugin(tenantScopePlugin);

module.exports = mongoose.model('Student', studentSchema);
