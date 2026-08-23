const express = require('express');
const controller = require('../controllers/schoolSettings.controller');
const { updateValidator } = require('../validators/schoolSettings.validators');
const validate = require('../middleware/validate');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const { uploadLogo, uploadSignature } = require('../middleware/upload');

const router = express.Router();

router.use(authenticate);

router.get('/', controller.get);
router.put('/', authorize('admin'), updateValidator, validate, controller.update);
router.post('/logo', authorize('admin'), uploadLogo, controller.uploadLogo);
router.post('/signature', authorize('admin'), uploadSignature, controller.uploadSignature);

module.exports = router;
