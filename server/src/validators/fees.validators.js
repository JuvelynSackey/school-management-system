const { body } = require('express-validator');

const CATEGORIES = ['Tuition', 'Feeding', 'ClassActivity', 'PTA', 'Other'];

const createFeeValidator = [
  body('studentId').isMongoId().withMessage('studentId is required'),
  body('feeType').trim().notEmpty().withMessage('Fee type is required'),
  body('category').optional().isIn(CATEGORIES).withMessage('Invalid category'),
  body('amountDue').isFloat({ min: 0 }).withMessage('Amount due must be a positive number'),
  body('dueDate').optional({ nullable: true, checkFalsy: true }).isISO8601(),
  body('academicTermId').optional({ nullable: true }).isMongoId(),
];

const updateFeeValidator = [
  body('feeType').optional().trim().notEmpty(),
  body('category').optional().isIn(CATEGORIES).withMessage('Invalid category'),
  body('amountDue').optional().isFloat({ min: 0 }),
  body('dueDate').optional({ nullable: true, checkFalsy: true }).isISO8601(),
  body('academicTermId').optional({ nullable: true }).isMongoId(),
];

const paymentValidator = [
  body('amountPaid').isFloat({ gt: 0 }).withMessage('Amount paid must be greater than 0'),
  body('paymentDate').isISO8601().withMessage('Payment date is required'),
  body('paymentMethod').optional().isIn(['Cash', 'Bank Transfer', 'Mobile Money', 'Card', 'Cheque', 'Other']),
  body('referenceNo').optional({ nullable: true }).trim(),
  body('notes').optional({ nullable: true }).trim(),
];

module.exports = { createFeeValidator, updateFeeValidator, paymentValidator };
