const express = require('express');
const controller = require('../controllers/students.controller');
const {
  createValidator, updateValidator, idCardsValidator, waecExportValidator, promoteValidator,
} = require('../validators/students.validators');
const validate = require('../middleware/validate');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const { uploadStudentPhoto } = require('../middleware/upload');

const router = express.Router();

router.use(authenticate);

router.get('/me', authorize('student'), controller.getMe);
router.get('/my-children', authorize('parent'), controller.getMyChildren);
router.get('/', authorize('admin', 'teacher'), controller.list);
router.get('/id-cards/pdf', authorize('admin'), idCardsValidator, validate, controller.downloadIdCardsPdf);
router.get('/waec-preview', authorize('admin'), waecExportValidator, validate, controller.previewWaecExport);
router.get('/waec-export', authorize('admin'), waecExportValidator, validate, controller.downloadWaecExport);
router.get('/:id', authorize('admin', 'teacher', 'student', 'parent'), controller.getById);
router.post('/', authorize('admin'), createValidator, validate, controller.create);
router.post('/promote', authorize('admin'), promoteValidator, validate, controller.promote);
router.put('/:id', authorize('admin'), updateValidator, validate, controller.update);
router.post('/:id/photo', authorize('admin'), uploadStudentPhoto, controller.uploadPhoto);
router.delete('/:id', authorize('admin'), controller.remove);

module.exports = router;
