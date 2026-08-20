const { AuditLog, School } = require('../models');
const asyncHandler = require('../middleware/asyncHandler');

const MAX_LIMIT = 200;
const DEFAULT_LIMIT = 50;

// GET /super-admin/audit-logs?schoolId=&entityType=&page=&limit=
const list = asyncHandler(async (req, res) => {
  const { schoolId, entityType } = req.query;
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(req.query.limit, 10) || DEFAULT_LIMIT));

  const where = { ...(schoolId ? { schoolId } : {}), ...(entityType ? { entityType } : {}) };
  const query = AuditLog.find(where).setOptions({ skipTenantScope: true }).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit);
  const [logs, total, schools] = await Promise.all([
    query,
    AuditLog.countDocuments(where).setOptions({ skipTenantScope: true }),
    School.find({}, { name: 1, slug: 1 }),
  ]);

  const schoolById = new Map(schools.map((s) => [s.id, s]));
  const withSchool = logs.map((log) => ({
    ...log.toJSON(),
    school: log.schoolId ? (schoolById.get(log.schoolId.toString()) ? { name: schoolById.get(log.schoolId.toString()).name, slug: schoolById.get(log.schoolId.toString()).slug } : null) : null,
  }));

  res.json({ success: true, data: { logs: withSchool, total, page, limit } });
});

module.exports = { list };
