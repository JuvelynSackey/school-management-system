const mongoose = require('mongoose');
const idTransformPlugin = require('../plugins/idTransform');
const tenantScopePlugin = require('../plugins/tenantScope');

const studentSafetyNoteSchema = new mongoose.Schema({
  schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', index: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  type: { type: String, required: true, enum: ['pickup', 'medical', 'other'] },
  note: { type: String, required: true, maxlength: 255 },
}, { timestamps: { createdAt: true, updatedAt: false } });

studentSafetyNoteSchema.virtual('student', { ref: 'Student', localField: 'studentId', foreignField: '_id', justOne: true });

studentSafetyNoteSchema.plugin(idTransformPlugin);
studentSafetyNoteSchema.plugin(tenantScopePlugin);

module.exports = mongoose.model('StudentSafetyNote', studentSafetyNoteSchema);
