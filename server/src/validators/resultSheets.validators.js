const { body, query } = require('express-validator');

const listValidator = [
  query('classId').isMongoId(),
  query('academicTermId').isMongoId(),
];

const rejectValidator = [
  body('rejectionReason').trim().notEmpty().withMessage('A rejection reason is required'),
];

const submitAllValidator = [
  body('classId').isMongoId(),
  body('academicTermId').isMongoId(),
];

const matrixValidator = [
  query('academicTermId').optional().isMongoId(),
];

module.exports = {
  listValidator, rejectValidator, submitAllValidator, matrixValidator,
};
