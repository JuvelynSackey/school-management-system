const { body } = require('express-validator');

const updateValidator = [
  body('classScoreMax').optional().isInt({ min: 1, max: 1000 }).withMessage('classScoreMax must be a positive number'),
  body('examScoreMax').optional().isInt({ min: 1, max: 1000 }).withMessage('examScoreMax must be a positive number'),
  body('bands').isArray({ min: 1 }).withMessage('At least one grade band is required'),
  body('bands.*.min').isInt({ min: 0 }).withMessage('Each band needs a numeric min'),
  body('bands.*.grade').trim().notEmpty().isLength({ max: 3 }).withMessage('Each band needs a grade code'),
  body('bands.*.label').trim().notEmpty().isLength({ max: 30 }).withMessage('Each band needs a label'),
  body('classScoreConfig').optional().isObject(),
  body('classScoreConfig.enabled').optional().isBoolean(),
  body('classScoreConfig.components').optional().isArray(),
  body('classScoreConfig.components.*.key').optional().trim().notEmpty().isLength({ max: 40 }).withMessage('Each component needs a key'),
  body('classScoreConfig.components.*.label').optional().trim().notEmpty().isLength({ max: 60 }).withMessage('Each component needs a label'),
  body('classScoreConfig.components.*.maxMarks').optional().isInt({ min: 1 }).withMessage('Each component needs a positive maxMarks'),
];

module.exports = { updateValidator };
