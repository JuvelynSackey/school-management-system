const express = require('express');
const controller = require('../controllers/terminalReports.controller');
const {
  generateValidator, listValidator, submitValidator, lockValidator, pdfValidator, rejectValidator, lockAllValidator, pdfSelectedValidator,
} = require('../validators/terminalReports.validators');
const validate = require('../middleware/validate');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');

const router = express.Router();

router.use(authenticate);

// Single-student report card — parent/student self-service viewing, in
// addition to admin/teacher — registered before the blanket admin/teacher
// restriction below applies to the rest of this router.
router.get('/:id/pdf', authorize('admin', 'teacher', 'student', 'parent'), controller.downloadStudentPdf);
router.get('/student/:studentId', authorize('admin', 'teacher', 'student', 'parent'), controller.listForStudent);

router.use(authorize('admin', 'teacher'));

router.post('/generate', generateValidator, validate, controller.generate);
router.get('/', listValidator, validate, controller.list);
router.get('/pdf', pdfValidator, validate, controller.downloadPdf);
router.get('/zip', pdfValidator, validate, controller.downloadZip);
router.post('/pdf-selected', pdfSelectedValidator, validate, controller.downloadSelectedPdf);
router.post('/:id/submit', submitValidator, validate, controller.submit);
router.post('/:id/lock', authorize('admin'), lockValidator, validate, controller.lock);
router.post('/lock-all', authorize('admin'), lockAllValidator, validate, controller.lockAll);
router.post('/:id/reject', authorize('admin'), rejectValidator, validate, controller.reject);
router.post('/:id/unlock', authorize('admin'), controller.unlock);
router.post('/:id/publish', authorize('admin'), controller.publish);
router.post('/:id/unpublish', authorize('admin'), controller.unpublish);
router.post('/publish-all', authorize('admin'), controller.publishAll);

module.exports = router;
