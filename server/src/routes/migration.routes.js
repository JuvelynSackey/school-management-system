const express = require('express');
const controller = require('../controllers/migration.controller');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const { uploadCsv } = require('../middleware/upload');

const router = express.Router();

router.use(authenticate);
router.use(authorize('admin'));

router.post('/students', uploadCsv, controller.importStudentsAndStaff);
router.post('/scores', uploadCsv, controller.importHistoricalScores);
router.post('/credentials-csv', controller.downloadCredentialsCsv);

module.exports = router;
