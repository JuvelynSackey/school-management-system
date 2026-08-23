const { body } = require('express-validator');
const { passwordLengthValidator } = require('../validators/passwordPolicy');

const superAdminLoginValidator = [
  body('email').isEmail().withMessage('A valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
];

const createSchoolValidator = [
  body('name').trim().notEmpty().withMessage('School name is required'),
  body('slug').trim().matches(/^[a-z0-9-]+$/).withMessage('Slug must be lowercase letters, numbers, and hyphens only'),
  body('curriculumTemplate').optional().isIn(['full_basic', 'primary_only', 'jhs_only', 'blank']).withMessage('Invalid curriculum template'),
];

const updateSchoolValidator = [
  body('name').optional().trim().notEmpty().withMessage('School name cannot be empty'),
  // 'pending' deliberately excluded — that state only comes from
  // self-registration, never from a super-admin edit.
  body('status').optional().isIn(['active', 'suspended', 'rejected']).withMessage('Status must be active, suspended, or rejected'),
];

const createSchoolAdminValidator = [
  body('email').isEmail().withMessage('A valid email is required'),
  body('fullName').trim().notEmpty().withMessage('Full name is required'),
];

const updateBrandingValidator = [
  body('motto').optional({ nullable: true }).trim().isLength({ max: 150 }),
  body('primaryColor').optional({ nullable: true, checkFalsy: true }).matches(/^#[0-9a-fA-F]{6}$/).withMessage('Must be a hex color like #322c7c'),
  body('secondaryColor').optional({ nullable: true, checkFalsy: true }).matches(/^#[0-9a-fA-F]{6}$/).withMessage('Must be a hex color like #f5c344'),
];

const setStatusValidator = [
  body('status').isIn(['active', 'inactive']).withMessage('Status must be active or inactive'),
];

const createSuperAdminValidator = [
  body('email').isEmail().withMessage('A valid email is required'),
  body('fullName').trim().notEmpty().withMessage('Full name is required'),
  passwordLengthValidator('password'),
];

const changeSuperAdminPasswordValidator = [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  passwordLengthValidator('newPassword'),
];

const updatePlatformSettingsValidator = [
  body('maintenanceMode.enabled').optional().isBoolean().withMessage('maintenanceMode.enabled must be a boolean'),
  body('maintenanceMode.message').optional().trim().notEmpty().withMessage('Maintenance message cannot be empty'),
  body('minPasswordLength').optional().isInt({ min: 6, max: 32 }).withMessage('Minimum password length must be between 6 and 32'),
];

module.exports = {
  superAdminLoginValidator,
  createSchoolValidator,
  updateSchoolValidator,
  createSchoolAdminValidator,
  updateBrandingValidator,
  setStatusValidator,
  createSuperAdminValidator,
  changeSuperAdminPasswordValidator,
  updatePlatformSettingsValidator,
};
