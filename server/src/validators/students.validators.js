const { body, query } = require('express-validator');

const guardianArrayValidator = [
  body('guardians').optional().isArray({ max: 2 }).withMessage('At most 2 guardians (primary + secondary)'),
  body('guardians.*.phone').if(body('guardians').exists()).trim().notEmpty().withMessage('Guardian phone is required'),
  body('guardians.*.fullName').optional({ nullable: true }).trim(),
  body('guardians.*.email').optional({ nullable: true, checkFalsy: true }).isEmail(),
  body('guardians.*.relationship').optional({ nullable: true }).trim(),
  body('guardians.*.contactPriority').optional().isIn(['primary', 'secondary']),
  body('guardians.*.isPickupAuthorized').optional().isBoolean(),
  body('guardians.*.occupation').optional({ nullable: true }).trim().isLength({ max: 150 }),
  body('guardians.*.whatsappNumber').optional({ nullable: true }).trim().isLength({ max: 50 }),
];

const safetyNotesArrayValidator = [
  body('safetyNotes').optional().isArray(),
  body('safetyNotes.*.type').optional().isIn(['pickup', 'medical', 'other']),
  body('safetyNotes.*.note').if(body('safetyNotes').exists()).trim().notEmpty().withMessage('Safety note text is required'),
];

const createValidator = [
  // Optional -- students can be enrolled without one and log in by
  // admission number + PIN instead (see auth.controller.js).
  body('email').optional({ nullable: true, checkFalsy: true }).isEmail().withMessage('Must be a valid email if provided'),
  body('admissionNo').trim().notEmpty().withMessage('Admission number is required'),
  body('firstName').trim().notEmpty().withMessage('First name is required'),
  body('lastName').trim().notEmpty().withMessage('Last name is required'),
  body('gender').optional({ nullable: true }).trim(),
  body('dateOfBirth').optional({ nullable: true, checkFalsy: true }).isISO8601(),
  body('classId').optional({ nullable: true }).isMongoId(),
  body('address').optional({ nullable: true }).trim(),
  body('admissionDate').optional({ nullable: true, checkFalsy: true }).isISO8601(),
  body('category').optional({ nullable: true, checkFalsy: true }).isIn(['Day', 'Boarding']),
  body('programme').optional({ nullable: true }).trim().isLength({ max: 100 }),
  body('nationality').optional({ nullable: true, checkFalsy: true }).trim().isLength({ max: 100 }),
  body('religion').optional({ nullable: true, checkFalsy: true }).trim().isLength({ max: 100 }),
  body('hometownRegion').optional({ nullable: true, checkFalsy: true }).trim().isLength({ max: 150 }),
  body('primaryLanguage').optional({ nullable: true, checkFalsy: true }).trim().isLength({ max: 100 }),
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
  body('address').optional({ nullable: true }).trim(),
  body('admissionDate').optional({ nullable: true, checkFalsy: true }).isISO8601(),
  body('category').optional({ nullable: true, checkFalsy: true }).isIn(['Day', 'Boarding']),
  body('programme').optional({ nullable: true }).trim().isLength({ max: 100 }),
  body('nationality').optional({ nullable: true, checkFalsy: true }).trim().isLength({ max: 100 }),
  body('religion').optional({ nullable: true, checkFalsy: true }).trim().isLength({ max: 100 }),
  body('hometownRegion').optional({ nullable: true, checkFalsy: true }).trim().isLength({ max: 150 }),
  body('primaryLanguage').optional({ nullable: true, checkFalsy: true }).trim().isLength({ max: 100 }),
  body('status').optional().isIn(['active', 'inactive', 'archived', 'transferred', 'withdrawn', 'graduated']),
  body('waecIndexNumber').optional({ nullable: true, checkFalsy: true }).trim().isLength({ max: 20 }),
  ...guardianArrayValidator,
  ...safetyNotesArrayValidator,
];

const idCardsValidator = [
  query('classId').isMongoId(),
];

const waecExportValidator = [
  query('classId').isMongoId(),
];

const promoteValidator = [
  body('sourceClassId').isMongoId().withMessage('sourceClassId is required'),
  body('destinationClassId').optional({ nullable: true }).isMongoId(),
  body('promotions').isArray({ min: 1 }).withMessage('At least one student promotion decision is required'),
  body('promotions.*.studentId').isMongoId(),
  body('promotions.*.action').isIn(['promote', 'repeat', 'graduate']),
];

module.exports = {
  createValidator, updateValidator, idCardsValidator, waecExportValidator, promoteValidator,
};
