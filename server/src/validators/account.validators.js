const { body } = require('express-validator');
const { passwordLengthValidator } = require('./passwordPolicy');

const updateMeValidator = [
  body('fullName').optional().trim().notEmpty().withMessage('Full name cannot be empty'),
  body('phone').optional({ nullable: true, checkFalsy: true }).trim(),
];

const changePasswordValidator = [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  passwordLengthValidator('newPassword'),
];

module.exports = { updateMeValidator, changePasswordValidator };
