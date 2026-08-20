const mongoose = require('mongoose');
const idTransformPlugin = require('../plugins/idTransform');
const tenantScopePlugin = require('../plugins/tenantScope');

const guardianSchema = new mongoose.Schema({
  schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', index: true },
  fullName: { type: String, required: true, maxlength: 150 },
  phone: { type: String, required: true, maxlength: 50 },
  email: { type: String, default: null },
  relationship: { type: String, default: null },
  address: { type: String, default: null },
  // No `default: null` on purpose, same reasoning as Subject.code — a
  // partial-filter unique index must see the field as genuinely absent for
  // guardians with no login, not explicitly null.
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

guardianSchema.index({ schoolId: 1, phone: 1 }, { unique: true });
guardianSchema.index({ schoolId: 1, userId: 1 }, {
  unique: true,
  partialFilterExpression: { userId: { $type: 'objectId' } },
});
guardianSchema.virtual('studentLinks', { ref: 'StudentGuardian', localField: '_id', foreignField: 'guardianId' });

guardianSchema.plugin(idTransformPlugin);
guardianSchema.plugin(tenantScopePlugin);

module.exports = mongoose.model('Guardian', guardianSchema);
