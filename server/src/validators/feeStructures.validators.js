const { body } = require('express-validator');

const structureValidator = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('category').optional().isIn(['Tuition', 'Feeding', 'ClassActivity', 'PTA', 'Other']).withMessage('Invalid category'),
  body('amount').isFloat({ min: 0 }).withMessage('Amount must be a positive number'),
  body('academicTermId').optional({ nullable: true }).isMongoId(),
];

const applyValidator = [
  body('target').isIn(['class', 'stage', 'all']).withMessage('target must be class, stage, or all'),
  body('classId').if(body('target').equals('class')).isMongoId().withMessage('classId is required for target=class'),
  body('stage').if(body('target').equals('stage')).isIn(['Creche', 'Nursery', 'KG', 'Primary', 'JHS']),
  body('dueDate').optional({ nullable: true, checkFalsy: true }).isISO8601(),
];

module.exports = { structureValidator, applyValidator };
