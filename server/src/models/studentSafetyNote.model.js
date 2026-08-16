const mongoose = require('mongoose');
const idTransformPlugin = require('../plugins/idTransform');

const studentSafetyNoteSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  type: { type: String, required: true, enum: ['pickup', 'medical', 'other'] },
  note: { type: String, required: true, maxlength: 255 },
}, { timestamps: { createdAt: true, updatedAt: false } });

studentSafetyNoteSchema.virtual('student', { ref: 'Student', localField: 'studentId', foreignField: '_id', justOne: true });

studentSafetyNoteSchema.plugin(idTransformPlugin);

module.exports = mongoose.model('StudentSafetyNote', studentSafetyNoteSchema);
