const asyncHandler = require('../middleware/asyncHandler');
const { runBackup, listBackups } = require('../services/backup.service');
const { recordSuperAdmin } = require('../services/auditLog.service');

const list = asyncHandler(async (req, res) => {
  const backups = await listBackups();
  res.json({ success: true, data: backups });
});

const trigger = asyncHandler(async (req, res) => {
  const meta = await runBackup();
  await recordSuperAdmin({
    req, action: 'backup.trigger', entityType: 'Backup', description: `Ran a manual backup: ${meta.timestamp}`,
  });
  res.status(201).json({ success: true, data: meta });
});

module.exports = { list, trigger };
