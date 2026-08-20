require('dotenv').config();
const { mongoose, connect } = require('../src/config/database');
const { findOrCreate } = require('../src/utils/findOrCreate');
const models = require('../src/models');

const { School, SchoolSettings, ...rest } = models;
const { mongoose: _m, ...tenantModels } = rest; // every collection except School (the tenant root)

const slugify = (name) => name
  .toLowerCase()
  .trim()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '');

async function main() {
  const schoolName = process.argv[2];
  const dryRun = process.argv.includes('--dry-run');
  if (!schoolName) {
    console.error('Usage: node scripts/migrate-multitenant.js "School Name" [--dry-run]');
    process.exit(1);
  }
  const slug = slugify(schoolName);
  console.log(`School: "${schoolName}" -> slug "${slug}"${dryRun ? '  [DRY RUN]' : ''}`);

  await connect();

  let school;
  if (dryRun) {
    school = await School.findOne({ slug });
    console.log(school ? `Would reuse existing School ${school.id}` : 'Would create new School document');
  } else {
    [school] = await findOrCreate(School, { where: { slug }, defaults: { name: schoolName, status: 'active' } });
    console.log('School:', school.id, school.slug);
  }
  const schoolId = school ? school._id : new mongoose.Types.ObjectId(); // dry-run placeholder when no School exists yet

  for (const [name, Model] of Object.entries(tenantModels)) {
    const filter = { schoolId: { $exists: false } };
    const count = await Model.collection.countDocuments(filter);
    if (dryRun) {
      console.log(`${name}: would backfill ${count} document(s)`);
      continue;
    }
    const res = await Model.collection.updateMany(filter, { $set: { schoolId } });
    console.log(`${name}: backfilled ${res.modifiedCount} document(s)`);
  }

  // SchoolSettings: backfill schoolId, and fill in its name if still blank
  // (it was reset to blank during this app's own testing, not by real use).
  const settingsFilter = { schoolId: { $exists: false } };
  const settingsCount = await SchoolSettings.collection.countDocuments(settingsFilter);
  if (dryRun) {
    console.log(`schoolsettings: would backfill ${settingsCount} document(s)`);
  } else {
    await SchoolSettings.collection.updateMany(settingsFilter, { $set: { schoolId } });
    await SchoolSettings.collection.updateMany({ schoolId, name: '' }, { $set: { name: schoolName } });
    console.log(`schoolsettings: backfilled ${settingsCount} document(s)`);
  }

  if (!dryRun) {
    console.log('Syncing indexes...');
    await Promise.all(Object.values(models).filter((m) => m.syncIndexes).map((m) => m.syncIndexes()));
    console.log('Indexes synced.');
  }

  await mongoose.disconnect();
}

main().catch((err) => { console.error('Migration failed:', err); process.exit(1); });
