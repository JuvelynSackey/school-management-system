const express = require('express');
const controller = require('../controllers/assignments.controller');
const { createValidator } = require('../validators/assignments.validators');
const validate = require('../middleware/validate');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');

const router = express.Router();

router.use(authenticate, authorize('admin'));

router.get('/class/:classId', controller.listByClass);
router.post('/', createValidator, validate, controller.create);
router.delete('/:id', controller.remove);

module.exports = router;
