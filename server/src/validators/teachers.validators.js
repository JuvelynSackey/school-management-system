const { body } = require('express-validator');

const createValidator = [
  body('email').isEmail().withMessage('A valid email is required'),
  body('staffNo').trim().notEmpty().withMessage('Staff number is required'),
  body('firstName').trim().notEmpty().withMessage('First name is required'),
  body('lastName').trim().notEmpty().withMessage('Last name is required'),
  body('gender').optional({ nullable: true }).trim(),
  body('phone').optional({ nullable: true }).trim(),
  body('hireDate').optional({ nullable: true, checkFalsy: true }).isISO8601(),
  body('qualification').optional({ nullable: true }).trim(),
];

const updateValidator = [
  body('staffNo').optional().trim().notEmpty(),
  body('firstName').optional().trim().notEmpty(),
  body('lastName').optional().trim().notEmpty(),
  body('gender').optional({ nullable: true }).trim(),
  body('phone').optional({ nullable: true }).trim(),
  body('hireDate').optional({ nullable: true, checkFalsy: true }).isISO8601(),
  body('qualification').optional({ nullable: true }).trim(),
  body('status').optional().isIn(['active', 'inactive']),
];

module.exports = { createValidator, updateValidator };
