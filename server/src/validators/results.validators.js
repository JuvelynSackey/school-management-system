const { body, query } = require('express-validator');

const getRosterValidator = [
  query('classId').isMongoId(),
  query('subjectId').isMongoId(),
  query('academicTermId').isMongoId(),
];

const recordBulkValidator = [
  body('classId').isMongoId(),
  body('subjectId').isMongoId(),
  body('academicTermId').isMongoId(),
  body('records').isArray({ min: 1 }),
  body('records.*.studentId').isMongoId(),
  body('records.*.classScore').isFloat({ min: 0, max: 50 }).withMessage('Class score must be between 0 and 50'),
  body('records.*.examScore').isFloat({ min: 0, max: 50 }).withMessage('Exam score must be between 0 and 50'),
];

module.exports = { getRosterValidator, recordBulkValidator };
