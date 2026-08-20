const mongoose = require('mongoose');
const idTransformPlugin = require('../plugins/idTransform');
const tenantScopePlugin = require('../plugins/tenantScope');

// School-configurable list of report-card personal-attribute rows (e.g.
// "Discipline", "Punctuality") — reusable across terms, not per-term data.
// The rating SCALE itself is fixed (see personalAttribute.service.js),
// only which attributes a school tracks is configurable.
const personalAttributeSchema = new mongoose.Schema({
  schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', index: true },
  name: { type: String, required: true, maxlength: 100 },
  order: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

personalAttributeSchema.index({ schoolId: 1, name: 1 }, { unique: true });
personalAttributeSchema.plugin(idTransformPlugin);
personalAttributeSchema.plugin(tenantScopePlugin);

module.exports = mongoose.model('PersonalAttribute', personalAttributeSchema);
