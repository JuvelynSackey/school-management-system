const express = require('express');
const controller = require('../controllers/fees.controller');
const { createFeeValidator, updateFeeValidator, paymentValidator } = require('../validators/fees.validators');
const validate = require('../middleware/validate');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');

const router = express.Router();

router.use(authenticate);

router.get('/me', authorize('student'), controller.getMyFees);
router.get('/', authorize('admin'), controller.list);
router.post('/', authorize('admin'), createFeeValidator, validate, controller.create);
router.put('/:id', authorize('admin'), updateFeeValidator, validate, controller.update);
router.delete('/:id', authorize('admin'), controller.remove);
router.get('/:id/payments', authorize('admin', 'student'), controller.getPayments);
router.post('/:id/payments', authorize('admin'), paymentValidator, validate, controller.recordPayment);
router.get('/:feeId/payments/:paymentId/receipt', authorize('admin', 'student'), controller.downloadReceipt);

module.exports = router;
