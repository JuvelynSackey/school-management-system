const mongoose = require('mongoose');
const idTransformPlugin = require('../plugins/idTransform');

// Platform-level account — deliberately outside the tenant model set. Not
// scoped to any School, and tenantScopePlugin is never applied here.
const superAdminSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, maxlength: 150 },
  passwordHash: { type: String, required: true },
  fullName: { type: String, required: true, maxlength: 150 },
  status: { type: String, required: true, enum: ['active', 'inactive'], default: 'active' },
}, { timestamps: true });

superAdminSchema.plugin(idTransformPlugin);

module.exports = mongoose.model('SuperAdmin', superAdminSchema);
