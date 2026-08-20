const {
  Student, StudentGuardian, User, Class, Teacher,
} = require('../models');

// Resolves the guardians of whichever students an announcement/notification
// targets — the realistic audience for SMS/WhatsApp/email school
// communication, not the students'/teachers' own logins. Extracted from
// announcements.controller.js so the results/terminal-reports workflow can
// reuse the exact same lookup instead of duplicating it.
const resolveGuardianRecipients = async ({ targetType, targetClassId, targetStudentId }) => {
  let studentIds;
  if (targetType === 'student') {
    studentIds = [targetStudentId];
  } else if (targetType === 'class') {
    const students = await Student.find({ classId: targetClassId, status: 'active' }, { _id: 1 });
    studentIds = students.map((s) => s.id);
  } else {
    const students = await Student.find({ status: 'active' }, { _id: 1 });
    studentIds = students.map((s) => s.id);
  }
  if (studentIds.length === 0) return [];

  const links = await StudentGuardian.find({ studentId: { $in: studentIds } }).populate('guardian');
  const byId = new Map();
  links.forEach((l) => { if (l.guardian) byId.set(l.guardian.id, l.guardian); });
  return [...byId.values()];
};

// Every admin User at a school — the audience for "a teacher submitted
// something for review" notifications.
const getSchoolAdminEmails = async (schoolId) => {
  const admins = await User.find({ schoolId, role: 'admin', status: 'active' }, { email: 1 });
  return admins.filter((a) => a.email).map((a) => ({ email: a.email }));
};

// The homeroom teacher of a class, if any and if they have portal login —
// the audience for "your class's report/sheet was rejected" notifications.
const getClassTeacherRecipient = async (classId) => {
  const classRow = await Class.findById(classId);
  if (!classRow?.classTeacherId) return [];
  const teacher = await Teacher.findById(classRow.classTeacherId);
  if (!teacher) return [];
  const user = await User.findById(teacher.userId);
  return user?.email ? [{ email: user.email }] : [];
};

// A student's guardians plus their own portal login (if they have one) —
// the audience for "a report card was published" notifications.
const getStudentAndGuardianRecipients = async (studentId) => {
  const guardians = await resolveGuardianRecipients({ targetType: 'student', targetStudentId: studentId });
  const student = await Student.findById(studentId);
  const studentUser = student?.userId ? await User.findById(student.userId) : null;
  const recipients = guardians.map((g) => ({ email: g.email })).filter((r) => r.email);
  if (studentUser?.email) recipients.push({ email: studentUser.email });
  return recipients;
};

module.exports = {
  resolveGuardianRecipients, getSchoolAdminEmails, getClassTeacherRecipient, getStudentAndGuardianRecipients,
};
