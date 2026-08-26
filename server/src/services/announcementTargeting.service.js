const {
  Student, StudentGuardian, Teacher, TeacherSubjectAssignment, Class, Guardian,
} = require('../models');
const { getParentStudentIds } = require('./parentScope.service');
const { getTeacherClassIds } = require('./teacherScope.service');

// Teachers assigned to (homeroom OR subject-assignment in) any of the given
// classIds — the same "which teachers can see this class" definition
// teacherScope.service.js uses per-teacher, just resolved for a set of
// classes instead of a set of teacher assignments.
const getTeacherIdsForClasses = async (classIds) => {
  const [homerooms, assignments] = await Promise.all([
    Class.find({ _id: { $in: classIds }, classTeacherId: { $ne: null } }, { classTeacherId: 1 }),
    TeacherSubjectAssignment.find({ classId: { $in: classIds } }, { teacherId: 1 }),
  ]);
  const ids = new Set([
    ...homerooms.map((c) => c.classTeacherId.toString()),
    ...assignments.map((a) => a.teacherId.toString()),
  ]);
  return [...ids];
};

const getActiveStudentIdsForClasses = async (classIds) => {
  const students = await Student.find({ classId: { $in: classIds }, status: 'active' }, { _id: 1 });
  return students.map((s) => s.id);
};

const getGuardianIdsForStudents = async (studentIds) => {
  if (studentIds.length === 0) return [];
  const links = await StudentGuardian.find({ studentId: { $in: studentIds } }, { guardianId: 1 });
  return [...new Set(links.map((l) => l.guardianId.toString()))];
};

// One definition of "can this user see this announcement on their notice
// board", shared by getMyNoticeBoard/unreadCount (via resolveNoticeBoardWhere
// in announcements.controller.js) and countIntendedRecipients below — so the
// two can never quietly drift out of sync with each other.
const resolveNoticeBoardMatchForRole = async (user) => {
  if (user.role === 'teacher') {
    const { classIds, teacherId } = await getTeacherClassIds(user.id);
    return {
      $or: [
        { targetType: 'school' },
        { targetType: 'class', targetClassId: { $in: classIds } },
        { targetType: 'all_teachers' },
        { targetType: 'specific_teachers', targetTeacherIds: teacherId },
        { targetType: 'specific_classes', targetClassIds: { $in: classIds } },
      ],
    };
  }
  if (user.role === 'student') {
    const student = await Student.findOne({ userId: user.id });
    if (!student) return null;
    return {
      $or: [
        { targetType: 'school' },
        { targetType: 'class', targetClassId: student.classId },
        { targetType: 'student', targetStudentId: student.id },
        { targetType: 'specific_students', targetStudentIds: student.id },
        { targetType: 'specific_classes', targetClassIds: student.classId },
      ],
    };
  }
  if (user.role === 'parent') {
    const { guardianId, studentIds } = await getParentStudentIds(user.id);
    const children = await Student.find({ _id: { $in: studentIds } }, { classId: 1 });
    const classIds = children.map((c) => c.classId).filter(Boolean);
    return {
      $or: [
        { targetType: 'school' },
        { targetType: 'class', targetClassId: { $in: classIds } },
        { targetType: 'student', targetStudentId: { $in: studentIds } },
        { targetType: 'all_parents' },
        { targetType: 'specific_parents', targetGuardianIds: guardianId },
        { targetType: 'specific_students', targetStudentIds: { $in: studentIds } },
        { targetType: 'specific_classes', targetClassIds: { $in: classIds } },
      ],
    };
  }
  return undefined; // admin — not a notice-board consumer
};

// Total intended audience size for an already-created announcement — the
// denominator behind the admin-facing "15/18 read" count. Deliberately
// counts USERS who would see it (active portal logins only), matching what
// readBy can actually contain, not raw student/guardian record counts.
const countIntendedRecipients = async (models, announcement) => {
  const { User } = models;
  const {
    targetType, targetClassId, targetStudentId, targetClassIds, targetTeacherIds, targetStudentIds, targetGuardianIds,
  } = announcement;

  const countUsersFor = async (studentIds, { includeStudents = true, includeGuardians = true } = {}) => {
    let total = 0;
    if (includeStudents && studentIds.length > 0) {
      const students = await Student.find({ _id: { $in: studentIds } }, { userId: 1 });
      total += (await User.countDocuments({ _id: { $in: students.map((s) => s.userId) }, status: 'active' }));
    }
    if (includeGuardians && studentIds.length > 0) {
      const guardianIds = await getGuardianIdsForStudents(studentIds);
      if (guardianIds.length > 0) {
        const guardians = await Guardian.find({ _id: { $in: guardianIds }, userId: { $ne: null } }, { userId: 1 });
        total += (await User.countDocuments({ _id: { $in: guardians.map((g) => g.userId) }, status: 'active' }));
      }
    }
    return total;
  };

  if (targetType === 'school') {
    return User.countDocuments({ role: { $in: ['teacher', 'student', 'parent'] }, status: 'active' });
  }
  if (targetType === 'class') {
    const studentIds = await getActiveStudentIdsForClasses([targetClassId]);
    const teacherIds = await getTeacherIdsForClasses([targetClassId]);
    const teachers = await Teacher.find({ _id: { $in: teacherIds } }, { userId: 1 });
    const teacherUserCount = await User.countDocuments({ _id: { $in: teachers.map((t) => t.userId) }, status: 'active' });
    return teacherUserCount + (await countUsersFor(studentIds));
  }
  if (targetType === 'student') {
    return countUsersFor([targetStudentId]);
  }
  if (targetType === 'all_teachers') {
    const teachers = await Teacher.find({ status: 'active' }, { userId: 1 });
    return User.countDocuments({ _id: { $in: teachers.map((t) => t.userId) }, status: 'active' });
  }
  if (targetType === 'all_parents') {
    const guardians = await Guardian.find({ userId: { $ne: null } }, { userId: 1 });
    return User.countDocuments({ _id: { $in: guardians.map((g) => g.userId) }, status: 'active' });
  }
  if (targetType === 'specific_teachers') {
    const teachers = await Teacher.find({ _id: { $in: targetTeacherIds } }, { userId: 1 });
    return User.countDocuments({ _id: { $in: teachers.map((t) => t.userId) }, status: 'active' });
  }
  if (targetType === 'specific_students') {
    return countUsersFor(targetStudentIds);
  }
  if (targetType === 'specific_parents') {
    const guardians = await Guardian.find({ _id: { $in: targetGuardianIds }, userId: { $ne: null } }, { userId: 1 });
    return User.countDocuments({ _id: { $in: guardians.map((g) => g.userId) }, status: 'active' });
  }
  if (targetType === 'specific_classes') {
    const studentIds = await getActiveStudentIdsForClasses(targetClassIds);
    const teacherIds = await getTeacherIdsForClasses(targetClassIds);
    const teachers = await Teacher.find({ _id: { $in: teacherIds } }, { userId: 1 });
    const teacherUserCount = await User.countDocuments({ _id: { $in: teachers.map((t) => t.userId) }, status: 'active' });
    return teacherUserCount + (await countUsersFor(studentIds));
  }
  return 0;
};

module.exports = {
  getTeacherIdsForClasses,
  getActiveStudentIdsForClasses,
  getGuardianIdsForStudents,
  resolveNoticeBoardMatchForRole,
  countIntendedRecipients,
};
