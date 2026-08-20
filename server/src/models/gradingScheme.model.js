const mongoose = require('mongoose');
const idTransformPlugin = require('../plugins/idTransform');
const tenantScopePlugin = require('../plugins/tenantScope');

// One document per School, upserted in place (same singleton pattern as
// SchoolSettings). Defines the class/exam score ceilings and the grade
// bands used everywhere a score is turned into a letter grade, so schools
// can run a different scale than the hardcoded NaCCA default in
// grading.service.js's SCALE fallback.
const bandSchema = new mongoose.Schema({
  min: { type: Number, required: true },
  grade: { type: String, required: true, maxlength: 3 },
  label: { type: String, required: true, maxlength: 30 },
}, { _id: false });

const gradingSchemeSchema = new mongoose.Schema({
  schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School' },
  classScoreMax: { type: Number, default: 50 },
  examScoreMax: { type: Number, default: 50 },
  bands: { type: [bandSchema], default: [] },
}, { timestamps: true });

gradingSchemeSchema.index({ schoolId: 1 }, { unique: true });
gradingSchemeSchema.plugin(idTransformPlugin);
gradingSchemeSchema.plugin(tenantScopePlugin);

module.exports = mongoose.model('GradingScheme', gradingSchemeSchema);
