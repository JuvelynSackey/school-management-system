const { body } = require('express-validator');

const createValidator = [
  body('teacherId').isMongoId().withMessage('teacherId is required'),
  body('subjectId').isMongoId().withMessage('subjectId is required'),
  body('classId').isMongoId().withMessage('classId is required'),
  body('academicTermId').optional({ nullable: true }).isMongoId(),
];

module.exports = { createValidator };
