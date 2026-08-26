const { body, query } = require('express-validator');

const TARGET_TYPES = [
  'school', 'class', 'student', 'all_teachers', 'all_parents',
  'specific_teachers', 'specific_students', 'specific_parents', 'specific_classes',
];

const createValidator = [
  body('message').trim().notEmpty().withMessage('Message is required').isLength({ max: 1000 }),
  body('targetType').isIn(TARGET_TYPES).withMessage(`targetType must be one of: ${TARGET_TYPES.join(', ')}`),
  body('targetClassId').optional({ nullable: true }).isMongoId(),
  body('targetStudentId').optional({ nullable: true }).isMongoId(),
  body('targetClassIds').optional().isArray(),
  body('targetClassIds.*').optional().isMongoId(),
  body('targetTeacherIds').optional().isArray(),
  body('targetTeacherIds.*').optional().isMongoId(),
  body('targetStudentIds').optional().isArray(),
  body('targetStudentIds.*').optional().isMongoId(),
  body('targetGuardianIds').optional().isArray(),
  body('targetGuardianIds.*').optional().isMongoId(),
  body('category').optional().isIn(['general', 'fee_reminder']),
  body('scheduledFor').optional({ nullable: true, checkFalsy: true }).isISO8601().withMessage('scheduledFor must be a valid date/time'),
];

const listValidator = [
  query('category').optional().isIn(['general', 'fee_reminder']),
];

module.exports = { createValidator, listValidator };
