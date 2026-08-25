const { body, query } = require('express-validator');

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

const createValidator = [
  body('academicTermId').isMongoId().withMessage('academicTermId is required'),
  body('classId').isMongoId().withMessage('classId is required'),
  body('subjectId').isMongoId().withMessage('subjectId is required'),
  body('examDate').isISO8601().withMessage('examDate must be a valid date'),
  body('startTime').matches(TIME_PATTERN).withMessage('startTime must be in HH:MM 24-hour format'),
  body('endTime').matches(TIME_PATTERN).withMessage('endTime must be in HH:MM 24-hour format'),
  body('room').optional({ nullable: true, checkFalsy: true }).trim().isLength({ max: 50 }),
];

const updateValidator = [
  body('examDate').optional().isISO8601().withMessage('examDate must be a valid date'),
  body('startTime').optional().matches(TIME_PATTERN).withMessage('startTime must be in HH:MM 24-hour format'),
  body('endTime').optional().matches(TIME_PATTERN).withMessage('endTime must be in HH:MM 24-hour format'),
  body('room').optional({ nullable: true, checkFalsy: true }).trim().isLength({ max: 50 }),
];

const listValidator = [
  query('academicTermId').optional().isMongoId(),
  query('classId').optional().isMongoId(),
];

module.exports = { createValidator, updateValidator, listValidator };
