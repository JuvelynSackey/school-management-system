const mongoose = require('mongoose');
const idTransformPlugin = require('../plugins/idTransform');

const announcementSchema = new mongoose.Schema({
  message: { type: String, required: true, maxlength: 1000 },
  category: { type: String, required: true, enum: ['general', 'fee_reminder'], default: 'general' },
  targetType: { type: String, required: true, enum: ['school', 'class', 'student'] },
  targetClassId: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', default: null },
  targetStudentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', default: null },
  deliveryStatus: { type: String, required: true, enum: ['logged', 'sent'], default: 'logged' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
}, { timestamps: { createdAt: true, updatedAt: false } });

announcementSchema.index({ targetType: 1, targetClassId: 1, targetStudentId: 1 });
announcementSchema.virtual('targetClass', { ref: 'Class', localField: 'targetClassId', foreignField: '_id', justOne: true });
announcementSchema.virtual('targetStudent', { ref: 'Student', localField: 'targetStudentId', foreignField: '_id', justOne: true });
announcementSchema.virtual('creator', { ref: 'User', localField: 'createdBy', foreignField: '_id', justOne: true });

announcementSchema.plugin(idTransformPlugin);

module.exports = mongoose.model('Announcement', announcementSchema);
