const mongoose = require('mongoose');
const idTransformPlugin = require('../plugins/idTransform');

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, maxlength: 150 },
  passwordHash: { type: String, required: true },
  fullName: { type: String, required: true, maxlength: 150 },
  role: { type: String, required: true, enum: ['admin', 'teacher', 'student'] },
  status: { type: String, required: true, enum: ['active', 'inactive'], default: 'active' },
}, { timestamps: true });

userSchema.virtual('teacherProfile', { ref: 'Teacher', localField: '_id', foreignField: 'userId', justOne: true });
userSchema.virtual('studentProfile', { ref: 'Student', localField: '_id', foreignField: 'userId', justOne: true });

userSchema.plugin(idTransformPlugin);

module.exports = mongoose.model('User', userSchema);
