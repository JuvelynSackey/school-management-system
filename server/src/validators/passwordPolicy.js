const { body } = require('express-validator');
const { PlatformSettings } = require('../models');

// A single source of truth for "how long must a password be" — reads the
// Super-Admin-configurable PlatformSettings.minPasswordLength at request
// time instead of each call site hardcoding its own number.
const passwordLengthValidator = (field) => body(field).custom(async (value) => {
  const settings = await PlatformSettings.findOne({});
  const minLength = settings?.minPasswordLength || 8;
  if (!value || value.length < minLength) {
    throw new Error(`Password must be at least ${minLength} characters`);
  }
  return true;
});

module.exports = { passwordLengthValidator };
