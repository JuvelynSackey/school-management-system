const mongoose = require('mongoose');
const idTransformPlugin = require('../plugins/idTransform');
const tenantScopePlugin = require('../plugins/tenantScope');

const auditLogSchema = new mongoose.Schema({
  // No `default` here on purpose — tenantScopePlugin's pre-save hook only
  // auto-stamps the current tenant's schoolId when the field is left
  // *unset* (`undefined`), which a schema default would prevent. Super-admin
  // / system-authored entries pass `schoolId` explicitly (a real id, or
  // `null` for truly platform-wide events) to bypass the stamp.
  schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', index: true },
  actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  actorType: {
    type: String, enum: ['user', 'super-admin', 'system'], default: 'user',
  },
  actorName: { type: String, default: null },
  actorRole: { type: String, default: null },
  action: { type: String, required: true },
  entityType: { type: String, required: true },
  entityId: { type: mongoose.Schema.Types.ObjectId, default: null },
  description: { type: String, required: true },
  metadata: { type: mongoose.Schema.Types.Mixed, default: null },
}, { timestamps: true });

auditLogSchema.index({ schoolId: 1, createdAt: -1 });

auditLogSchema.plugin(idTransformPlugin);
auditLogSchema.plugin(tenantScopePlugin);

module.exports = mongoose.model('AuditLog', auditLogSchema);
