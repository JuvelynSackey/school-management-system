const express = require('express');
const controller = require('../controllers/analytics.controller');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');

const router = express.Router();

router.use(authenticate, authorize('admin'));

router.get('/academic', controller.getAcademic);
router.get('/financial', controller.getFinancial);
router.get('/data-quality', controller.getDataQuality);
router.get('/bece-readiness', controller.getBeceReadiness);

module.exports = router;
