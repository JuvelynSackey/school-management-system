const express = require('express');
const controller = require('../controllers/earlyWarning.controller');
const { getAtRiskStudentsValidator } = require('../validators/earlyWarning.validators');
const validate = require('../middleware/validate');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');

const router = express.Router();

router.use(authenticate, authorize('admin', 'teacher'));

router.get('/at-risk-students', getAtRiskStudentsValidator, validate, controller.getAtRiskStudents);

module.exports = router;
