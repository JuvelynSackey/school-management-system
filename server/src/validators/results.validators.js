const { body, query, param } = require('express-validator');

const getRosterValidator = [
  query('classId').isMongoId(),
  query('subjectId').isMongoId(),
  query('academicTermId').isMongoId(),
];

const getAnomaliesValidator = [
  query('classId').isMongoId(),
  query('subjectId').isMongoId(),
  query('academicTermId').isMongoId(),
];

// Upper bound here is a loose sanity guard only (rejects garbage/negative
// input) — the real per-school ceiling (scheme.classScoreMax/examScoreMax)
// is enforced in the controller against the school's GradingScheme, since
// express-validator has no access to that here.
const recordBulkValidator = [
  body('classId').isMongoId(),
  body('subjectId').isMongoId(),
  body('academicTermId').isMongoId(),
  body('records').isArray({ min: 1 }),
  body('records.*.studentId').isMongoId(),
  body('records.*.classScore').isFloat({ min: 0, max: 1000 }).withMessage('Class score must be a non-negative number'),
  body('records.*.examScore').isFloat({ min: 0, max: 1000 }).withMessage('Exam score must be a non-negative number'),
];

const amendValidator = [
  body('classScore').isFloat({ min: 0, max: 1000 }).withMessage('Class score must be a non-negative number'),
  body('examScore').isFloat({ min: 0, max: 1000 }).withMessage('Exam score must be a non-negative number'),
  body('reason').trim().notEmpty().withMessage('A reason is required'),
];

const reportConflictValidator = [
  body('classId').isMongoId(),
  body('subjectId').isMongoId(),
  body('academicTermId').isMongoId(),
  body('message').optional({ nullable: true }).trim().isLength({ max: 500 }),
];

const getInsightsValidator = [
  param('studentId').isMongoId(),
];

module.exports = {
  getRosterValidator, getAnomaliesValidator, getInsightsValidator, recordBulkValidator, amendValidator, reportConflictValidator,
};
