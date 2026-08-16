const mongoose = require('mongoose');
const idTransformPlugin = require('../plugins/idTransform');

const academicTermSchema = new mongoose.Schema({
  name: { type: String, required: true, maxlength: 50 },
  academicYear: { type: String, required: true, maxlength: 20 },
  termNumber: { type: Number, required: true },
  startDate: { type: String, default: null },
  endDate: { type: String, default: null },
  isCurrent: { type: Boolean, required: true, default: false },
}, { timestamps: { createdAt: true, updatedAt: false } });

academicTermSchema.index({ academicYear: 1, termNumber: 1 }, { unique: true });
academicTermSchema.plugin(idTransformPlugin);

module.exports = mongoose.model('AcademicTerm', academicTermSchema);
