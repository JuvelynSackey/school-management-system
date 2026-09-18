const { body } = require('express-validator');

const answerValidator = [
  body('questionId').isMongoId().withMessage('A valid question is required'),
];

const gradeValidator = [
  body('grades').isArray({ min: 1 }).withMessage('At least one grade is required'),
  body('grades.*.questionId').isMongoId().withMessage('Each grade needs a valid question'),
  body('grades.*.marksAwarded').isFloat({ min: 0 }).withMessage('Marks awarded must be zero or a positive number'),
];

module.exports = { answerValidator, gradeValidator };
