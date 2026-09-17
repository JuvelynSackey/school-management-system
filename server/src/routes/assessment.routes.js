const express = require('express');
const controller = require('../controllers/assessment.controller');
const { assessmentValidator } = require('../validators/assessment.validators');
const validate = require('../middleware/validate');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');

const router = express.Router();

router.use(authenticate, authorize('admin', 'teacher'));

router.get('/', controller.list);
router.get('/:id', controller.getById);
router.post('/', assessmentValidator, validate, controller.create);
router.put('/:id', assessmentValidator, validate, controller.update);
router.delete('/:id', controller.remove);

module.exports = router;
