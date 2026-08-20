const { body } = require('express-validator');

const createValidator = [
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 100 }),
  body('order').optional().isInt(),
];

const updateValidator = [
  body('name').optional().trim().notEmpty().isLength({ max: 100 }),
  body('order').optional().isInt(),
  body('isActive').optional().isBoolean(),
];

module.exports = { createValidator, updateValidator };
