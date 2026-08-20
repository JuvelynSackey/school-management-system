const { query } = require('express-validator');

const getAtRiskStudentsValidator = [
  query('academicTermId').optional().isMongoId(),
];

module.exports = { getAtRiskStudentsValidator };
