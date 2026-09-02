const fs = require('node:fs');
const path = require('node:path');
const { EJSON } = require('bson');
const { mongoose } = require('../config/database');

const BACKUPS_DIR = path.join(__dirname, '..', '..', 'backups');

// Resolves a timestamp string to a real backup folder, or throws -- callers
// (the HTTP endpoint especially) must never pass an unvalidated path segment
// straight to the filesystem.
const resolveBackupDir = (timestamp) => {
  const dir = path.join(BACKUPS_DIR, timestamp);
  if (!fs.existsSync(dir) || !fs.existsSync(path.join(dir, 'meta.json'))) {
    throw new Error(`No backup found for timestamp "${timestamp}"`);
  }
  return dir;
};

// For each collection in the backup, replaces the live collection's
// contents with the backed-up documents exactly (deleteMany + insertMany),
// preserving original _ids and every BSON type (ObjectId refs, Dates) via
// EJSON.parse -- see backup.service.js's runBackup for why that matters.
// Intended as an emergency rollback, not routine use -- destructive and
// whole-database, not scoped to one collection or tenant.
const runRestore = async (timestamp) => {
  const backupDir = resolveBackupDir(timestamp);
  const files = fs.readdirSync(backupDir).filter((f) => f.endsWith('.json') && f !== 'meta.json');

  const restored = [];
  // Sequential, not Promise.all -- deleteMany+insertMany pairs against the
  // same live database must not race each other across collections.
  for (const file of files) {
    const name = file.replace(/\.json$/, '');
    const docs = EJSON.parse(fs.readFileSync(path.join(backupDir, file), 'utf8'));
    const collection = mongoose.connection.db.collection(name);
    // eslint-disable-next-line no-await-in-loop
    await collection.deleteMany({});
    // eslint-disable-next-line no-await-in-loop
    if (docs.length > 0) await collection.insertMany(docs);
    restored.push({ name, count: docs.length });
  }

  return { timestamp, restored };
};

module.exports = { runRestore, resolveBackupDir, BACKUPS_DIR };
