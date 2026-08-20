const mongoose = require('mongoose');
const idTransformPlugin = require('../plugins/idTransform');
const tenantScopePlugin = require('../plugins/tenantScope');

const houseSchema = new mongoose.Schema({
  schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', index: true },
  name: { type: String, required: true, maxlength: 50 },
  colorHex: { type: String, default: null, maxlength: 7 },
}, { timestamps: { createdAt: true, updatedAt: false } });

houseSchema.index({ schoolId: 1, name: 1 }, { unique: true });
houseSchema.virtual('students', { ref: 'Student', localField: '_id', foreignField: 'houseId' });

houseSchema.plugin(idTransformPlugin);
houseSchema.plugin(tenantScopePlugin);

module.exports = mongoose.model('House', houseSchema);
