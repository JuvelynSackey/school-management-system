const cron = require('node-cron');
const { Announcement } = require('../models');
const { runWithSchool } = require('../middleware/tenantContext');
const { dispatchAnnouncement } = require('../controllers/announcements.controller');

// Every minute: dispatch any scheduled announcement whose time has come. A
// failed dispatch must never crash the server, and must never block other
// due announcements — each is handled independently. Announcement.find()
// is tenant-scoped, so finding due rows across every school first needs
// skipTenantScope; dispatching one then needs runWithSchool so the nested
// Student/Guardian/Teacher lookups inside dispatchAnnouncement resolve
// against the right tenant.
const dispatchDueAnnouncements = async () => {
  const due = await Announcement.find({
    scheduledFor: { $ne: null, $lte: new Date() },
    sentAt: null,
  }).setOptions({ skipTenantScope: true });

  for (const announcement of due) {
    try {
      // eslint-disable-next-line no-await-in-loop
      await runWithSchool(announcement.schoolId, async () => {
        const fresh = await Announcement.findById(announcement.id);
        if (fresh && !fresh.sentAt) await dispatchAnnouncement(fresh);
      });
    } catch (err) {
      console.error(`[announcements] scheduled dispatch failed for ${announcement.id}:`, err.message);
    }
  }
};

const start = () => {
  cron.schedule('* * * * *', () => {
    dispatchDueAnnouncements().catch((err) => {
      console.error('[announcements] scheduler tick failed:', err.message);
    });
  });
};

module.exports = { start, dispatchDueAnnouncements };
