const mongoose = require('mongoose');
const idTransformPlugin = require('../plugins/idTransform');

const guardianSchema = new mongoose.Schema({
  fullName: { type: String, required: true, maxlength: 150 },
  phone: { type: String, required: true, unique: true, maxlength: 50 },
  email: { type: String, default: null },
  relationship: { type: String, default: null },
  address: { type: String, default: null },
}, { timestamps: true });

guardianSchema.virtual('studentLinks', { ref: 'StudentGuardian', localField: '_id', foreignField: 'guardianId' });

guardianSchema.plugin(idTransformPlugin);

module.exports = mongoose.model('Guardian', guardianSchema);
