const { Teacher, Class, TeacherSubjectAssignment } = require('../models');

// Returns the class ids a teacher user is allowed to act on:
// their homeroom classes plus any class they have a subject assignment in.
const getTeacherClassIds = async (userId) => {
  const teacher = await Teacher.findOne({ userId });
  if (!teacher) return { teacherId: null, classIds: [] };

  const [homerooms, assignments] = await Promise.all([
    Class.find({ classTeacherId: teacher.id }, { _id: 1 }),
    TeacherSubjectAssignment.find({ teacherId: teacher.id }, { classId: 1 }),
  ]);

  const ids = new Set([
    ...homerooms.map((c) => c.id),
    ...assignments.map((a) => a.classId.toString()),
  ]);
  return { teacherId: teacher.id, classIds: [...ids] };
};

// Whether this teacher user is the homeroom (Form Tutor) teacher of the
// given class -- i.e. Class.classTeacherId points at them. Grants "Master
// Entry": every subject in their own class, not just an explicit
// TeacherSubjectAssignment, plus the daily attendance register and report
// remarks/personal-attribute ratings, which are homeroom-only actions.
const isHomeroomTeacher = async (userId, classId) => {
  const teacher = await Teacher.findOne({ userId });
  if (!teacher) return false;
  const classRow = await Class.findById(classId, { classTeacherId: 1 });
  return Boolean(classRow?.classTeacherId?.toString() === teacher.id);
};

// Whether this teacher user has a TeacherSubjectAssignment for this exact
// (classId, subjectId) pair. Term-agnostic on purpose: an assignment with a
// null academicTermId means "every term" (same reading already used by
// teacherSubmissionStatus.service.js's teacher/class/subject join).
const hasSubjectAssignment = async (userId, classId, subjectId) => {
  const teacher = await Teacher.findOne({ userId });
  if (!teacher) return false;
  const assignment = await TeacherSubjectAssignment.findOne({ teacherId: teacher.id, classId, subjectId });
  return Boolean(assignment);
};

module.exports = { getTeacherClassIds, isHomeroomTeacher, hasSubjectAssignment };
