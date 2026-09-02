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

// A component's maxMarks are validated (result.service.js's
// validateClassScoreConfig) to sum to exactly classScoreMax at write time —
// not enforced here at the schema level, since that check is cross-field
// (against a sibling property) and needs a clear error message, not a
// generic Mongoose validation failure.
const classScoreComponentSchema = new mongoose.Schema({
  key: { type: String, required: true, maxlength: 40 },
  label: { type: String, required: true, maxlength: 60 },
  maxMarks: { type: Number, required: true, min: 1 },
}, { _id: false });

const gradingSchemeSchema = new mongoose.Schema({
  schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School' },
  classScoreMax: { type: Number, default: 50 },
  examScoreMax: { type: Number, default: 50 },
  bands: { type: [bandSchema], default: [] },
  // Optional class-score decomposition: when enabled, a teacher enters
  // per-component marks (e.g. exercises/assignments/project) instead of one
  // raw classScore number, and Result.classScore is the sum -- the report
  // card, grading, and every analytics feature still only ever reads the
  // single summed classScore, unchanged.
  classScoreConfig: {
    enabled: { type: Boolean, default: false },
    components: { type: [classScoreComponentSchema], default: [] },
  },
}, { timestamps: true });

gradingSchemeSchema.index({ schoolId: 1 }, { unique: true });
gradingSchemeSchema.plugin(idTransformPlugin);
gradingSchemeSchema.plugin(tenantScopePlugin);

module.exports = mongoose.model('GradingScheme', gradingSchemeSchema);
