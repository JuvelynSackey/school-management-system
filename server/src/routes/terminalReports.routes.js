const express = require('express');
const controller = require('../controllers/terminalReports.controller');
const {
  generateValidator, listValidator, submitValidator, lockValidator, pdfValidator,
} = require('../validators/terminalReports.validators');
const validate = require('../middleware/validate');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');

const router = express.Router();

router.use(authenticate, authorize('admin', 'teacher'));

router.post('/generate', generateValidator, validate, controller.generate);
router.get('/', listValidator, validate, controller.list);
router.get('/pdf', pdfValidator, validate, controller.downloadPdf);
router.post('/:id/submit', submitValidator, validate, controller.submit);
router.post('/:id/lock', authorize('admin'), lockValidator, validate, controller.lock);
router.post('/:id/unlock', authorize('admin'), controller.unlock);

module.exports = router;
