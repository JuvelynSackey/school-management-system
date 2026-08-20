require('dotenv').config();
const { mongoose, connect } = require('../src/config/database');
const models = require('../src/models');

const { School, ...rest } = models;
const { mongoose: _m, ...tenantModels } = rest; // every collection except School

// Undoes migrate-multitenant.js: strips schoolId from every document and
// drops the schoolId-based indexes back down to their pre-migration shape
// isn't attempted here (that's a code rollback, not a data one) — this just
// removes the data-side backfill so re-running the migration is possible.
async function main() {
  await connect();

  for (const [name, Model] of Object.entries(tenantModels)) {
    const res = await Model.collection.updateMany({}, { $unset: { schoolId: '' } });
    console.log(`${name}: unset schoolId on ${res.modifiedCount} document(s)`);
  }

  await mongoose.disconnect();
}

main().catch((err) => { console.error('Rollback failed:', err); process.exit(1); });
