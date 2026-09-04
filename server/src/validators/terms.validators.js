const { body } = require('express-validator');

const termValidator = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('academicYear').trim().notEmpty().withMessage('Academic year is required'),
  body('termNumber').isInt({ min: 1, max: 3 }).withMessage('Term number must be 1, 2, or 3'),
  body('startDate').optional({ nullable: true, checkFalsy: true }).isISO8601().withMessage('Start date must be a valid date'),
  body('endDate').optional({ nullable: true, checkFalsy: true }).isISO8601().withMessage('End date must be a valid date'),
  body('nextTermBegins').optional({ nullable: true, checkFalsy: true }).isISO8601().withMessage('Next term begins must be a valid date'),
  body('isCurrent').optional().isBoolean(),
];

module.exports = { termValidator };
