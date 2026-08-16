const express = require('express');
const controller = require('../controllers/verify.controller');

const router = express.Router();

// Public — no authenticate/authorize. Reached by scanning a QR code printed
// on a receipt or report card, so it must work for a signed-out third party.
router.get('/receipt/:id', controller.verifyReceipt);
router.get('/report/:id', controller.verifyReport);

module.exports = router;
