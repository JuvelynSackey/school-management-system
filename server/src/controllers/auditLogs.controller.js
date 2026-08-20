const { AuditLog } = require('../models');
const asyncHandler = require('../middleware/asyncHandler');

const MAX_LIMIT = 200;
const DEFAULT_LIMIT = 50;

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

module.exports = { list };
