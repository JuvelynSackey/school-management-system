const { body } = require('express-validator');

const classValidator = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('section').optional({ nullable: true }).trim(),
  body('room').optional({ nullable: true }).trim(),
  body('stage').optional({ nullable: true, checkFalsy: true }).isIn(['Creche', 'Nursery', 'KG', 'Primary', 'JHS']),
  body('classTeacherId').optional({ nullable: true }).isMongoId().withMessage('Class teacher must be a valid teacher id'),
];

module.exports = { classValidator };
