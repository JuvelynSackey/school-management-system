const { body } = require('express-validator');

const updateValidator = [
  body('name').optional({ nullable: true }).trim().isLength({ max: 150 }),
  body('motto').optional({ nullable: true }).trim().isLength({ max: 150 }),
  body('address').optional({ nullable: true }).trim().isLength({ max: 255 }),
  body('phone').optional({ nullable: true }).trim().isLength({ max: 50 }),
  body('email').optional({ nullable: true, checkFalsy: true }).trim().isEmail().withMessage('Must be a valid email'),
  body('headteacherName').optional({ nullable: true }).trim().isLength({ max: 150 }),
];

module.exports = { updateValidator };
