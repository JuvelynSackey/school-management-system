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

const rejectValidator = [
  body('rejectionReason').trim().notEmpty().withMessage('A rejection reason is required'),
];

const lockAllValidator = [
  body('classId').isMongoId(),
  body('academicTermId').isMongoId(),
  body('headteacherRemark').optional({ nullable: true }).trim(),
  body('headteacherSignatureName').trim().notEmpty().withMessage('Headteacher signature name is required to lock reports'),
];

const pdfSelectedValidator = [
  body('classId').isMongoId(),
  body('academicTermId').isMongoId(),
  body('studentIds').isArray({ min: 1 }).withMessage('Select at least one student'),
  body('studentIds.*').isMongoId(),
];

module.exports = {
  generateValidator, listValidator, submitValidator, lockValidator, pdfValidator, rejectValidator, lockAllValidator, pdfSelectedValidator,
};
