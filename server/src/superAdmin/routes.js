const express = require('express');
const authController = require('./superAdminAuth.controller');
const schoolsController = require('./schools.controller');
const backupsController = require('./backups.controller');
const dashboardController = require('./dashboard.controller');
const platformUsersController = require('./platformUsers.controller');
const auditLogsController = require('./auditLogs.controller');
const securityController = require('./security.controller');
const settingsController = require('./settings.controller');
const authenticateSuperAdmin = require('./authenticateSuperAdmin');
const validate = require('../middleware/validate');
const { uploadLogo } = require('../middleware/upload');
const {
  superAdminLoginValidator, createSchoolValidator, updateSchoolValidator, createSchoolAdminValidator,
  updateBrandingValidator, setStatusValidator, createSuperAdminValidator, changeSuperAdminPasswordValidator,
  updatePlatformSettingsValidator,
} = require('./validators');

const router = express.Router();

router.post('/auth/login', superAdminLoginValidator, validate, authController.login);
router.get('/auth/me', authenticateSuperAdmin, authController.me);
router.put('/auth/password', authenticateSuperAdmin, changeSuperAdminPasswordValidator, validate, authController.changePassword);

router.get('/dashboard', authenticateSuperAdmin, dashboardController.get);

router.get('/schools', authenticateSuperAdmin, schoolsController.list);
router.post('/schools', authenticateSuperAdmin, createSchoolValidator, validate, schoolsController.create);
router.put('/schools/:id', authenticateSuperAdmin, updateSchoolValidator, validate, schoolsController.update);
router.post('/schools/:id/admin', authenticateSuperAdmin, createSchoolAdminValidator, validate, schoolsController.createAdmin);
router.post('/schools/:id/logo', authenticateSuperAdmin, uploadLogo, schoolsController.uploadLogo);
router.put('/schools/:id/branding', authenticateSuperAdmin, updateBrandingValidator, validate, schoolsController.updateBranding);

router.get('/backups', authenticateSuperAdmin, backupsController.list);
router.post('/backups/run', authenticateSuperAdmin, backupsController.trigger);
router.get('/backups/:timestamp/download', authenticateSuperAdmin, backupsController.download);
router.post('/backups/:timestamp/restore', authenticateSuperAdmin, backupsController.restore);

router.get('/school-admins', authenticateSuperAdmin, platformUsersController.listSchoolAdmins);
router.put('/school-admins/:id/status', authenticateSuperAdmin, setStatusValidator, validate, platformUsersController.setSchoolAdminStatus);
router.post('/school-admins/:id/reset-password', authenticateSuperAdmin, platformUsersController.resetSchoolAdminPassword);

router.get('/super-admins', authenticateSuperAdmin, platformUsersController.listSuperAdmins);
router.post('/super-admins', authenticateSuperAdmin, createSuperAdminValidator, validate, platformUsersController.createSuperAdmin);
router.put('/super-admins/:id/status', authenticateSuperAdmin, setStatusValidator, validate, platformUsersController.setSuperAdminStatus);

router.get('/audit-logs', authenticateSuperAdmin, auditLogsController.list);
router.get('/audit-logs/export', authenticateSuperAdmin, auditLogsController.exportLogs);
router.get('/security/failed-logins', authenticateSuperAdmin, securityController.failedLogins);

router.get('/settings', authenticateSuperAdmin, settingsController.get);
router.put('/settings', authenticateSuperAdmin, updatePlatformSettingsValidator, validate, settingsController.update);

module.exports = router;
