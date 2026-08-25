const express = require('express');
const controller = require('../controllers/intelligence.controller');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');

const router = express.Router();

router.use(authenticate, authorize('admin'));

router.get('/summary', controller.getSummary);

module.exports = router;
