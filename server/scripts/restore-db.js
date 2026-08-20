require('dotenv').config();
const fs = require('node:fs');
const path = require('node:path');
const { mongoose, connect } = require('../src/config/database');

// Restores a backup written by backup-db.js: node scripts/restore-db.js <timestamp-dir-name>
// For each collection in the backup, replaces the live collection's contents
// with the backed-up documents exactly (deleteMany + insertMany), preserving
// original _ids. Intended as an emergency rollback, not routine use.
async function main() {
  const stampArg = process.argv[2];
  if (!stampArg) {
    console.error('Usage: node scripts/restore-db.js <backup-timestamp-dir>');
    process.exit(1);
  }
  const backupDir = path.join(__dirname, '..', 'backups', stampArg);
  if (!fs.existsSync(backupDir)) {
    console.error('No backup found at', backupDir);
    process.exit(1);
  }

  await connect();

  const files = fs.readdirSync(backupDir).filter((f) => f.endsWith('.json'));
  for (const file of files) {
    const name = file.replace(/\.json$/, '');
    const docs = JSON.parse(fs.readFileSync(path.join(backupDir, file), 'utf8'));
    const collection = mongoose.connection.db.collection(name);
    await collection.deleteMany({});
    if (docs.length > 0) await collection.insertMany(docs);
    console.log(`${name}: restored ${docs.length} documents`);
  }

  console.log('Restore complete from', backupDir);
  await mongoose.disconnect();
}

main().catch((err) => { console.error('Restore failed:', err); process.exit(1); });
