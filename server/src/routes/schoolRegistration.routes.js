const express = require('express');
const rateLimit = require('express-rate-limit');
const registrationController = require('../controllers/schoolRegistration.controller');
const { registerSchoolValidator } = require('../validators/schoolRegistration.validators');
const validate = require('../middleware/validate');

const router = express.Router();

// Public, unauthenticated, and writes a School + User in one call — tightly
// rate limited for the same reason auth.routes.js's forgotPasswordLimiter is.
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many registration attempts. Please try again later.' },
});

router.post('/register', registerLimiter, registerSchoolValidator, validate, registrationController.register);

module.exports = router;
