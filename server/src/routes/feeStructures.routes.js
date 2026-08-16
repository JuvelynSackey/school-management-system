const express = require('express');
const controller = require('../controllers/feeStructures.controller');
const { structureValidator, applyValidator } = require('../validators/feeStructures.validators');
const validate = require('../middleware/validate');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');

const router = express.Router();

router.use(authenticate, authorize('admin'));

router.get('/', controller.list);
router.post('/', structureValidator, validate, controller.create);
router.put('/:id', structureValidator, validate, controller.update);
router.delete('/:id', controller.remove);
router.post('/:id/apply', applyValidator, validate, controller.apply);

module.exports = router;
