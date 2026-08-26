// One-off, idempotent backfill: sets gradeLevel/levelOrder/stage on any
// EXISTING class (any school) whose name exactly matches one of the 14
// canonical grade-level values and doesn't have a gradeLevel yet. Only
// touches rows already missing gradeLevel, so it's safe to re-run.
//
// Does NOT touch classes onboarded after this feature shipped (they already
// get gradeLevel set at creation by schoolOnboarding.service.js) or classes
// with custom names that don't match the canonical list (left as unranked,
// same as today).
const config = require('../src/config');
const mongoose = require('mongoose');
const { GRADE_LEVEL_VALUES, LEVEL_ORDER_BY_GRADE, STAGE_BY_GRADE_LEVEL } = require('../src/constants/gradeLevels');

(async () => {
  await mongoose.connect(config.mongoUri);
  const { Class } = require('../src/models');

  let totalMatched = 0;
  for (const name of GRADE_LEVEL_VALUES) {
    // eslint-disable-next-line no-await-in-loop
    const result = await Class.updateMany(
      { name, gradeLevel: null },
      {
        $set: {
          gradeLevel: name,
          levelOrder: LEVEL_ORDER_BY_GRADE[name],
          stage: STAGE_BY_GRADE_LEVEL[name],
        },
      },
    ).setOptions({ skipTenantScope: true });
    if (result.modifiedCount > 0) {
      console.log(`"${name}": backfilled ${result.modifiedCount} class(es)`);
      totalMatched += result.modifiedCount;
    }
  }

  console.log(`Done. ${totalMatched} class(es) backfilled across all schools.`);
  await mongoose.disconnect();
})().catch((err) => { console.error(err); process.exit(1); });
