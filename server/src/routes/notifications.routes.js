const express = require('express');
const controller = require('../controllers/notifications.controller');
const authenticate = require('../middleware/authenticate');

const router = express.Router();

router.get('/status', authenticate, controller.status);

module.exports = router;
