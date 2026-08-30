const { body } = require('express-validator');
const { PlatformSettings } = require('../models');

// Both optional -- omit entirely (the default) for phone + auto-generated
// PIN using the guardian's phone already on file. Passing email gates a
// length check (mirrors passwordPolicy.js's passwordLengthValidator, just
// inlined here since .if() has to precede .custom() in the chain, which
// rules out appending it to that helper's already-built chain), only
// applied when email is actually present.
const createLoginValidator = [
  body('email').optional({ nullable: true, checkFalsy: true }).isEmail().withMessage('Must be a valid email if provided'),
  body('password').if(body('email').exists({ checkFalsy: true })).custom(async (value) => {
    const settings = await PlatformSettings.findOne({});
    const minLength = settings?.minPasswordLength || 8;
    if (!value || value.length < minLength) {
      throw new Error(`Password must be at least ${minLength} characters`);
    }
    return true;
  }),
];

module.exports = { createLoginValidator };
