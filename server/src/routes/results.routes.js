const express = require('express');
const controller = require('../controllers/results.controller');
const {
  getRosterValidator, getAnomaliesValidator, getInsightsValidator, recordBulkValidator, amendValidator, reportConflictValidator,
} = require('../validators/results.validators');
const validate = require('../middleware/validate');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');

const router = express.Router();

router.use(authenticate);

router.get('/me', authorize('student'), controller.getMyResults);
router.get('/roster', authorize('admin', 'teacher'), getRosterValidator, validate, controller.getRoster);
router.get('/anomalies', authorize('admin', 'teacher'), getAnomaliesValidator, validate, controller.getAnomalies);
router.post('/bulk', authorize('admin', 'teacher'), recordBulkValidator, validate, controller.recordBulk);
router.post('/:id/amend', authorize('admin'), amendValidator, validate, controller.amendResult);
router.post('/report-conflict', authorize('admin', 'teacher'), reportConflictValidator, validate, controller.reportConflict);
router.get('/student/:studentId', authorize('admin', 'teacher', 'student', 'parent'), controller.getForStudent);
router.get('/insights/:studentId', authorize('admin', 'teacher', 'student', 'parent'), getInsightsValidator, validate, controller.getInsights);

module.exports = router;
