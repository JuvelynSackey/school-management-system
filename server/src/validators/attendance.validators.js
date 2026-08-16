const { body, query } = require('express-validator');

const getByClassDateValidator = [
  query('classId').isMongoId().withMessage('classId is required'),
  query('date').isISO8601().withMessage('date is required'),
];

const recordBulkValidator = [
  body('classId').isMongoId().withMessage('classId is required'),
  body('date').isISO8601().withMessage('date is required'),
  body('academicTermId').optional({ nullable: true }).isMongoId(),
  body('records').isArray({ min: 1 }).withMessage('records must be a non-empty array'),
  body('records.*.studentId').isMongoId(),
  body('records.*.status').isIn(['Present', 'Absent', 'Late', 'Excused']),
];

module.exports = { getByClassDateValidator, recordBulkValidator };
