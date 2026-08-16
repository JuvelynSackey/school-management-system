const { body, query } = require('express-validator');

const generateValidator = [
  body('classId').isMongoId(),
  body('academicTermId').isMongoId(),
];

const listValidator = [
  query('classId').isMongoId(),
  query('academicTermId').isMongoId(),
];

const submitValidator = [
  body('teacherRemark').optional({ nullable: true }).trim(),
  body('teacherSignatureName').optional({ nullable: true }).trim(),
];

const lockValidator = [
  body('headteacherRemark').optional({ nullable: true }).trim(),
  body('headteacherSignatureName').trim().notEmpty().withMessage('Headteacher signature name is required to lock a report'),
];

const pdfValidator = [
  query('classId').isMongoId(),
  query('academicTermId').isMongoId(),
];

module.exports = { generateValidator, listValidator, submitValidator, lockValidator, pdfValidator };
