const express = require('express');
const controller = require('../controllers/dashboard.controller');
const authenticate = require('../middleware/authenticate');

const router = express.Router();

router.get('/', authenticate, controller.getDashboard);

module.exports = router;
