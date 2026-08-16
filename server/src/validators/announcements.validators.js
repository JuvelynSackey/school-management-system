const { body, query } = require('express-validator');

const createValidator = [
  body('message').trim().notEmpty().withMessage('Message is required').isLength({ max: 1000 }),
  body('targetType').isIn(['school', 'class', 'student']).withMessage('targetType must be school, class, or student'),
  body('targetClassId').optional({ nullable: true }).isMongoId(),
  body('targetStudentId').optional({ nullable: true }).isMongoId(),
  body('category').optional().isIn(['general', 'fee_reminder']),
];

const listValidator = [
  query('category').optional().isIn(['general', 'fee_reminder']),
];

module.exports = { createValidator, listValidator };
