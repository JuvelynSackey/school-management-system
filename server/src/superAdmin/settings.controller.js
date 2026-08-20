const { PlatformSettings } = require('../models');
const asyncHandler = require('../middleware/asyncHandler');
const { findOrCreate } = require('../utils/findOrCreate');
const { recordSuperAdmin } = require('../services/auditLog.service');

const get = asyncHandler(async (req, res) => {
  const [settings] = await findOrCreate(PlatformSettings, { where: {} });
  res.json({ success: true, data: settings });
});

const update = asyncHandler(async (req, res) => {
  const { maintenanceMode, minPasswordLength } = req.body;
  const [existing] = await findOrCreate(PlatformSettings, { where: {} });

  existing.maintenanceMode = {
    enabled: Boolean(maintenanceMode?.enabled),
    message: maintenanceMode?.message || existing.maintenanceMode.message,
  };
  existing.minPasswordLength = minPasswordLength || existing.minPasswordLength;
  await existing.save();

  await recordSuperAdmin({
    req,
    action: 'platformSettings.update',
    entityType: 'PlatformSettings',
    entityId: existing.id,
    description: `Updated platform settings (maintenance mode: ${existing.maintenanceMode.enabled ? 'on' : 'off'}, min password length: ${existing.minPasswordLength})`,
  });

  res.json({ success: true, data: existing });
});

module.exports = { get, update };
