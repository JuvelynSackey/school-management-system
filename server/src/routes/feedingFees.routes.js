const express = require('express');
const controller = require('../controllers/feedingFees.controller');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');

const router = express.Router();

router.use(authenticate, authorize('admin'));

router.get('/daily', controller.getDaily);
router.post('/charge', controller.chargeDay);
router.get('/summary', controller.getSummary);

module.exports = router;
