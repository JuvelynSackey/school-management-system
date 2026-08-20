const mongoose = require('mongoose');
const idTransformPlugin = require('../plugins/idTransform');
const tenantScopePlugin = require('../plugins/tenantScope');

const feeStructureSchema = new mongoose.Schema({
  schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', index: true },
  name: { type: String, required: true, maxlength: 150 },
  category: {
    type: String, required: true, enum: ['Tuition', 'Feeding', 'ClassActivity', 'PTA', 'Other'], default: 'Tuition',
  },
  amount: { type: Number, required: true },
  academicTermId: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicTerm', default: null },
}, { timestamps: true });

feeStructureSchema.virtual('academicTerm', { ref: 'AcademicTerm', localField: 'academicTermId', foreignField: '_id', justOne: true });
feeStructureSchema.virtual('fees', { ref: 'Fee', localField: '_id', foreignField: 'feeStructureId' });

feeStructureSchema.plugin(idTransformPlugin);
feeStructureSchema.plugin(tenantScopePlugin);

module.exports = mongoose.model('FeeStructure', feeStructureSchema);
