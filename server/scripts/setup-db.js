require('dotenv').config();
const models = require('../src/models');

const { mongoose, ...modelMap } = models;

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Syncing indexes...');
  await Promise.all(Object.values(modelMap).map((Model) => Model.syncIndexes()));
  console.log('Indexes synced successfully.');
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('Failed to set up database:', err.message);
  process.exit(1);
});
