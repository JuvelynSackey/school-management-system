const { Guardian, StudentGuardian } = require('../models');
const asyncHandler = require('../middleware/asyncHandler');
const AppError = require('../utils/AppError');

// Guardian<->Student is many-to-many via StudentGuardian; fetch the linked
// students manually since Mongoose has no belongsToMany populate.
const withStudents = async (guardian) => {
  const links = await StudentGuardian.find({ guardianId: guardian.id }).populate('student', 'firstName lastName admissionNo');
  const data = guardian.toJSON();
  data.students = links.map((l) => l.student).filter(Boolean);
  return data;
};

// GET /guardians?phone=  -> lookup for the enrolment form's "auto-link siblings" flow
const lookupByPhone = asyncHandler(async (req, res, next) => {
  const { phone } = req.query;
  if (!phone) return next(new AppError('phone is required', 400));

  const guardian = await Guardian.findOne({ phone });
  if (!guardian) return res.json({ success: true, data: null });
  res.json({ success: true, data: await withStudents(guardian) });
});

const getById = asyncHandler(async (req, res, next) => {
  const guardian = await Guardian.findById(req.params.id);
  if (!guardian) return next(new AppError('Guardian not found', 404));
  res.json({ success: true, data: await withStudents(guardian) });
});

module.exports = { lookupByPhone, getById };
