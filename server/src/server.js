const app = require('./app');
const config = require('./config');
const { connect } = require('./config/database');
const backupScheduler = require('./services/backupScheduler');
const announcementScheduler = require('./services/announcementScheduler');

async function start() {
  try {
    await connect();
    console.log('Database connection established.');
  } catch (err) {
    console.error('Unable to connect to the database:', err.message);
    process.exit(1);
  }

  backupScheduler.start();
  announcementScheduler.start();

  app.listen(config.port, () => {
    console.log(`Server listening on http://localhost:${config.port}`);
  });
}

start();
