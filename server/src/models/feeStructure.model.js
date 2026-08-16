const mongoose = require('mongoose');
const idTransformPlugin = require('../plugins/idTransform');

const feeStructureSchema = new mongoose.Schema({
  name: { type: String, required: true, maxlength: 150 },
  amount: { type: Number, required: true },
  academicTermId: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicTerm', default: null },
}, { timestamps: true });

feeStructureSchema.virtual('academicTerm', { ref: 'AcademicTerm', localField: 'academicTermId', foreignField: '_id', justOne: true });
feeStructureSchema.virtual('fees', { ref: 'Fee', localField: '_id', foreignField: 'feeStructureId' });

feeStructureSchema.plugin(idTransformPlugin);

module.exports = mongoose.model('FeeStructure', feeStructureSchema);
