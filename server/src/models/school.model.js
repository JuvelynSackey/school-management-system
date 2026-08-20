const mongoose = require('mongoose');
const idTransformPlugin = require('../plugins/idTransform');

// The tenant registry itself. Deliberately thin and NOT tenant-scoped —
// tenantScopePlugin is intentionally not applied here, since every other
// model is scoped relative to a School and School can't be scoped to itself.
const schoolSchema = new mongoose.Schema({
  name: { type: String, required: true, maxlength: 150 },
  slug: {
    type: String, required: true, unique: true, maxlength: 50, lowercase: true, trim: true,
  },
  status: { type: String, required: true, enum: ['active', 'suspended'], default: 'active' },
}, { timestamps: true });

schoolSchema.plugin(idTransformPlugin);

module.exports = mongoose.model('School', schoolSchema);
