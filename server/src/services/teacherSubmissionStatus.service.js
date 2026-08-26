const {
  TeacherSubjectAssignment, ResultSheet, Teacher, Class, Subject,
} = require('../models');
const { UNRANKED_LEVEL_ORDER } = require('../constants/gradeLevels');

// Distinct teachers with at least one assignment whose result sheet for the
// given term is still Draft/Rejected (or doesn't exist yet). Shared by the
// admin dashboard's Action Center count and Ask JesManage's "which teachers
// have unsubmitted marksheets" query, so the two can never quietly report
// different numbers for the same thing. TeacherSubjectAssignment uses a
// null academicTermId to mean "every term", so this join is purely by
// (classId, subjectId), not term-qualified on the assignment side.
const getTeachersWithUnsubmittedMarksheets = async (academicTermId) => {
  if (!academicTermId) return [];
  const [assignments, sheets] = await Promise.all([
    TeacherSubjectAssignment.find({}, { teacherId: 1, classId: 1, subjectId: 1 }),
    ResultSheet.find({ academicTermId }, { classId: 1, subjectId: 1, status: 1 }),
  ]);
  const statusByPair = new Map(sheets.map((s) => [`${s.classId}:${s.subjectId}`, s.status]));

  const pendingByTeacher = new Map();
  assignments.forEach((a) => {
    const status = statusByPair.get(`${a.classId}:${a.subjectId}`);
    if (!status || status === 'Draft' || status === 'Rejected') {
      const key = a.teacherId.toString();
      if (!pendingByTeacher.has(key)) pendingByTeacher.set(key, []);
      pendingByTeacher.get(key).push({ classId: a.classId.toString(), subjectId: a.subjectId.toString() });
    }
  });

  const teacherIds = [...pendingByTeacher.keys()];
  if (teacherIds.length === 0) return [];

  const [teachers, classes, subjects] = await Promise.all([
    Teacher.find({ _id: { $in: teacherIds } }, { firstName: 1, lastName: 1 }),
    Class.find({}, { name: 1, section: 1, levelOrder: 1 }),
    Subject.find({}, { name: 1 }),
  ]);
  const classById = new Map(classes.map((c) => [c.id, {
    label: `${c.name} ${c.section || ''}`.trim(), levelOrder: c.levelOrder ?? UNRANKED_LEVEL_ORDER,
  }]));
  const subjectById = new Map(subjects.map((s) => [s.id, s.name]));

  return teachers.map((t) => ({
    teacherId: t.id,
    name: `${t.firstName} ${t.lastName}`,
    pending: (pendingByTeacher.get(t.id) || [])
      .map((p) => ({
        className: classById.get(p.classId)?.label || 'Unknown class',
        levelOrder: classById.get(p.classId)?.levelOrder ?? UNRANKED_LEVEL_ORDER,
        subjectName: subjectById.get(p.subjectId) || 'Unknown subject',
      }))
      .sort((a, b) => a.levelOrder - b.levelOrder)
      .map(({ levelOrder, ...rest }) => rest),
  }));
};

module.exports = { getTeachersWithUnsubmittedMarksheets };
