const mongoose = require('mongoose');
const idTransformPlugin = require('../plugins/idTransform');

const paymentSchema = new mongoose.Schema({
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

module.exports = mongoose.model('Payment', paymentSchema);
