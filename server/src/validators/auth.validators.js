const { body } = require('express-validator');
const { passwordLengthValidator } = require('./passwordPolicy');

const loginValidator = [
  body('schoolCode').trim().notEmpty().withMessage('School code is required'),
  body('identifier').trim().notEmpty().withMessage('Email or phone is required'),
  body('password').notEmpty().withMessage('Password is required'),
];

const forgotPasswordValidator = [
  body('schoolCode').trim().notEmpty().withMessage('School code is required'),
  body('identifier').trim().notEmpty().withMessage('Email or phone is required'),
];

const resetPasswordValidator = [
  body('schoolCode').trim().notEmpty().withMessage('School code is required'),
  body('token').trim().notEmpty().withMessage('Reset token is required'),
  passwordLengthValidator('newPassword'),
];

const verifyEmailValidator = [
  body('schoolCode').trim().notEmpty().withMessage('School code is required'),
  body('token').trim().notEmpty().withMessage('Verification token is required'),
];

module.exports = {
  loginValidator, forgotPasswordValidator, resetPasswordValidator, verifyEmailValidator,
};
