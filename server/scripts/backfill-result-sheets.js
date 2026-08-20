require('dotenv').config();
const { mongoose, connect } = require('../src/config/database');
const { Result, ResultSheet, TerminalReport } = require('../src/models');

// One-off backfill: creates a ResultSheet (pure status/metadata) for every
// {schoolId, classId, subjectId, academicTermId} combination that already
// has Result data, so historical terms don't show as "0/N submitted" or
// block anything once the new lifecycle starts being enforced.
//
// Status rule: if any TerminalReport for that class+term is Locked,
// Submitted, or Published, the subject's work already shipped under the old
// rules -> backfill as Approved. Otherwise -> Draft.
//
// Raw `.collection` driver calls throughout (not the Mongoose model), same
// as migrate-multitenant.js — ResultSheet has tenantScopePlugin attached,
// and this script has no per-request tenant context to satisfy it.
async function main() {
  const dryRun = process.argv.includes('--dry-run');
  await connect();

  const groups = await Result.aggregate([
    {
      $group: {
        _id: {
          schoolId: '$schoolId', classId: '$classId', subjectId: '$subjectId', academicTermId: '$academicTermId',
        },
      },
    },
  ]);

  console.log(`Found ${groups.length} distinct class+subject+term combination(s) with existing Result data.${dryRun ? '  [DRY RUN]' : ''}`);

  let created = 0;
  let alreadyExisted = 0;

  for (const g of groups) {
    const { schoolId, classId, subjectId, academicTermId } = g._id;

    const reports = await TerminalReport.collection.find({ classId, academicTermId }).toArray();
    const alreadyShipped = reports.some((r) => ['Locked', 'Submitted', 'Published'].includes(r.status));
    const status = alreadyShipped ? 'Approved' : 'Draft';

    const existing = await ResultSheet.collection.findOne({
      schoolId, classId, subjectId, academicTermId,
    });

    if (existing) {
      alreadyExisted += 1;
      continue;
    }

    if (dryRun) {
      console.log(`Would create: class=${classId} subject=${subjectId} term=${academicTermId} -> status=${status}`);
      created += 1;
      continue;
    }

    await ResultSheet.collection.insertOne({
      schoolId,
      classId,
      subjectId,
      academicTermId,
      status,
      submittedBy: null,
      submittedAt: null,
      reviewedBy: null,
      reviewedAt: null,
      rejectionReason: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    created += 1;
  }

  console.log(`${dryRun ? 'Would create' : 'Created'}: ${created}, already existed: ${alreadyExisted}`);

  if (!dryRun) {
    await ResultSheet.syncIndexes();
    console.log('Indexes synced.');
  }

  await mongoose.disconnect();
}

main().catch((err) => { console.error('Backfill failed:', err); process.exit(1); });
