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
  // classScore is optional here specifically so classScoreDetails (per-
  // component marks, summed server-side into classScore -- see
  // result.service.js) can stand in for it when a school has class score
  // decomposition enabled; the custom check below still requires one or
  // the other, and the controller rejects classScoreDetails outright for a
  // school that doesn't have decomposition enabled.
  body('records.*.classScore').optional().isFloat({ min: 0, max: 1000 }).withMessage('Class score must be a non-negative number'),
  body('records.*.classScoreDetails').optional().isObject().withMessage('classScoreDetails must be an object of component marks'),
  body('records.*.examScore').isFloat({ min: 0, max: 1000 }).withMessage('Exam score must be a non-negative number'),
  body('records').custom((records) => {
    const missing = records.find((r) => (r.classScore === undefined || r.classScore === null) && !r.classScoreDetails);
    if (missing) throw new Error('Each record needs either classScore or classScoreDetails');
    return true;
  }),
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
