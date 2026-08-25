const express = require('express');
const controller = require('../controllers/reports.controller');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');

const router = express.Router();

router.use(authenticate, authorize('admin'));

router.get('/students', controller.studentList);
router.get('/attendance', controller.attendanceReport);
router.get('/results', controller.resultsReport);
router.get('/fees', controller.feesReport);
router.get('/broadsheet-pdf', controller.broadsheetPdf);

module.exports = router;
