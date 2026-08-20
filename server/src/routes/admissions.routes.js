const express = require('express');
const controller = require('../controllers/admissions.controller');
const {
  createValidator, updateValidator, rejectValidator, enrollValidator,
} = require('../validators/admissions.validators');
const validate = require('../middleware/validate');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');

const router = express.Router();

router.use(authenticate, authorize('admin'));

router.get('/', controller.list);
router.get('/next-admission-no', controller.nextAdmissionNo);
router.post('/', createValidator, validate, controller.create);
router.put('/:id', updateValidator, validate, controller.update);
router.post('/:id/approve', controller.approve);
router.post('/:id/reject', rejectValidator, validate, controller.reject);
router.post('/:id/enroll', enrollValidator, validate, controller.enroll);
router.delete('/:id', controller.remove);

module.exports = router;
