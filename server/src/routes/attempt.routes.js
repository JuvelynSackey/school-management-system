const express = require('express');
const controller = require('../controllers/attempt.controller');
const { answerValidator, gradeValidator } = require('../validators/attempt.validators');
const validate = require('../middleware/validate');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');

const router = express.Router();

router.use(authenticate);

router.put('/:id/answer', authorize('student'), answerValidator, validate, controller.saveAnswer);
router.post('/:id/submit', authorize('student'), controller.submit);
router.post('/:id/grade', authorize('admin', 'teacher'), gradeValidator, validate, controller.gradeManualAnswers);
router.post('/:id/release', authorize('admin', 'teacher'), controller.release);

module.exports = router;
