const express = require('express');
const controller = require('../controllers/attendance.controller');
const { getByClassDateValidator, recordBulkValidator } = require('../validators/attendance.validators');
const validate = require('../middleware/validate');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');

const router = express.Router();

router.use(authenticate);

router.get('/me', authorize('student'), controller.getMyAttendance);
router.get('/', authorize('admin', 'teacher'), getByClassDateValidator, validate, controller.getByClassDate);
router.post('/bulk', authorize('admin', 'teacher'), recordBulkValidator, validate, controller.recordBulk);
router.get('/student/:studentId', authorize('admin', 'teacher', 'student', 'parent'), controller.getForStudent);
router.get('/class/:classId/summary', authorize('admin', 'teacher'), controller.getClassSummary);

module.exports = router;
