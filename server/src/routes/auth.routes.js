const express = require('express');
const rateLimit = require('express-rate-limit');
const authController = require('../controllers/auth.controller');
const accountController = require('../controllers/account.controller');
const {
  loginValidator, forgotPasswordValidator, resetPasswordValidator, verifyEmailValidator,
} = require('../validators/auth.validators');
const { updateMeValidator, changePasswordValidator } = require('../validators/account.validators');
const validate = require('../middleware/validate');
const authenticate = require('../middleware/authenticate');

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many login attempts. Please try again later.' },
});

const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many password reset requests. Please try again later.' },
});

router.post('/login', loginLimiter, loginValidator, validate, authController.login);
router.post('/forgot-password', forgotPasswordLimiter, forgotPasswordValidator, validate, authController.forgotPassword);
router.post('/reset-password', resetPasswordValidator, validate, authController.resetPassword);
router.post('/verify-email', verifyEmailValidator, validate, authController.verifyEmail);
router.get('/me', authenticate, authController.me);
router.put('/me', authenticate, updateMeValidator, validate, accountController.updateMe);
router.post('/change-password', authenticate, changePasswordValidator, validate, accountController.changePassword);

module.exports = router;
