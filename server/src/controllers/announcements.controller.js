const { Announcement } = require('../models');
const models = require('../models');
const asyncHandler = require('../middleware/asyncHandler');
const AppError = require('../utils/AppError');
const { resolveGuardianRecipients } = require('../services/guardianRecipients.service');
const { resolveNoticeBoardMatchForRole, countIntendedRecipients } = require('../services/announcementTargeting.service');
const notifications = require('../services/notifications.service');

const populateForDisplay = (query) => query
  .populate('targetClass', 'name section')
  .populate('targetStudent', 'firstName lastName')
  .populate('targetClassIds', 'name section')
  .populate('targetTeacherIds', 'firstName lastName')
  .populate('targetStudentIds', 'firstName lastName')
  .populate('targetGuardianIds', 'fullName')
  .populate('creator', 'fullName');

const MULTI_TARGET_FIELDS = {
  specific_teachers: 'targetTeacherIds',
  specific_students: 'targetStudentIds',
  specific_parents: 'targetGuardianIds',
  specific_classes: 'targetClassIds',
};

// Dispatches an already-created announcement to its non-in_app channels and
// records the result. Shared by create() (immediate sends) and
// announcementScheduler.js's cron job (deferred sends) so there is exactly
// one dispatch code path regardless of when it fires.
const dispatchAnnouncement = async (announcement) => {
  const externalChannels = (announcement.channels || []).filter((c) => c !== 'in_app');
  if (externalChannels.length > 0) {
    const recipients = await resolveGuardianRecipients(announcement.toObject ? announcement.toObject() : announcement);
    const deliveryLog = await Promise.all(externalChannels.map((channel) => notifications.dispatch({
      channel, message: announcement.message, recipients,
    })));
    announcement.deliveryLog = deliveryLog;
    announcement.deliveryStatus = deliveryLog.some((d) => d.status === 'sent') ? 'sent' : 'logged';
  }
  announcement.sentAt = new Date();
  await announcement.save();
  return announcement;
};

// POST /announcements
const create = asyncHandler(async (req, res, next) => {
  const {
    message, targetType, targetClassId, targetStudentId,
    targetClassIds, targetTeacherIds, targetStudentIds, targetGuardianIds,
    category, channels, scheduledFor,
  } = req.body;

  if (targetType === 'class' && !targetClassId) {
    return next(new AppError('targetClassId is required when targetType is "class"', 400));
  }
  if (targetType === 'student' && !targetStudentId) {
    return next(new AppError('targetStudentId is required when targetType is "student"', 400));
  }
  const multiField = MULTI_TARGET_FIELDS[targetType];
  const multiPayload = { targetClassIds, targetTeacherIds, targetStudentIds, targetGuardianIds }[multiField];
  if (multiField && (!Array.isArray(multiPayload) || multiPayload.length === 0)) {
    return next(new AppError(`${multiField} must be a non-empty array when targetType is "${targetType}"`, 400));
  }

  const requestedChannels = Array.isArray(channels) && channels.length ? channels : ['in_app'];
  const scheduledDate = scheduledFor ? new Date(scheduledFor) : null;
  if (scheduledDate && scheduledDate <= new Date()) {
    return next(new AppError('scheduledFor must be a future date/time', 400));
  }

  let announcement = await Announcement.create({
    message,
    category: category || 'general',
    targetType,
    targetClassId: targetType === 'class' ? targetClassId : null,
    targetStudentId: targetType === 'student' ? targetStudentId : null,
    targetClassIds: targetType === 'specific_classes' ? targetClassIds : [],
    targetTeacherIds: targetType === 'specific_teachers' ? targetTeacherIds : [],
    targetStudentIds: targetType === 'specific_students' ? targetStudentIds : [],
    targetGuardianIds: targetType === 'specific_parents' ? targetGuardianIds : [],
    deliveryStatus: 'logged',
    channels: requestedChannels,
    scheduledFor: scheduledDate,
    createdBy: req.user.id,
  });

  if (!scheduledDate) {
    announcement = await dispatchAnnouncement(announcement);
  }

  const full = await populateForDisplay(Announcement.findById(announcement.id));
  res.status(201).json({ success: true, data: full });
});

// GET /announcements?category= — the admin's full history, with a
// per-announcement read-count aggregate ("15/18 read") computed from the
// same targeting definition the recipients' own notice boards use.
const list = asyncHandler(async (req, res) => {
  const { category } = req.query;
  const where = {};
  if (category) where.category = category;

  const announcements = await populateForDisplay(Announcement.find(where)).sort({ createdAt: -1 });
  const withReadCounts = await Promise.all(announcements.map(async (a) => {
    const data = a.toJSON();
    data.status = a.scheduledFor && !a.sentAt ? 'scheduled' : 'sent';
    data.readCount = a.readBy.length;
    data.totalRecipients = await countIntendedRecipients(models, a);
    delete data.readBy;
    return data;
  }));
  res.json({ success: true, data: withReadCounts });
});

const remove = asyncHandler(async (req, res, next) => {
  const announcement = await Announcement.findById(req.params.id);
  if (!announcement) return next(new AppError('Announcement not found', 404));
  await announcement.deleteOne();
  res.json({ success: true, data: null });
});

// GET /announcements/me — the notice board for the logged-in teacher/student/parent
const getMyNoticeBoard = asyncHandler(async (req, res, next) => {
  const match = await resolveNoticeBoardMatchForRole(req.user);
  if (match === undefined) return next(new AppError('Admins should use the full announcement history instead', 400));
  if (match === null) return next(new AppError('Student profile not found', 404));

  const where = { ...match, sentAt: { $ne: null } };
  const announcements = await populateForDisplay(Announcement.find(where)).sort({ createdAt: -1 });
  const withReadState = announcements.map((a) => {
    const data = a.toJSON();
    data.isRead = a.readBy.some((r) => r.userId.toString() === req.user.id);
    delete data.readBy;
    return data;
  });
  res.json({ success: true, data: withReadState });
});

// GET /announcements/unread-count
const unreadCount = asyncHandler(async (req, res, next) => {
  const match = await resolveNoticeBoardMatchForRole(req.user);
  if (match === undefined) return next(new AppError('Admins should use the full announcement history instead', 400));
  if (match === null) return res.json({ success: true, data: { count: 0 } });

  const count = await Announcement.countDocuments({
    ...match,
    sentAt: { $ne: null },
    'readBy.userId': { $ne: req.user.id },
  });
  res.json({ success: true, data: { count } });
});

// POST /announcements/:id/read — idempotent; marking an already-read notice
// read again is a no-op, not an error.
const markRead = asyncHandler(async (req, res, next) => {
  const announcement = await Announcement.findById(req.params.id);
  if (!announcement) return next(new AppError('Announcement not found', 404));

  const alreadyRead = announcement.readBy.some((r) => r.userId.toString() === req.user.id);
  if (!alreadyRead) {
    announcement.readBy.push({ userId: req.user.id, readAt: new Date() });
    await announcement.save();
  }

  res.json({ success: true, data: { isRead: true } });
});

module.exports = {
  create, list, remove, getMyNoticeBoard, unreadCount, markRead, dispatchAnnouncement,
};
