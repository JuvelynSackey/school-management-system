const express = require('express');
const controller = require('../controllers/gradingScheme.controller');
const { updateValidator } = require('../validators/gradingScheme.validators');
const validate = require('../middleware/validate');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');

const router = express.Router();

router.use(authenticate);

router.get('/', authorize('admin', 'teacher'), controller.get);
router.put('/', authorize('admin'), updateValidator, validate, controller.update);

module.exports = router;
