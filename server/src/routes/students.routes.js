const express = require('express');
const controller = require('../controllers/students.controller');
const { createValidator, updateValidator } = require('../validators/students.validators');
const validate = require('../middleware/validate');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');

const router = express.Router();

router.use(authenticate);

router.get('/me', authorize('student'), controller.getMe);
router.get('/', authorize('admin', 'teacher'), controller.list);
router.get('/:id', authorize('admin', 'teacher', 'student'), controller.getById);
router.post('/', authorize('admin'), createValidator, validate, controller.create);
router.put('/:id', authorize('admin'), updateValidator, validate, controller.update);
router.delete('/:id', authorize('admin'), controller.remove);

module.exports = router;
