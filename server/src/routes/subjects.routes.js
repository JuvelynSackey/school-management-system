const express = require('express');
const controller = require('../controllers/subjects.controller');
const { subjectValidator, assignValidator } = require('../validators/subjects.validators');
const validate = require('../middleware/validate');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');

const router = express.Router();

router.use(authenticate);

router.get('/', controller.list);
router.post('/', authorize('admin'), subjectValidator, validate, controller.create);
router.put('/:id', authorize('admin'), subjectValidator, validate, controller.update);
router.delete('/:id', authorize('admin'), controller.remove);

router.get('/class/:classId', controller.listByClass);
router.post('/assign', authorize('admin'), assignValidator, validate, controller.assignToClass);
router.delete('/assign/:linkId', authorize('admin'), controller.unassignFromClass);

module.exports = router;
