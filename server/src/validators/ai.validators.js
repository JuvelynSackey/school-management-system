const { body, query } = require('express-validator');

const suggestRemarkValidator = [
  body('reportId').isMongoId(),
];

const adminQueryValidator = [
  body('question').trim().notEmpty().isLength({ max: 300 }).withMessage('Question must be 1-300 characters'),
];

const composeAnnouncementValidator = [
  body('objective').trim().notEmpty().isLength({ max: 300 }).withMessage('Objective must be 1-300 characters'),
  body('tone').isIn(['friendly', 'formal', 'urgent']).withMessage('Tone must be friendly, formal, or urgent'),
  body('targetType').isIn(['school', 'class', 'student']).withMessage('targetType must be school, class, or student'),
  body('targetClassId').optional({ nullable: true, checkFalsy: true }).isMongoId(),
];

const performanceSummaryValidator = [
  query('academicTermId').isMongoId(),
];

module.exports = {
  suggestRemarkValidator, adminQueryValidator, composeAnnouncementValidator, performanceSummaryValidator,
};
