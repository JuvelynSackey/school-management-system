const { AuditLog, User } = require('../models');
const SuperAdmin = require('../superAdmin/superAdmin.model');

const record = async ({
  req, action, entityType, entityId = null, description, metadata = null,
}) => {
  try {
    // The JWT payload (and therefore req.user) only carries id/role/schoolId —
    // fullName has to be looked up to make the log readable.
    const actor = req.user?.id ? await User.findById(req.user.id).select('fullName') : null;
    await AuditLog.create({
      actorId: req.user?.id || null,
      actorType: 'user',
      actorName: actor?.fullName || null,
      actorRole: req.user?.role || null,
      action,
      entityType,
      entityId,
      description,
      metadata,
    });
  } catch (err) {
    // Never let a logging failure break the real action it's describing.
    console.error('Audit log write failed:', err.message);
  }
};

// Twin of record() for Super-Admin-authored actions, which have no tenant
// User actor and no ambient tenant context to auto-stamp a schoolId from —
// the caller supplies whichever school the action concerns (or null for a
// truly platform-wide event).
const recordSuperAdmin = async ({
  req, action, entityType, entityId = null, description, metadata = null, schoolId = null,
}) => {
  try {
    const actor = req.superAdmin?.id ? await SuperAdmin.findById(req.superAdmin.id).select('fullName') : null;
    await AuditLog.create({
      schoolId,
      actorId: null,
      actorType: 'super-admin',
      actorName: actor?.fullName || null,
      actorRole: 'super-admin',
      action,
      entityType,
      entityId,
      description,
      metadata,
    });
  } catch (err) {
    console.error('Audit log write failed:', err.message);
  }
};

// Lowest-level primitive, for events with no authenticated actor yet (e.g.
// a login attempt, which by definition happens before auth succeeds).
const recordAuthEvent = async ({
  schoolId = null, actorId = null, actorType = 'system', actorName = null, actorRole = null,
  action, description, metadata = null,
}) => {
  try {
    await AuditLog.create({
      schoolId, actorId, actorType, actorName, actorRole, action, entityType: 'Auth', description, metadata,
    });
  } catch (err) {
    console.error('Audit log write failed:', err.message);
  }
};

module.exports = { record, recordSuperAdmin, recordAuthEvent };
