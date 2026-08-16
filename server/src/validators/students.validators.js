const { body } = require('express-validator');

const guardianArrayValidator = [
  body('guardians').optional().isArray({ max: 2 }).withMessage('At most 2 guardians (primary + secondary)'),
  body('guardians.*.phone').if(body('guardians').exists()).trim().notEmpty().withMessage('Guardian phone is required'),
  body('guardians.*.fullName').optional({ nullable: true }).trim(),
  body('guardians.*.email').optional({ nullable: true, checkFalsy: true }).isEmail(),
  body('guardians.*.relationship').optional({ nullable: true }).trim(),
  body('guardians.*.contactPriority').optional().isIn(['primary', 'secondary']),
  body('guardians.*.isPickupAuthorized').optional().isBoolean(),
];

const safetyNotesArrayValidator = [
  body('safetyNotes').optional().isArray(),
  body('safetyNotes.*.type').optional().isIn(['pickup', 'medical', 'other']),
  body('safetyNotes.*.note').if(body('safetyNotes').exists()).trim().notEmpty().withMessage('Safety note text is required'),
];

const createValidator = [
  body('email').isEmail().withMessage('A valid email is required'),
  body('admissionNo').trim().notEmpty().withMessage('Admission number is required'),
  body('firstName').trim().notEmpty().withMessage('First name is required'),
  body('lastName').trim().notEmpty().withMessage('Last name is required'),
  body('gender').optional({ nullable: true }).trim(),
  body('dateOfBirth').optional({ nullable: true, checkFalsy: true }).isISO8601(),
  body('classId').optional({ nullable: true }).isMongoId(),
  body('houseId').optional({ nullable: true }).isMongoId(),
  body('address').optional({ nullable: true }).trim(),
  body('admissionDate').optional({ nullable: true, checkFalsy: true }).isISO8601(),
  ...guardianArrayValidator,
  ...safetyNotesArrayValidator,
];

const updateValidator = [
  body('admissionNo').optional().trim().notEmpty(),
  body('firstName').optional().trim().notEmpty(),
  body('lastName').optional().trim().notEmpty(),
  body('gender').optional({ nullable: true }).trim(),
  body('dateOfBirth').optional({ nullable: true, checkFalsy: true }).isISO8601(),
  body('classId').optional({ nullable: true }).isMongoId(),
  body('houseId').optional({ nullable: true }).isMongoId(),
  body('address').optional({ nullable: true }).trim(),
  body('admissionDate').optional({ nullable: true, checkFalsy: true }).isISO8601(),
  body('status').optional().isIn(['active', 'inactive', 'archived']),
  ...guardianArrayValidator,
  ...safetyNotesArrayValidator,
];

module.exports = { createValidator, updateValidator };
