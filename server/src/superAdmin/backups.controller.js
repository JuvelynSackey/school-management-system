const fs = require('node:fs');
const path = require('node:path');
const archiver = require('archiver');
const asyncHandler = require('../middleware/asyncHandler');
const AppError = require('../utils/AppError');
const { runBackup, listBackups } = require('../services/backup.service');
const { runRestore, resolveBackupDir } = require('../services/restore.service');
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

// GET /super-admin/backups/:timestamp/download — zips the backup's JSON
// files on the fly and streams them. resolveBackupDir throws (caught below)
// for anything that isn't a real, already-listed backup folder, so a
// path-traversal-style timestamp param can never reach the filesystem.
const download = asyncHandler(async (req, res, next) => {
  let backupDir;
  try {
    backupDir = resolveBackupDir(req.params.timestamp);
  } catch (err) {
    return next(new AppError(err.message, 404));
  }

  await recordSuperAdmin({
    req, action: 'backup.download', entityType: 'Backup', description: `Downloaded backup: ${req.params.timestamp}`,
  });

  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="backup-${req.params.timestamp}.zip"`);

  const archive = archiver('zip', { zlib: { level: 9 } });
  archive.on('error', (err) => next(err));
  archive.pipe(res);
  fs.readdirSync(backupDir).filter((f) => f.endsWith('.json')).forEach((file) => {
    archive.append(fs.createReadStream(path.join(backupDir, file)), { name: file });
  });
  await archive.finalize();
});

// POST /super-admin/backups/:timestamp/restore { confirmation: "RESTORE" }
// Destructive, whole-database, irreversible if the wrong snapshot is picked
// -- gated behind a typed confirmation phrase (not just a click), and takes
// an automatic safety backup of the CURRENT state immediately beforehand so
// a wrong choice is itself recoverable.
const restore = asyncHandler(async (req, res, next) => {
  if (req.body.confirmation !== 'RESTORE') {
    return next(new AppError('Type RESTORE to confirm this action', 400));
  }

  try {
    resolveBackupDir(req.params.timestamp);
  } catch (err) {
    return next(new AppError(err.message, 404));
  }

  const safetyBackup = await runBackup();
  const result = await runRestore(req.params.timestamp);

  await recordSuperAdmin({
    req,
    action: 'backup.restore',
    entityType: 'Backup',
    description: `Restored database from backup ${req.params.timestamp} (safety snapshot taken first: ${safetyBackup.timestamp})`,
    metadata: { restoredFrom: req.params.timestamp, safetyBackup: safetyBackup.timestamp, collections: result.restored },
  });

  res.json({ success: true, data: { ...result, safetyBackup: safetyBackup.timestamp } });
});

module.exports = {
  list, trigger, download, restore,
};
