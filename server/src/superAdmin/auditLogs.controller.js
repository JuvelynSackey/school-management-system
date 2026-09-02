const { AuditLog, School } = require('../models');
const asyncHandler = require('../middleware/asyncHandler');
const { toCsv } = require('../services/csv.service');

const MAX_LIMIT = 200;
const DEFAULT_LIMIT = 50;
const MAX_EXPORT_ROWS = 10000;

// Shared by list and exportLogs so the two can never drift on what a given
// set of filters actually means.
const buildWhere = ({ schoolId, entityType, action, startDate, endDate }) => {
  const where = {};
  if (schoolId) where.schoolId = schoolId;
  if (entityType) where.entityType = entityType;
  if (action) where.action = action;
  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.$gte = new Date(startDate);
    if (endDate) {
      // endDate is a plain date (e.g. "2026-03-05"); treat it as inclusive
      // of the whole day rather than midnight-exclusive.
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      where.createdAt.$lte = end;
    }
  }
  return where;
};

const attachSchools = async (logs) => {
  const schools = await School.find({}, { name: 1, slug: 1 });
  const schoolById = new Map(schools.map((s) => [s.id, s]));
  return logs.map((log) => ({
    ...log.toJSON(),
    school: log.schoolId ? (schoolById.get(log.schoolId.toString()) ? { name: schoolById.get(log.schoolId.toString()).name, slug: schoolById.get(log.schoolId.toString()).slug } : null) : null,
  }));
};

// GET /super-admin/audit-logs?schoolId=&entityType=&action=&startDate=&endDate=&page=&limit=
const list = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(req.query.limit, 10) || DEFAULT_LIMIT));

  const where = buildWhere(req.query);
  const query = AuditLog.find(where).setOptions({ skipTenantScope: true }).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit);
  const [logs, total] = await Promise.all([
    query,
    AuditLog.countDocuments(where).setOptions({ skipTenantScope: true }),
  ]);

  const withSchool = await attachSchools(logs);
  res.json({ success: true, data: { logs: withSchool, total, page, limit } });
});

// GET /super-admin/audit-logs/export?format=csv|json&schoolId=&entityType=&action=&startDate=&endDate=
// Same filters as list, but the full matching set (capped) instead of one
// page, as a downloadable file.
const exportLogs = asyncHandler(async (req, res) => {
  const where = buildWhere(req.query);
  const logs = await AuditLog.find(where).setOptions({ skipTenantScope: true }).sort({ createdAt: -1 }).limit(MAX_EXPORT_ROWS);
  const withSchool = await attachSchools(logs);

  const format = req.query.format === 'json' ? 'json' : 'csv';
  if (format === 'json') {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="audit-log-export.json"');
    return res.send(JSON.stringify(withSchool, null, 2));
  }

  const columns = [
    { key: 'createdAt', label: 'When' },
    { key: 'actorName', label: 'Who' },
    { key: 'actorRole', label: 'Role' },
    { key: 'schoolName', label: 'School' },
    { key: 'action', label: 'Action' },
    { key: 'entityType', label: 'Type' },
    { key: 'description', label: 'Description' },
  ];
  const rows = withSchool.map((log) => ({
    createdAt: new Date(log.createdAt).toISOString(),
    actorName: log.actorName || 'Unknown',
    actorRole: log.actorRole || '',
    schoolName: log.school?.name || '',
    action: log.action,
    entityType: log.entityType,
    description: log.description,
  }));
  const csv = toCsv(rows, columns);
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="audit-log-export.csv"');
  return res.send(csv);
});

module.exports = { list, exportLogs };
