require('dotenv').config();
const { connect, mongoose } = require('../src/config/database');
const { runRestore } = require('../src/services/restore.service');

// Restores a backup written by backup-db.js: node scripts/restore-db.js <timestamp-dir-name>
async function main() {
  const stampArg = process.argv[2];
  if (!stampArg) {
    console.error('Usage: node scripts/restore-db.js <backup-timestamp-dir>');
    process.exit(1);
  }

  await connect();
  const { restored } = await runRestore(stampArg);
  restored.forEach(({ name, count }) => console.log(`${name}: restored ${count} documents`));
  console.log('Restore complete from', stampArg);
  await mongoose.disconnect();
}

main().catch((err) => { console.error('Restore failed:', err); process.exit(1); });
