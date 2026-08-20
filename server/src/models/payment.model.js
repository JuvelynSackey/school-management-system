const mongoose = require('mongoose');
const idTransformPlugin = require('../plugins/idTransform');
const tenantScopePlugin = require('../plugins/tenantScope');

const paymentSchema = new mongoose.Schema({
  schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', index: true },
  feeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Fee', required: true },
  amountPaid: { type: Number, required: true },
  paymentDate: { type: String, required: true },
  paymentMethod: {
    type: String,
    required: true,
    enum: ['Cash', 'Bank Transfer', 'Mobile Money', 'Card', 'Cheque', 'Other'],
    default: 'Cash',
  },
  referenceNo: { type: String, default: null },
  receivedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  notes: { type: String, default: null },
}, { timestamps: { createdAt: true, updatedAt: false } });

paymentSchema.index({ feeId: 1 });
paymentSchema.virtual('fee', { ref: 'Fee', localField: 'feeId', foreignField: '_id', justOne: true });
paymentSchema.virtual('receiver', { ref: 'User', localField: 'receivedBy', foreignField: '_id', justOne: true });

paymentSchema.plugin(idTransformPlugin);
paymentSchema.plugin(tenantScopePlugin);

module.exports = mongoose.model('Payment', paymentSchema);
