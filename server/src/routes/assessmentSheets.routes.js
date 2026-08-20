const express = require('express');
const controller = require('../controllers/assessmentSheets.controller');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');

const router = express.Router();

router.use(authenticate, authorize('admin', 'teacher'));

router.get('/subjects', controller.listSubjectsForClass);
router.get('/single/pdf', controller.downloadSingle);
router.get('/bulk/pdf', controller.downloadBulk);

module.exports = router;
