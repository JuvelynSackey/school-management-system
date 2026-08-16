const express = require('express');
const controller = require('../controllers/houses.controller');
const { houseValidator } = require('../validators/houses.validators');
const validate = require('../middleware/validate');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');

const router = express.Router();

router.use(authenticate);

router.get('/', controller.list);
router.post('/', authorize('admin'), houseValidator, validate, controller.create);
router.put('/:id', authorize('admin'), houseValidator, validate, controller.update);
router.delete('/:id', authorize('admin'), controller.remove);

module.exports = router;
