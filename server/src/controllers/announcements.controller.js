const { Announcement, Student } = require('../models');
const asyncHandler = require('../middleware/asyncHandler');
const AppError = require('../utils/AppError');
const { getTeacherClassIds } = require('../services/teacherScope.service');
const { getParentStudentIds } = require('../services/parentScope.service');
const { resolveGuardianRecipients } = require('../services/guardianRecipients.service');
const notifications = require('../services/notifications.service');

const populateForDisplay = (query) => query
  .populate('targetClass', 'name section')
  .populate('targetStudent', 'firstName lastName')
  .populate('creator', 'fullName');

// POST /announcements { message, targetType, targetClassId?, targetStudentId?, category?, channels? }
const create = asyncHandler(async (req, res, next) => {
  const { message, targetType, targetClassId, targetStudentId, category, channels } = req.body;

  if (targetType === 'class' && !targetClassId) {
    return next(new AppError('targetClassId is required when targetType is "class"', 400));
  }
  if (targetType === 'student' && !targetStudentId) {
    return next(new AppError('targetStudentId is required when targetType is "student"', 400));
  }

  const requestedChannels = Array.isArray(channels) && channels.length ? channels : ['in_app'];

  const announcement = await Announcement.create({
    message,
    category: category || 'general',
    targetType,
    targetClassId: targetType === 'class' ? targetClassId : null,
    targetStudentId: targetType === 'student' ? targetStudentId : null,
    deliveryStatus: 'logged',
    channels: requestedChannels,
    createdBy: req.user.id,
  });

  const externalChannels = requestedChannels.filter((c) => c !== 'in_app');
  if (externalChannels.length > 0) {
    const recipients = await resolveGuardianRecipients({ targetType, targetClassId, targetStudentId });
    const deliveryLog = await Promise.all(externalChannels.map((channel) => notifications.dispatch({
      channel, message, recipients,
    })));
    announcement.deliveryLog = deliveryLog;
    announcement.deliveryStatus = deliveryLog.some((d) => d.status === 'sent') ? 'sent' : 'logged';
    await announcement.save();
  }

  const full = await populateForDisplay(Announcement.findById(announcement.id));
  res.status(201).json({ success: true, data: full });
});

// GET /announcements?category=
const list = asyncHandler(async (req, res) => {
  const { category } = req.query;
  const where = {};
  if (category) where.category = category;

  const announcements = await populateForDisplay(Announcement.find(where)).sort({ createdAt: -1 });
  res.json({ success: true, data: announcements });
});

const remove = asyncHandler(async (req, res, next) => {
  const announcement = await Announcement.findById(req.params.id);
  if (!announcement) return next(new AppError('Announcement not found', 404));
  await announcement.deleteOne();
  res.json({ success: true, data: null });
});

// Shared by getMyNoticeBoard and unreadCount — same "what can this user see"
// targeting rule, computed once so the two never drift apart.
const resolveNoticeBoardWhere = async (user) => {
  if (user.role === 'student') {
    const student = await Student.findOne({ userId: user.id });
    if (!student) return null;
    return {
      $or: [
        { targetType: 'school' },
        { targetType: 'class', targetClassId: student.classId },
        { targetType: 'student', targetStudentId: student.id },
      ],
    };
  }
  if (user.role === 'teacher') {
    const { classIds } = await getTeacherClassIds(user.id);
    return {
      $or: [
        { targetType: 'school' },
        { targetType: 'class', targetClassId: { $in: classIds } },
      ],
    };
  }
  if (user.role === 'parent') {
    const { studentIds } = await getParentStudentIds(user.id);
    const children = await Student.find({ _id: { $in: studentIds } }, { classId: 1 });
    const classIds = children.map((c) => c.classId).filter(Boolean);
    return {
      $or: [
        { targetType: 'school' },
        { targetType: 'class', targetClassId: { $in: classIds } },
        { targetType: 'student', targetStudentId: { $in: studentIds } },
      ],
    };
  }
  return undefined; // admin — not a notice-board consumer
};

// GET /announcements/me — the notice board for the logged-in teacher/student/parent
const getMyNoticeBoard = asyncHandler(async (req, res, next) => {
  const where = await resolveNoticeBoardWhere(req.user);
  if (where === undefined) return next(new AppError('Admins should use the full announcement history instead', 400));
  if (where === null) return next(new AppError('Student profile not found', 404));

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
  const where = await resolveNoticeBoardWhere(req.user);
  if (where === undefined) return next(new AppError('Admins should use the full announcement history instead', 400));
  if (where === null) return res.json({ success: true, data: { count: 0 } });

  const count = await Announcement.countDocuments({
    ...where,
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
  create, list, remove, getMyNoticeBoard, unreadCount, markRead,
};
