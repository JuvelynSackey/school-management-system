const mongoose = require('mongoose');
const idTransformPlugin = require('../plugins/idTransform');

// Singleton — always exactly one document, upserted in place. Used to brand
// the report-card PDF header/footer and reusable anywhere else the school's
// own identity is needed later.
const schoolSettingsSchema = new mongoose.Schema({
  name: { type: String, default: '' },
  motto: { type: String, default: '' },
  address: { type: String, default: '' },
  phone: { type: String, default: '' },
  email: { type: String, default: '' },
}, { timestamps: true });

schoolSettingsSchema.plugin(idTransformPlugin);

module.exports = mongoose.model('SchoolSettings', schoolSettingsSchema);
