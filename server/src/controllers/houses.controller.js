const models = require('../models');
const { House } = models;
const asyncHandler = require('../middleware/asyncHandler');
const AppError = require('../utils/AppError');
const { deleteWithCascade } = require('../services/cascadeDelete.service');

const list = asyncHandler(async (req, res) => {
  const houses = await House.find().sort({ name: 1 });
  res.json({ success: true, data: houses });
});

const create = asyncHandler(async (req, res) => {
  const { name, colorHex } = req.body;
  const house = await House.create({ name, colorHex: colorHex || null });
  res.status(201).json({ success: true, data: house });
});

const update = asyncHandler(async (req, res, next) => {
  const house = await House.findById(req.params.id);
  if (!house) return next(new AppError('House not found', 404));
  const { name, colorHex } = req.body;
  house.name = name ?? house.name;
  house.colorHex = colorHex === undefined ? house.colorHex : colorHex;
  await house.save();
  res.json({ success: true, data: house });
});

const remove = asyncHandler(async (req, res, next) => {
  const house = await House.findById(req.params.id);
  if (!house) return next(new AppError('House not found', 404));
  await deleteWithCascade(models, House, house.id);
  res.json({ success: true, data: null });
});

module.exports = { list, create, update, remove };
