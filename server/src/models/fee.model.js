const mongoose = require('mongoose');
const idTransformPlugin = require('../plugins/idTransform');

const feeSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  academicTermId: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicTerm', default: null },
  feeStructureId: { type: mongoose.Schema.Types.ObjectId, ref: 'FeeStructure', default: null },
  feeType: { type: String, required: true, maxlength: 100 },
  amountDue: { type: Number, required: true },
  dueDate: { type: String, default: null },
  status: { type: String, required: true, enum: ['Pending', 'Partial', 'Paid'], default: 'Pending' },
}, { timestamps: true });

// Idempotency guard for fee-structure bulk apply — matches MySQL's
// NULL-distinct semantics by only constraining rows where both nullable
// members are actually set (manual ad-hoc fees leave feeStructureId null
// and are never meant to collide with each other).
feeSchema.index({ studentId: 1, feeStructureId: 1, academicTermId: 1 }, {
  unique: true,
  partialFilterExpression: {
    feeStructureId: { $type: 'objectId' },
    academicTermId: { $type: 'objectId' },
  },
});
feeSchema.index({ studentId: 1 });
feeSchema.virtual('student', { ref: 'Student', localField: 'studentId', foreignField: '_id', justOne: true });
feeSchema.virtual('academicTerm', { ref: 'AcademicTerm', localField: 'academicTermId', foreignField: '_id', justOne: true });
feeSchema.virtual('feeStructure', { ref: 'FeeStructure', localField: 'feeStructureId', foreignField: '_id', justOne: true });
feeSchema.virtual('payments', { ref: 'Payment', localField: '_id', foreignField: 'feeId' });

feeSchema.plugin(idTransformPlugin);

module.exports = mongoose.model('Fee', feeSchema);
