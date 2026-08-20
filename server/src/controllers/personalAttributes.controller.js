const { PersonalAttribute } = require('../models');
const asyncHandler = require('../middleware/asyncHandler');
const AppError = require('../utils/AppError');

const list = asyncHandler(async (req, res) => {
  const where = req.query.includeInactive === 'true' ? {} : { isActive: true };
  const attributes = await PersonalAttribute.find(where).sort({ order: 1, name: 1 });
  res.json({ success: true, data: attributes });
});

const create = asyncHandler(async (req, res, next) => {
  const { name, order } = req.body;
  const existing = await PersonalAttribute.findOne({ name });
  if (existing) return next(new AppError('An attribute with this name already exists', 400));
  const attribute = await PersonalAttribute.create({ name, order: order || 0 });
  res.status(201).json({ success: true, data: attribute });
});

const update = asyncHandler(async (req, res, next) => {
  const attribute = await PersonalAttribute.findById(req.params.id);
  if (!attribute) return next(new AppError('Attribute not found', 404));
  const { name, order, isActive } = req.body;
  attribute.name = name ?? attribute.name;
  attribute.order = order === undefined ? attribute.order : order;
  attribute.isActive = isActive === undefined ? attribute.isActive : Boolean(isActive);
  await attribute.save();
  res.json({ success: true, data: attribute });
});

const remove = asyncHandler(async (req, res, next) => {
  const attribute = await PersonalAttribute.findById(req.params.id);
  if (!attribute) return next(new AppError('Attribute not found', 404));
  await attribute.deleteOne();
  res.json({ success: true, data: null });
});

module.exports = { list, create, update, remove };
