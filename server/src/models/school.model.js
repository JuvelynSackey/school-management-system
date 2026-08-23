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
  // 'pending' only comes from self-registration (schoolRegistration.controller.js)
  // — every other creation path (super-admin's schools.controller.js) still
  // defaults straight to 'active', unaffected by this addition. A pending or
  // rejected school simply can't log in yet: auth.controller.js's login
  // already filters `School.findOne({ slug, status: 'active' })`, so no
  // separate gate was needed there.
  status: {
    type: String, required: true, enum: ['pending', 'active', 'suspended', 'rejected'], default: 'active',
  },
}, { timestamps: true });

schoolSchema.plugin(idTransformPlugin);

module.exports = mongoose.model('School', schoolSchema);
