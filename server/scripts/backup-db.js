require('dotenv').config();
const { connect } = require('../src/config/database');
const { runBackup } = require('../src/services/backup.service');

async function main() {
  await connect();
  const meta = await runBackup();
  meta.collections.forEach(({ name, count }) => console.log(`${name}: ${count} documents`));
  console.log('Backup written to', `backups/${meta.timestamp}`);
  process.exit(0);
}

main().catch((err) => { console.error('Backup failed:', err); process.exit(1); });
