const express = require('express');
const controller = require('../controllers/results.controller');
const { getRosterValidator, recordBulkValidator } = require('../validators/results.validators');
const validate = require('../middleware/validate');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');

const router = express.Router();

router.use(authenticate);

router.get('/me', authorize('student'), controller.getMyResults);
router.get('/roster', authorize('admin', 'teacher'), getRosterValidator, validate, controller.getRoster);
router.post('/bulk', authorize('admin', 'teacher'), recordBulkValidator, validate, controller.recordBulk);
router.get('/student/:studentId', authorize('admin', 'teacher', 'student'), controller.getForStudent);

module.exports = router;
