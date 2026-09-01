const mongoose = require('mongoose');
const idTransformPlugin = require('../plugins/idTransform');
const tenantScopePlugin = require('../plugins/tenantScope');

// Guardians are embedded plain objects here (not refs into Guardian) since
// an applicant isn't a real Student yet — real Guardian/StudentGuardian
// records only get created once the application is enrolled, reusing
// studentEnrollment.service.js's linkGuardians.
const admissionGuardianSchema = new mongoose.Schema({
  fullName: { type: String, default: null },
  phone: { type: String, default: null },
  email: { type: String, default: null },
  relationship: { type: String, default: null },
  contactPriority: { type: String, enum: ['primary', 'secondary'], default: 'primary' },
  occupation: { type: String, default: null },
  employer: { type: String, default: null },
  whatsappNumber: { type: String, default: null },
}, { _id: false });

const admissionSchema = new mongoose.Schema({
  schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', index: true },
  firstName: { type: String, required: true, maxlength: 80 },
  lastName: { type: String, required: true, maxlength: 80 },
  gender: { type: String, default: null },
  dateOfBirth: { type: String, default: null },
  address: { type: String, default: null },
  nationality: { type: String, default: 'Ghanaian', maxlength: 100 },
  religion: { type: String, default: null, maxlength: 100 },
  hometownRegion: { type: String, default: null, maxlength: 150 },
  primaryLanguage: { type: String, default: null, maxlength: 100 },
  desiredClassId: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', default: null },
  guardians: { type: [admissionGuardianSchema], default: [] },
  status: {
    type: String, required: true, enum: ['Applied', 'Approved', 'Rejected', 'Enrolled'], default: 'Applied',
  },
  rejectionReason: { type: String, default: null, maxlength: 500 },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  reviewedAt: { type: Date, default: null },
  enrolledStudentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', default: null },
}, { timestamps: true });

admissionSchema.virtual('desiredClass', { ref: 'Class', localField: 'desiredClassId', foreignField: '_id', justOne: true });
admissionSchema.virtual('enrolledStudent', { ref: 'Student', localField: 'enrolledStudentId', foreignField: '_id', justOne: true });

admissionSchema.plugin(idTransformPlugin);
admissionSchema.plugin(tenantScopePlugin);

module.exports = mongoose.model('Admission', admissionSchema);
