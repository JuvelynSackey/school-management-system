const { body } = require('express-validator');
const { passwordLengthValidator } = require('./passwordPolicy');

const createLoginValidator = [
  body('email').isEmail().withMessage('A valid email is required'),
  passwordLengthValidator('password'),
];

module.exports = { createLoginValidator };
