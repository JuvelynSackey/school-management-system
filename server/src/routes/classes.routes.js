const express = require('express');
const controller = require('../controllers/classes.controller');
const { classValidator } = require('../validators/classes.validators');
const validate = require('../middleware/validate');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');

const router = express.Router();

router.use(authenticate);

router.get('/', controller.list);
router.get('/:id', controller.getById);
router.post('/', authorize('admin'), classValidator, validate, controller.create);
router.put('/:id', authorize('admin'), classValidator, validate, controller.update);
router.delete('/:id', authorize('admin'), controller.remove);

module.exports = router;
