const mongoose = require('mongoose');
const idTransformPlugin = require('../plugins/idTransform');
const tenantScopePlugin = require('../plugins/tenantScope');

const academicTermSchema = new mongoose.Schema({
  schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', index: true },
  name: { type: String, required: true, maxlength: 50 },
  academicYear: { type: String, required: true, maxlength: 20 },
  termNumber: { type: Number, required: true },
  startDate: { type: String, default: null },
  endDate: { type: String, default: null },
  isCurrent: { type: Boolean, required: true, default: false },
}, { timestamps: { createdAt: true, updatedAt: false } });

academicTermSchema.index({ schoolId: 1, academicYear: 1, termNumber: 1 }, { unique: true });
academicTermSchema.plugin(idTransformPlugin);
academicTermSchema.plugin(tenantScopePlugin);

module.exports = mongoose.model('AcademicTerm', academicTermSchema);
