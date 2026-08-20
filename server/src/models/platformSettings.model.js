const mongoose = require('mongoose');
const idTransformPlugin = require('../plugins/idTransform');

// Platform-wide singleton — deliberately NOT tenant-scoped (tenantScopePlugin
// is never applied here), same pattern as School/SuperAdmin. Exactly one
// document ever exists, upserted in place like SchoolSettings is per-school.
const platformSettingsSchema = new mongoose.Schema({
  maintenanceMode: {
    enabled: { type: Boolean, default: false },
    message: { type: String, default: 'JesManage is currently undergoing scheduled maintenance. We\'ll be back shortly.' },
  },
  minPasswordLength: { type: Number, default: 8 },
}, { timestamps: true });

platformSettingsSchema.plugin(idTransformPlugin);

module.exports = mongoose.model('PlatformSettings', platformSettingsSchema);
