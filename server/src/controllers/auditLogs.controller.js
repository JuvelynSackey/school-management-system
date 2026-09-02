const { AuditLog } = require('../models');
const asyncHandler = require('../middleware/asyncHandler');
const { toCsv } = require('../services/csv.service');

const MAX_LIMIT = 200;
const DEFAULT_LIMIT = 50;
const MAX_EXPORT_ROWS = 10000;

// GET /audit-logs?entityType=&page=&limit=
const list = asyncHandler(async (req, res) => {
  const { entityType } = req.query;
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(req.query.limit, 10) || DEFAULT_LIMIT));

  const where = entityType ? { entityType } : {};
  const [logs, total] = await Promise.all([
    AuditLog.find(where).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    AuditLog.countDocuments(where),
  ]);

  res.json({ success: true, data: { logs, total, page, limit } });
});

const buildExportWhere = ({ entityType, action, startDate, endDate }) => {
  const where = {};
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

// GET /audit-logs/export?format=csv|json&entityType=&action=&startDate=&endDate=
// No explicit schoolId filter here -- unlike superAdmin/auditLogs
// .controller.js's exportLogs (which needs skipTenantScope: true since IT
// has to see every school), this route runs inside the authenticated
// request's own tenant context, so tenantScopePlugin already scopes every
// query here to the caller's own school, same as `list` above.
const exportLogs = asyncHandler(async (req, res) => {
  const where = buildExportWhere(req.query);
  const logs = await AuditLog.find(where).sort({ createdAt: -1 }).limit(MAX_EXPORT_ROWS);

  const format = req.query.format === 'json' ? 'json' : 'csv';
  if (format === 'json') {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="audit-log-export.json"');
    return res.send(JSON.stringify(logs, null, 2));
  }

  // No School column -- unlike the super-admin export, every row here is
  // already implicitly the caller's own school.
  const columns = [
    { key: 'createdAt', label: 'When' },
    { key: 'actorName', label: 'Who' },
    { key: 'actorRole', label: 'Role' },
    { key: 'action', label: 'Action' },
    { key: 'entityType', label: 'Type' },
    { key: 'description', label: 'Description' },
  ];
  const rows = logs.map((log) => ({
    createdAt: new Date(log.createdAt).toISOString(),
    actorName: log.actorName || 'Unknown',
    actorRole: log.actorRole || '',
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
