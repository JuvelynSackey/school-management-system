const { body } = require('express-validator');

const houseValidator = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('colorHex').optional({ nullable: true, checkFalsy: true }).matches(/^#[0-9A-Fa-f]{6}$/).withMessage('colorHex must look like #RRGGBB'),
];

module.exports = { houseValidator };
