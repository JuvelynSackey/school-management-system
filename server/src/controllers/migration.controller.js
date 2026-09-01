const asyncHandler = require('../middleware/asyncHandler');
const AppError = require('../utils/AppError');
const { importPeople, importScores } = require('../services/migration.service');
const { toCsv } = require('../services/csv.service');
const auditLog = require('../services/auditLog.service');
const { runWithSchool } = require('../middleware/tenantContext');

// POST /migration/students (multipart, field name "file") — admin only.
// Imports STUDENT/STAFF rows from a legacy CSV export (any header spelling
// covered by migrationFieldAliases.js). Each row is created independently.
//
// multer's async multipart parsing does not reliably carry
// authenticate.js's AsyncLocalStorage context through to here -- tenant-
// scoped queries and the audit log write both need it re-established
// explicitly, same defensive pattern verify.controller.js uses for pre-auth
// code.
const importStudentsAndStaff = asyncHandler(async (req, res, next) => {
  if (!req.file) return next(new AppError('A CSV file is required', 400));

  await runWithSchool(req.user.schoolId, async () => {
    const result = await importPeople(req.file.buffer);

    await auditLog.record({
      req,
      action: 'migration.importPeople',
      entityType: 'School',
      entityId: req.user.schoolId,
      description: `Migrated ${result.createdCount} record(s) from CSV (${result.failedCount} failed) — ${req.file.originalname}`,
    });

    res.status(201).json({ success: true, data: result });
  });
});

// POST /migration/scores (multipart, field name "file") — admin only.
// Imports historical per-subject scores, tagged isMigrated: true.
const importHistoricalScores = asyncHandler(async (req, res, next) => {
  if (!req.file) return next(new AppError('A CSV file is required', 400));

  await runWithSchool(req.user.schoolId, async () => {
    const result = await importScores(req.file.buffer, req.user.id, req.user.schoolId);

    await auditLog.record({
      req,
      action: 'migration.importScores',
      entityType: 'School',
      entityId: req.user.schoolId,
      description: `Migrated ${result.createdCount} historical score(s) from CSV (${result.failedCount} failed) — ${req.file.originalname}`,
    });

    res.status(201).json({ success: true, data: result });
  });
});

// POST /migration/credentials-csv { created: [...] } — admin only.
// The client re-submits the `created` array it already received from
// importStudentsAndStaff (still held in memory from that response); this
// just formats it as a downloadable CSV. Deliberately NOT a stored,
// later-fetchable "batch" resource -- generated PINs/passwords are only
// ever held in memory for this one response cycle, never persisted in
// plaintext anywhere (matches every other credential-issuing flow in this
// app), so there is nothing to fetch again after the browser tab closes.
const downloadCredentialsCsv = asyncHandler(async (req, res, next) => {
  const { created } = req.body;
  if (!Array.isArray(created) || created.length === 0) {
    return next(new AppError('created must be a non-empty array', 400));
  }

  const columns = [
    { key: 'recordType', label: 'Type' },
    { key: 'name', label: 'Name' },
    { key: 'idOrNo', label: 'ID / Admission No.' },
    { key: 'phone', label: 'Phone' },
    { key: 'password', label: 'PIN / Password' },
  ];
  const rows = [];
  created.forEach((r) => {
    if (r.tempPassword) {
      rows.push({
        recordType: r.recordType, name: r.name, idOrNo: r.admissionNo || r.staffNo || '', phone: '', password: r.tempPassword,
      });
    }
    (r.provisionedLogins || []).forEach((pl) => {
      rows.push({
        recordType: 'GUARDIAN', name: pl.fullName, idOrNo: '', phone: pl.phone, password: pl.pin,
      });
    });
  });
  if (rows.length === 0) return next(new AppError('No credentials to export', 400));

  const csv = toCsv(rows, columns);
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="migration-credentials.csv"');
  res.send(csv);
});

module.exports = { importStudentsAndStaff, importHistoricalScores, downloadCredentialsCsv };
