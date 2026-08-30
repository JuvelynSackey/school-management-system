const mongoose = require('mongoose');
const idTransformPlugin = require('../plugins/idTransform');
const tenantScopePlugin = require('../plugins/tenantScope');

const userSchema = new mongoose.Schema({
  schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', index: true },
  // Students and parents can both go without an email — young basic-school
  // pupils log in by Student.admissionNo, and guardians log in by phone +
  // PIN (see auth.controller.js / guardians.controller.js). Admins and
  // teachers still require one.
  email: {
    type: String,
    required: function requiresEmail() { return !['student', 'parent'].includes(this.role); },
    default: null,
    maxlength: 150,
  },
  phone: { type: String, default: null },
  passwordHash: { type: String, required: true },
  fullName: { type: String, required: true, maxlength: 150 },
  role: { type: String, required: true, enum: ['admin', 'teacher', 'student', 'parent'] },
  status: { type: String, required: true, enum: ['active', 'inactive'], default: 'active' },
  passwordResetTokenHash: { type: String, default: null },
  passwordResetExpiresAt: { type: Date, default: null },
  emailVerified: { type: Boolean, default: false },
  mustChangePassword: { type: Boolean, default: false },
}, { timestamps: true });

userSchema.index({ schoolId: 1, email: 1 }, { unique: true, partialFilterExpression: { email: { $type: 'string' } } });
userSchema.index({ schoolId: 1, phone: 1 }, { unique: true, partialFilterExpression: { phone: { $type: 'string' } } });
userSchema.virtual('teacherProfile', { ref: 'Teacher', localField: '_id', foreignField: 'userId', justOne: true });
userSchema.virtual('studentProfile', { ref: 'Student', localField: '_id', foreignField: 'userId', justOne: true });

userSchema.plugin(idTransformPlugin);
userSchema.plugin(tenantScopePlugin);

module.exports = mongoose.model('User', userSchema);
