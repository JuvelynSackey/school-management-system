const express = require('express');
const controller = require('../controllers/guardians.controller');
const { createLoginValidator } = require('../validators/guardians.validators');
const validate = require('../middleware/validate');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');

const router = express.Router();

router.use(authenticate);

router.get('/list', authorize('admin', 'teacher'), controller.list);
router.get('/', authorize('admin'), controller.lookupByPhone);
router.get('/:id', authorize('admin'), controller.getById);
router.post('/:id/login', authorize('admin'), createLoginValidator, validate, controller.createLogin);

module.exports = router;
