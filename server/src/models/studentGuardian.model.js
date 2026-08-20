const mongoose = require('mongoose');
const idTransformPlugin = require('../plugins/idTransform');
const tenantScopePlugin = require('../plugins/tenantScope');

const studentGuardianSchema = new mongoose.Schema({
  schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', index: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  guardianId: { type: mongoose.Schema.Types.ObjectId, ref: 'Guardian', required: true },
  contactPriority: { type: String, required: true, enum: ['primary', 'secondary'], default: 'primary' },
  isPickupAuthorized: { type: Boolean, required: true, default: true },
}, { timestamps: { createdAt: true, updatedAt: false } });

studentGuardianSchema.index({ schoolId: 1, studentId: 1, guardianId: 1 }, { unique: true });
studentGuardianSchema.virtual('student', { ref: 'Student', localField: 'studentId', foreignField: '_id', justOne: true });
studentGuardianSchema.virtual('guardian', { ref: 'Guardian', localField: 'guardianId', foreignField: '_id', justOne: true });

studentGuardianSchema.plugin(idTransformPlugin);
studentGuardianSchema.plugin(tenantScopePlugin);

module.exports = mongoose.model('StudentGuardian', studentGuardianSchema);
