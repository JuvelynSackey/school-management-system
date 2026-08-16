const mongoose = require('mongoose');
const idTransformPlugin = require('../plugins/idTransform');

const studentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  admissionNo: { type: String, required: true, unique: true, maxlength: 50 },
  firstName: { type: String, required: true, maxlength: 80 },
  lastName: { type: String, required: true, maxlength: 80 },
  gender: { type: String, default: null },
  dateOfBirth: { type: String, default: null },
  classId: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', default: null },
  houseId: { type: mongoose.Schema.Types.ObjectId, ref: 'House', default: null },
  address: { type: String, default: null },
  admissionDate: { type: String, default: null },
  status: { type: String, required: true, enum: ['active', 'inactive', 'archived'], default: 'active' },
}, { timestamps: true });

studentSchema.virtual('user', { ref: 'User', localField: 'userId', foreignField: '_id', justOne: true });
studentSchema.virtual('class', { ref: 'Class', localField: 'classId', foreignField: '_id', justOne: true });
studentSchema.virtual('house', { ref: 'House', localField: 'houseId', foreignField: '_id', justOne: true });
studentSchema.virtual('safetyNotes', { ref: 'StudentSafetyNote', localField: '_id', foreignField: 'studentId' });
studentSchema.virtual('attendanceRecords', { ref: 'Attendance', localField: '_id', foreignField: 'studentId' });
studentSchema.virtual('results', { ref: 'Result', localField: '_id', foreignField: 'studentId' });
studentSchema.virtual('fees', { ref: 'Fee', localField: '_id', foreignField: 'studentId' });
studentSchema.virtual('terminalReports', { ref: 'TerminalReport', localField: '_id', foreignField: 'studentId' });
studentSchema.virtual('guardianLinks', { ref: 'StudentGuardian', localField: '_id', foreignField: 'studentId' });

studentSchema.plugin(idTransformPlugin);

module.exports = mongoose.model('Student', studentSchema);
