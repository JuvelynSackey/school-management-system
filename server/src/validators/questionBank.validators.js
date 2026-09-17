const { body } = require('express-validator');

const TYPES = ['mcq', 'true_false', 'multi_select', 'matching', 'ordering', 'fill_in_blank', 'essay', 'file_upload'];
const DIFFICULTIES = ['Easy', 'Medium', 'Difficult'];

// Only the fields every question needs regardless of type. Type-specific
// payload shape (options/matchingPairs/orderItems/blanks) is validated in
// questionBank.controller.js, same as announcements.controller.js validates
// its own targetType-conditional fields rather than express-validator.
const questionValidator = [
  body('subjectId').isMongoId().withMessage('A subject is required'),
  body('classId').optional({ nullable: true, checkFalsy: true }).isMongoId(),
  body('topic').trim().notEmpty().withMessage('Topic is required').isLength({ max: 150 }),
  body('curriculumStrand').optional({ nullable: true, checkFalsy: true }).isLength({ max: 150 }),
  body('curriculumSubStrand').optional({ nullable: true, checkFalsy: true }).isLength({ max: 150 }),
  body('learningObjective').optional({ nullable: true, checkFalsy: true }).isLength({ max: 300 }),
  body('difficulty').isIn(DIFFICULTIES).withMessage(`Difficulty must be one of: ${DIFFICULTIES.join(', ')}`),
  body('type').isIn(TYPES).withMessage(`Type must be one of: ${TYPES.join(', ')}`),
  body('marks').isInt({ min: 1 }).withMessage('Marks must be a positive number'),
  body('promptText').trim().notEmpty().withMessage('Question text is required').isLength({ max: 2000 }),
  body('modelAnswer').optional({ nullable: true, checkFalsy: true }).isLength({ max: 2000 }),
];

module.exports = { questionValidator };
