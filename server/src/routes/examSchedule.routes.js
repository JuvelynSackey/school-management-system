const express = require('express');
const controller = require('../controllers/examSchedule.controller');
const { createValidator, updateValidator, listValidator } = require('../validators/examSchedule.validators');
const validate = require('../middleware/validate');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');

const router = express.Router();

router.use(authenticate);

router.get('/', authorize('admin', 'teacher', 'student', 'parent'), listValidator, validate, controller.list);
router.post('/', authorize('admin'), createValidator, validate, controller.create);
router.put('/:id', authorize('admin'), updateValidator, validate, controller.update);
router.delete('/:id', authorize('admin'), controller.remove);

module.exports = router;
