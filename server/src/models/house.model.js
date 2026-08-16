const mongoose = require('mongoose');
const idTransformPlugin = require('../plugins/idTransform');

const houseSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, maxlength: 50 },
  colorHex: { type: String, default: null, maxlength: 7 },
}, { timestamps: { createdAt: true, updatedAt: false } });

houseSchema.virtual('students', { ref: 'Student', localField: '_id', foreignField: 'houseId' });

houseSchema.plugin(idTransformPlugin);

module.exports = mongoose.model('House', houseSchema);
