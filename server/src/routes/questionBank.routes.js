const express = require('express');
const controller = require('../controllers/questionBank.controller');
const { questionValidator } = require('../validators/questionBank.validators');
const validate = require('../middleware/validate');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');

const router = express.Router();

router.use(authenticate, authorize('admin', 'teacher'));

router.get('/', controller.list);
router.get('/:id', controller.getById);
router.post('/', questionValidator, validate, controller.create);
router.put('/:id', questionValidator, validate, controller.update);
router.delete('/:id', controller.remove);

module.exports = router;
