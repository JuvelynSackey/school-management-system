const mongoose = require('mongoose');
const idTransformPlugin = require('../plugins/idTransform');
const tenantScopePlugin = require('../plugins/tenantScope');

// One row per student per charged school-day — the idempotency guard (a
// student can't be double-charged the same day) and the audit trail behind
// the daily feeding log and the end-of-day reconciliation summary. The
// running termly total itself lives on the Feeding-category Fee this charge
// rolls into (`feeId`), not here — this is a log of individual day-charges,
// not a second source of truth for the balance.
const feedingChargeSchema = new mongoose.Schema({
  schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', index: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  classId: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true },
  feeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Fee', required: true },
  date: { type: String, required: true },
  amount: { type: Number, required: true },
  recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
}, { timestamps: { createdAt: true, updatedAt: false } });

feedingChargeSchema.index({ schoolId: 1, studentId: 1, date: 1 }, { unique: true });
feedingChargeSchema.index({ classId: 1, date: 1 });
feedingChargeSchema.virtual('student', { ref: 'Student', localField: 'studentId', foreignField: '_id', justOne: true });

feedingChargeSchema.plugin(idTransformPlugin);
feedingChargeSchema.plugin(tenantScopePlugin);

module.exports = mongoose.model('FeedingCharge', feedingChargeSchema);
