const asyncHandler = require('../middleware/asyncHandler');
const AppError = require('../utils/AppError');
const { importCsv } = require('../services/bulkImport.service');
const auditLog = require('../services/auditLog.service');
const { runWithSchool } = require('../middleware/tenantContext');

// POST /bulk-import/csv (multipart, field name "file") — admin only.
// Each row (STUDENT or STAFF) is created independently; a bad row is
// reported in `failed` rather than aborting the whole batch.
//
// multer's async multipart parsing (busboy under the hood) does not reliably
// carry authenticate.js's AsyncLocalStorage context through to here -- the
// tenant scope plugin throws "context missing" otherwise. Re-establish it
// explicitly rather than trusting it survived the async detour, same
// defensive pattern verify.controller.js uses for pre-auth code.
const importStudentsAndStaff = asyncHandler(async (req, res, next) => {
  if (!req.file) return next(new AppError('A CSV file is required', 400));

  await runWithSchool(req.user.schoolId, async () => {
    const result = await importCsv(req.file.buffer);

    await auditLog.record({
      req,
      action: 'bulkImport.csv',
      entityType: 'School',
      entityId: req.user.schoolId,
      description: `Bulk-imported ${result.createdCount} record(s) from CSV (${result.failedCount} failed) — ${req.file.originalname}`,
    });

    res.status(201).json({ success: true, data: result });
  });
});

module.exports = { importStudentsAndStaff };
