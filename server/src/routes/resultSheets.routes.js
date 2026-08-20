const express = require('express');
const controller = require('../controllers/resultSheets.controller');
const {
  listValidator, rejectValidator, submitAllValidator, matrixValidator,
} = require('../validators/resultSheets.validators');
const validate = require('../middleware/validate');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');

const router = express.Router();

router.use(authenticate, authorize('admin', 'teacher'));

router.get('/', listValidator, validate, controller.list);
router.get('/matrix', authorize('admin'), matrixValidator, validate, controller.getMatrix);
router.post('/submit-all', submitAllValidator, validate, controller.submitAll);
router.post('/:id/submit', controller.submit);
router.post('/:id/approve', authorize('admin'), controller.approve);
router.post('/:id/reject', authorize('admin'), rejectValidator, validate, controller.reject);
router.post('/:id/reopen', authorize('admin'), controller.reopen);

module.exports = router;
