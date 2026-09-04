const express = require('express');
const controller = require('../controllers/announcements.controller');
const { createValidator, listValidator } = require('../validators/announcements.validators');
const validate = require('../middleware/validate');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');

const router = express.Router();

router.use(authenticate);

router.get('/me', authorize('teacher', 'student', 'parent'), controller.getMyNoticeBoard);
router.get('/banner', authorize('teacher', 'student', 'parent'), controller.getBanner);
router.get('/unread-count', authorize('teacher', 'student', 'parent'), controller.unreadCount);
router.post('/:id/read', authorize('teacher', 'student', 'parent'), controller.markRead);
router.get('/', authorize('admin'), listValidator, validate, controller.list);
router.post('/', authorize('admin'), createValidator, validate, controller.create);
router.delete('/:id', authorize('admin'), controller.remove);

module.exports = router;
