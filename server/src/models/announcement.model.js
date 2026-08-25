const mongoose = require('mongoose');
const idTransformPlugin = require('../plugins/idTransform');
const tenantScopePlugin = require('../plugins/tenantScope');

const announcementSchema = new mongoose.Schema({
  schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', index: true },
  message: { type: String, required: true, maxlength: 1000 },
  category: { type: String, required: true, enum: ['general', 'fee_reminder'], default: 'general' },
  targetType: { type: String, required: true, enum: ['school', 'class', 'student'] },
  targetClassId: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', default: null },
  targetStudentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', default: null },
  deliveryStatus: { type: String, required: true, enum: ['logged', 'sent'], default: 'logged' },
  channels: {
    type: [String], enum: ['in_app', 'email', 'sms', 'whatsapp'], default: ['in_app'],
  },
  deliveryLog: {
    type: [{ channel: String, status: String, recipientCount: Number }], default: [], _id: false,
  },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  // Per-recipient read receipts — small and bounded (one entry per staff/
  // parent/student who has actually opened this notice), not one row per
  // potential recipient, so this stays cheap even on a school-wide notice.
  readBy: {
    type: [{
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      readAt: { type: Date, default: Date.now },
    }],
    default: [],
    _id: false,
  },
}, { timestamps: { createdAt: true, updatedAt: false } });

announcementSchema.index({ targetType: 1, targetClassId: 1, targetStudentId: 1 });
announcementSchema.virtual('targetClass', { ref: 'Class', localField: 'targetClassId', foreignField: '_id', justOne: true });
announcementSchema.virtual('targetStudent', { ref: 'Student', localField: 'targetStudentId', foreignField: '_id', justOne: true });
announcementSchema.virtual('creator', { ref: 'User', localField: 'createdBy', foreignField: '_id', justOne: true });

announcementSchema.plugin(idTransformPlugin);
announcementSchema.plugin(tenantScopePlugin);

module.exports = mongoose.model('Announcement', announcementSchema);
