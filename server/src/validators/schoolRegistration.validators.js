const { body } = require('express-validator');
const { passwordLengthValidator } = require('./passwordPolicy');

const registerSchoolValidator = [
  body('schoolName').trim().notEmpty().withMessage('School name is required'),
  body('slug').trim().matches(/^[a-z0-9-]+$/).withMessage('Login code must be lowercase letters, numbers, and hyphens only'),
  body('adminFullName').trim().notEmpty().withMessage('Admin full name is required'),
  body('adminEmail').isEmail().withMessage('A valid admin email is required'),
  body('adminPhone').optional({ nullable: true, checkFalsy: true }).trim(),
  body('schoolType').optional({ nullable: true, checkFalsy: true }).isIn(['private_basic', 'public_basic', 'tvet', 'other']).withMessage('Invalid school type'),
  passwordLengthValidator('password'),
];

module.exports = { registerSchoolValidator };
