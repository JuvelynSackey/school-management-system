const express = require('express');
const controller = require('../controllers/guardians.controller');
const { createLoginValidator } = require('../validators/guardians.validators');
const validate = require('../middleware/validate');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');

const router = express.Router();

router.use(authenticate, authorize('admin'));

router.get('/', controller.lookupByPhone);
router.get('/:id', controller.getById);
router.post('/:id/login', createLoginValidator, validate, controller.createLogin);

module.exports = router;
