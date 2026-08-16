const { SchoolSettings } = require('../models');
const asyncHandler = require('../middleware/asyncHandler');
const { findOrCreate } = require('../utils/findOrCreate');

// Singleton settings document — auto-created with blank defaults on first read.
const get = asyncHandler(async (req, res) => {
  const [settings] = await findOrCreate(SchoolSettings, { where: {} });
  res.json({ success: true, data: settings });
});

const update = asyncHandler(async (req, res) => {
  const { name, motto, address, phone, email } = req.body;
  const settings = await SchoolSettings.findOneAndUpdate(
    {},
    { $set: {
      name: name ?? '', motto: motto ?? '', address: address ?? '', phone: phone ?? '', email: email ?? '',
    } },
    { upsert: true, new: true },
  );
  res.json({ success: true, data: settings });
});

module.exports = { get, update };
