const { body } = require('express-validator');

const guardianArrayValidator = [
  body('guardians').optional().isArray({ max: 2 }).withMessage('At most 2 guardians (primary + secondary)'),
  body('guardians.*.phone').if(body('guardians').exists()).trim().notEmpty().withMessage('Guardian phone is required'),
  body('guardians.*.fullName').optional({ nullable: true }).trim(),
  body('guardians.*.email').optional({ nullable: true, checkFalsy: true }).isEmail(),
  body('guardians.*.relationship').optional({ nullable: true }).trim(),
  body('guardians.*.contactPriority').optional().isIn(['primary', 'secondary']),
  body('guardians.*.occupation').optional({ nullable: true }).trim().isLength({ max: 150 }),
  body('guardians.*.whatsappNumber').optional({ nullable: true }).trim().isLength({ max: 50 }),
];

const demographicsValidator = [
  body('nationality').optional({ nullable: true, checkFalsy: true }).trim().isLength({ max: 100 }),
  body('religion').optional({ nullable: true, checkFalsy: true }).trim().isLength({ max: 100 }),
  body('hometownRegion').optional({ nullable: true, checkFalsy: true }).trim().isLength({ max: 150 }),
  body('primaryLanguage').optional({ nullable: true, checkFalsy: true }).trim().isLength({ max: 100 }),
];

const createValidator = [
  body('firstName').trim().notEmpty().withMessage('First name is required'),
  body('lastName').trim().notEmpty().withMessage('Last name is required'),
  body('gender').optional({ nullable: true }).trim(),
  body('dateOfBirth').optional({ nullable: true, checkFalsy: true }).isISO8601(),
  body('address').optional({ nullable: true }).trim(),
  body('desiredClassId').optional({ nullable: true }).isMongoId(),
  ...demographicsValidator,
  ...guardianArrayValidator,
];

const updateValidator = [
  body('firstName').optional().trim().notEmpty(),
  body('lastName').optional().trim().notEmpty(),
  body('gender').optional({ nullable: true }).trim(),
  body('dateOfBirth').optional({ nullable: true, checkFalsy: true }).isISO8601(),
  body('address').optional({ nullable: true }).trim(),
  body('desiredClassId').optional({ nullable: true }).isMongoId(),
  ...demographicsValidator,
  ...guardianArrayValidator,
];

const rejectValidator = [
  body('rejectionReason').trim().notEmpty().withMessage('A rejection reason is required'),
];

const enrollValidator = [
  body('email').optional({ nullable: true, checkFalsy: true }).isEmail().withMessage('Must be a valid email if provided'),
  body('admissionNo').trim().notEmpty().withMessage('Admission number is required'),
  body('classId').optional({ nullable: true }).isMongoId(),
  body('admissionDate').optional({ nullable: true, checkFalsy: true }).isISO8601(),
];

module.exports = {
  createValidator, updateValidator, rejectValidator, enrollValidator,
};
