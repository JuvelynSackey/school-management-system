const express = require('express');
const controller = require('../controllers/bulkImport.controller');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const { uploadCsv } = require('../middleware/upload');

const router = express.Router();

router.use(authenticate);

router.post('/csv', authorize('admin'), uploadCsv, controller.importStudentsAndStaff);

module.exports = router;
