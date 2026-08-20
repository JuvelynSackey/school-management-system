const cron = require('node-cron');
const { runBackup, pruneOldBackups } = require('./backup.service');

// Daily at 02:00 server time. A failed backup must never crash the server —
// errors are logged and the process keeps running.
const start = () => {
  cron.schedule('0 2 * * *', async () => {
    try {
      const meta = await runBackup();
      await pruneOldBackups();
      console.log(`[backup] scheduled backup complete: ${meta.timestamp}`);
    } catch (err) {
      console.error('[backup] scheduled backup failed:', err.message);
    }
  });
};

module.exports = { start };
