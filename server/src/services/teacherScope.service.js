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

module.exports = { getTeacherClassIds };
