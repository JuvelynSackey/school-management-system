const express = require('express');
const controller = require('../controllers/terms.controller');
const { termValidator } = require('../validators/terms.validators');
const validate = require('../middleware/validate');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');

const router = express.Router();

router.use(authenticate);

router.get('/', controller.list);
router.post('/', authorize('admin'), termValidator, validate, controller.create);
router.put('/:id', authorize('admin'), termValidator, validate, controller.update);
router.delete('/:id', authorize('admin'), controller.remove);

module.exports = router;
