const { body } = require('express-validator');

const answerValidator = [
  body('questionId').isMongoId().withMessage('A valid question is required'),
];

module.exports = { answerValidator };
