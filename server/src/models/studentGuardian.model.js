const mongoose = require('mongoose');
const idTransformPlugin = require('../plugins/idTransform');

const studentGuardianSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  guardianId: { type: mongoose.Schema.Types.ObjectId, ref: 'Guardian', required: true },
  contactPriority: { type: String, required: true, enum: ['primary', 'secondary'], default: 'primary' },
  isPickupAuthorized: { type: Boolean, required: true, default: true },
}, { timestamps: { createdAt: true, updatedAt: false } });

studentGuardianSchema.index({ studentId: 1, guardianId: 1 }, { unique: true });
studentGuardianSchema.virtual('student', { ref: 'Student', localField: 'studentId', foreignField: '_id', justOne: true });
studentGuardianSchema.virtual('guardian', { ref: 'Guardian', localField: 'guardianId', foreignField: '_id', justOne: true });

studentGuardianSchema.plugin(idTransformPlugin);

module.exports = mongoose.model('StudentGuardian', studentGuardianSchema);
