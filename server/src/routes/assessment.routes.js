const express = require('express');
const controller = require('../controllers/assessment.controller');
const attemptController = require('../controllers/attempt.controller');
const { assessmentValidator } = require('../validators/assessment.validators');
const validate = require('../middleware/validate');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');

const router = express.Router();

router.use(authenticate);

router.get('/', authorize('admin', 'teacher'), controller.list);
router.post('/', authorize('admin', 'teacher'), assessmentValidator, validate, controller.create);

// Same path depth as '/:id' below -- must be declared first, or Express
// would match this literal segment as an :id value instead.
router.get('/published-for-me', authorize('student'), controller.listPublishedForMe);

// Student-facing attempt routes, nested under the assessment they belong
// to. Different path shape (2 segments, distinct literal second segment)
// from the admin/teacher '/:id' routes below, so there's no ordering
// ambiguity between them.
router.post('/:assessmentId/attempts', authorize('student'), attemptController.startAttempt);
router.get('/:assessmentId/my-attempt', authorize('student'), attemptController.getMyAttempt);
router.get('/:id/attempts', authorize('admin', 'teacher'), attemptController.listForAssessment);

router.get('/:id', authorize('admin', 'teacher'), controller.getById);
router.put('/:id', authorize('admin', 'teacher'), assessmentValidator, validate, controller.update);
router.delete('/:id', authorize('admin', 'teacher'), controller.remove);

module.exports = router;
