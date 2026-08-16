const express = require('express');
const controller = require('../controllers/guardians.controller');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');

const router = express.Router();

router.use(authenticate, authorize('admin'));

router.get('/', controller.lookupByPhone);
router.get('/:id', controller.getById);

module.exports = router;
