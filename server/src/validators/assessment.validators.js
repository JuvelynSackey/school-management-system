const { body } = require('express-validator');

const ASSESSMENT_TYPES = ['classwork', 'homework', 'project', 'midterm', 'exam', 'other'];
const RELEASE_OPTIONS = ['immediately', 'after_review', 'scheduled', 'manual'];
const STATUSES = ['Draft', 'Published', 'Closed'];

// Only the fields every assessment needs regardless of question makeup.
// questionIds' actual existence/tenant-membership is checked in
// assessment.controller.js (needs a DB round trip, not just shape checking).
const assessmentValidator = [
  body('title').trim().notEmpty().withMessage('Title is required').isLength({ max: 200 }),
  body('subjectId').isMongoId().withMessage('A subject is required'),
  body('classId').isMongoId().withMessage('A class is required'),
  body('academicTermId').isMongoId().withMessage('An academic term is required'),
  body('instructions').optional({ nullable: true, checkFalsy: true }).isLength({ max: 2000 }),
  body('assessmentType').optional().isIn(ASSESSMENT_TYPES),
  body('classScoreComponentKey').optional({ nullable: true, checkFalsy: true }).isString(),
  body('questionIds').optional().isArray(),
  body('questionIds.*').optional().isMongoId(),
  body('startAt').optional({ nullable: true, checkFalsy: true }).isISO8601(),
  body('endAt').optional({ nullable: true, checkFalsy: true }).isISO8601(),
  body('durationMinutes').optional({ nullable: true, checkFalsy: true }).isInt({ min: 1 }),
  body('maxAttempts').optional().isInt({ min: 1 }),
  body('randomizeQuestions').optional().isBoolean(),
  body('randomizeOptions').optional().isBoolean(),
  body('allowBacktracking').optional().isBoolean(),
  body('autoSubmitOnTimeUp').optional().isBoolean(),
  body('resultRelease').optional().isIn(RELEASE_OPTIONS),
  body('resultReleaseAt').optional({ nullable: true, checkFalsy: true }).isISO8601(),
  body('status').optional().isIn(STATUSES),
];

module.exports = { assessmentValidator };
