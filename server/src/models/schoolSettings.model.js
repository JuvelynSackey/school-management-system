const mongoose = require('mongoose');
const idTransformPlugin = require('../plugins/idTransform');
const tenantScopePlugin = require('../plugins/tenantScope');

// One document per School, upserted in place. Used to brand the report-card
// PDF header/footer and reusable anywhere else the school's own identity is
// needed later.
const schoolSettingsSchema = new mongoose.Schema({
  schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School' },
  name: { type: String, default: '' },
  motto: { type: String, default: '' },
  address: { type: String, default: '' },
  phone: { type: String, default: '' },
  email: { type: String, default: '' },
  logoUrl: { type: String, default: null },
  headteacherName: { type: String, default: '' },
  headteacherSignatureUrl: { type: String, default: null },
  primaryColor: { type: String, default: null },
  secondaryColor: { type: String, default: null },
  reportCardFeeGateEnabled: { type: Boolean, default: false },
  performanceChartEnabled: { type: Boolean, default: false },
  communicationChannelsEnabled: {
    email: { type: Boolean, default: false },
    sms: { type: Boolean, default: false },
    whatsapp: { type: Boolean, default: false },
  },
  feedingFeeEnabled: { type: Boolean, default: false },
  feedingRatePerDay: { type: Number, default: 0 },
}, { timestamps: true });

schoolSettingsSchema.index({ schoolId: 1 }, { unique: true });
schoolSettingsSchema.plugin(idTransformPlugin);
schoolSettingsSchema.plugin(tenantScopePlugin);

module.exports = mongoose.model('SchoolSettings', schoolSettingsSchema);
