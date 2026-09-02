const fs = require('node:fs');
const path = require('node:path');
const { EJSON } = require('bson');
const { mongoose } = require('../config/database');

const BACKUPS_DIR = path.join(__dirname, '..', '..', 'backups');

// Raw-driver full snapshot of every collection, written as JSON files under
// server/backups/<timestamp>/ — the same format backup-db.js has always used
// (no MongoDB Database Tools on this machine, dataset is small). Also writes
// a meta.json alongside the snapshot so listBackups() doesn't need to open
// every collection file just to report a summary.
//
// EJSON (BSON's "Extended JSON"), not plain JSON.stringify -- a document's
// _id and every ref field is a BSON ObjectId, and every timestamp a BSON
// Date. Plain JSON.stringify silently flattens both to plain strings (their
// toJSON()), which restore.service.js would then insert back as strings,
// corrupting every foreign-key relationship and timestamp in the database.
// EJSON round-trips the real BSON types.
const runBackup = async () => {
  const startedAt = Date.now();
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outDir = path.join(BACKUPS_DIR, stamp);
  fs.mkdirSync(outDir, { recursive: true });

  const collectionsInfo = await mongoose.connection.db.listCollections().toArray();
  const collections = [];
  for (const { name } of collectionsInfo) {
    const docs = await mongoose.connection.db.collection(name).find({}).toArray();
    fs.writeFileSync(path.join(outDir, `${name}.json`), EJSON.stringify(docs, null, 2));
    collections.push({ name, count: docs.length });
  }

  const meta = {
    timestamp: stamp,
    createdAt: new Date().toISOString(),
    collections,
    durationMs: Date.now() - startedAt,
  };
  fs.writeFileSync(path.join(outDir, 'meta.json'), JSON.stringify(meta, null, 2));

  return meta;
};

// Deletes the oldest backup folders beyond retainCount, newest-first ordering
// by folder name (the ISO timestamp sorts lexicographically = chronologically).
const pruneOldBackups = async (retainCount = 14) => {
  if (!fs.existsSync(BACKUPS_DIR)) return { removed: [] };
  const entries = fs.readdirSync(BACKUPS_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort()
    .reverse();
  const toRemove = entries.slice(retainCount);
  toRemove.forEach((name) => fs.rmSync(path.join(BACKUPS_DIR, name), { recursive: true, force: true }));
  return { removed: toRemove };
};

// Reads each backup folder's meta.json, newest first. Folders from before
// this feature existed (no meta.json) are skipped rather than crashing the list.
const listBackups = async () => {
  if (!fs.existsSync(BACKUPS_DIR)) return [];
  const entries = fs.readdirSync(BACKUPS_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort()
    .reverse();

  return entries
    .map((name) => {
      const metaPath = path.join(BACKUPS_DIR, name, 'meta.json');
      if (!fs.existsSync(metaPath)) return null;
      try {
        return JSON.parse(fs.readFileSync(metaPath, 'utf8'));
      } catch {
        return null;
      }
    })
    .filter(Boolean);
};

module.exports = { runBackup, pruneOldBackups, listBackups };
