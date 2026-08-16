const { body } = require('express-validator');

const subjectValidator = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('code').optional({ nullable: true }).trim(),
  body('description').optional({ nullable: true }).trim(),
];

const assignValidator = [
  body('classId').isMongoId().withMessage('classId is required'),
  body('subjectId').isMongoId().withMessage('subjectId is required'),
  body('academicTermId').optional({ nullable: true }).isMongoId(),
];

module.exports = { subjectValidator, assignValidator };
