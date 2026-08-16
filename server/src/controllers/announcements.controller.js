const { Announcement, Student } = require('../models');
const asyncHandler = require('../middleware/asyncHandler');
const AppError = require('../utils/AppError');
const { getTeacherClassIds } = require('../services/teacherScope.service');

const populateForDisplay = (query) => query
  .populate('targetClass', 'name section')
  .populate('targetStudent', 'firstName lastName')
  .populate('creator', 'fullName');

// POST /announcements { message, targetType, targetClassId?, targetStudentId?, category? }
const create = asyncHandler(async (req, res, next) => {
  const { message, targetType, targetClassId, targetStudentId, category } = req.body;

  if (targetType === 'class' && !targetClassId) {
    return next(new AppError('targetClassId is required when targetType is "class"', 400));
  }
  if (targetType === 'student' && !targetStudentId) {
    return next(new AppError('targetStudentId is required when targetType is "student"', 400));
  }

  const announcement = await Announcement.create({
    message,
    category: category || 'general',
    targetType,
    targetClassId: targetType === 'class' ? targetClassId : null,
    targetStudentId: targetType === 'student' ? targetStudentId : null,
    deliveryStatus: 'logged',
    createdBy: req.user.id,
  });

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

// GET /announcements/me — the notice board for the logged-in teacher/student
const getMyNoticeBoard = asyncHandler(async (req, res, next) => {
  let where;

  if (req.user.role === 'student') {
    const student = await Student.findOne({ userId: req.user.id });
    if (!student) return next(new AppError('Student profile not found', 404));
    where = {
      $or: [
        { targetType: 'school' },
        { targetType: 'class', targetClassId: student.classId },
        { targetType: 'student', targetStudentId: student.id },
      ],
    };
  } else if (req.user.role === 'teacher') {
    const { classIds } = await getTeacherClassIds(req.user.id);
    where = {
      $or: [
        { targetType: 'school' },
        { targetType: 'class', targetClassId: { $in: classIds } },
      ],
    };
  } else {
    return next(new AppError('Admins should use the full announcement history instead', 400));
  }

  const announcements = await populateForDisplay(Announcement.find(where)).sort({ createdAt: -1 });
  res.json({ success: true, data: announcements });
});

module.exports = { create, list, remove, getMyNoticeBoard };
