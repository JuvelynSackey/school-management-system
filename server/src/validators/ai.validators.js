const { body } = require('express-validator');

const suggestRemarkValidator = [
  body('reportId').isMongoId(),
];

const adminQueryValidator = [
  body('question').trim().notEmpty().isLength({ max: 300 }).withMessage('Question must be 1-300 characters'),
];

module.exports = { suggestRemarkValidator, adminQueryValidator };
