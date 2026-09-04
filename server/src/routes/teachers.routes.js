const express = require('express');
const controller = require('../controllers/teachers.controller');
const { createValidator, updateValidator } = require('../validators/teachers.validators');
const validate = require('../middleware/validate');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const { uploadSignature } = require('../middleware/upload');

const router = express.Router();

router.use(authenticate);

router.get('/', controller.list);
router.post('/me/signature', authorize('teacher'), uploadSignature, controller.uploadMySignature);
router.get('/:id', controller.getById);
router.post('/', authorize('admin'), createValidator, validate, controller.create);
router.put('/:id', authorize('admin'), updateValidator, validate, controller.update);
router.delete('/:id', authorize('admin'), controller.remove);

module.exports = router;
