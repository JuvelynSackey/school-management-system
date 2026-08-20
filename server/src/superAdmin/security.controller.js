const { AuditLog, School } = require('../models');
const asyncHandler = require('../middleware/asyncHandler');

const ALERT_THRESHOLD = 5;
const FAILED_ACTIONS = ['auth.loginFailed', 'auth.superAdminLoginFailed'];

// GET /super-admin/security/failed-logins?hours=24
const failedLogins = asyncHandler(async (req, res) => {
  const hours = Math.max(1, parseInt(req.query.hours, 10) || 24);
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);

  const events = await AuditLog.find({
    action: { $in: FAILED_ACTIONS },
    createdAt: { $gte: since },
  }).setOptions({ skipTenantScope: true }).sort({ createdAt: -1 });

  const schools = await School.find({}, { name: 1, slug: 1 });
  const schoolById = new Map(schools.map((s) => [s.id, s]));

  const grouped = new Map();
  events.forEach((e) => {
    const identifier = e.metadata?.identifier || 'unknown';
    const schoolId = e.schoolId ? e.schoolId.toString() : 'platform';
    const key = `${schoolId}:${identifier}`;
    if (!grouped.has(key)) {
      let schoolName;
      if (e.schoolId) schoolName = schoolById.get(schoolId)?.name || 'Unknown school';
      else if (e.action.startsWith('auth.superAdmin')) schoolName = 'Platform (Super-Admin)';
      else schoolName = 'Unknown or invalid school code';

      grouped.set(key, {
        identifier,
        schoolId: e.schoolId ? schoolId : null,
        schoolName,
        count: 0,
        lastAttempt: e.createdAt,
        reasons: new Set(),
      });
    }
    const entry = grouped.get(key);
    entry.count += 1;
    if (e.metadata?.reason) entry.reasons.add(e.metadata.reason);
  });

  const rows = [...grouped.values()]
    .map((r) => ({ ...r, reasons: [...r.reasons], isAlert: r.count >= ALERT_THRESHOLD }))
    .sort((a, b) => b.count - a.count);

  res.json({
    success: true,
    data: {
      windowHours: hours,
      totalFailedAttempts: events.length,
      alertCount: rows.filter((r) => r.isAlert).length,
      rows,
    },
  });
});

module.exports = { failedLogins };
