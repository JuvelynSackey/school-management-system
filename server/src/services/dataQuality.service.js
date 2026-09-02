// Deterministic record-integrity checks for the admin Data Quality Center.
// Every check here is a plain find/count -- no aggregation pipelines --
// so each relies on tenantScopePlugin's ambient schoolId scoping (via the
// request's runWithSchool context) exactly like aiQuery.service.js's
// existing queries, rather than taking a schoolId parameter.
const {
  Student, Teacher, Class, ClassSubject, TeacherSubjectAssignment, Guardian, StudentGuardian,
} = require('../models');
const { runClassesWithoutHomeroomQuery, runGuardiansWithoutLoginQuery } = require('./aiQuery.service');

const ITEM_CAP = 50;
const ACTIVE_STUDENT_FILTER = { status: 'active' };

const round1 = (n) => Math.round(n * 10) / 10;
const studentLabel = (s) => `${s.firstName} ${s.lastName} (${s.admissionNo})`;

const toResult = (total, items) => ({ total, items: items.slice(0, ITEM_CAP) });

const studentsMissingDob = async () => {
  const total = await Student.countDocuments(ACTIVE_STUDENT_FILTER);
  const rows = await Student.find(
    { ...ACTIVE_STUDENT_FILTER, dateOfBirth: { $in: [null, ''] } },
    { firstName: 1, lastName: 1, admissionNo: 1 },
  );
  return toResult(total, rows.map((s) => ({ id: s.id, label: studentLabel(s) })));
};

// hometown/region are collected as one admission-form pair (see
// migration.service.js's parseHometownRegion) so a gap in either counts
// as the same data-quality issue rather than two separate ones.
const studentsMissingHometownRegion = async () => {
  const total = await Student.countDocuments(ACTIVE_STUDENT_FILTER);
  const rows = await Student.find(
    { ...ACTIVE_STUDENT_FILTER, $or: [{ hometown: { $in: [null, ''] } }, { region: null }] },
    { firstName: 1, lastName: 1, admissionNo: 1 },
  );
  return toResult(total, rows.map((s) => ({ id: s.id, label: studentLabel(s) })));
};

const studentsWithoutGuardianLink = async () => {
  const students = await Student.find(ACTIVE_STUDENT_FILTER, { firstName: 1, lastName: 1, admissionNo: 1 });
  const links = await StudentGuardian.find(
    { studentId: { $in: students.map((s) => s.id) } },
    { studentId: 1 },
  );
  const linkedIds = new Set(links.map((l) => l.studentId.toString()));
  const unlinked = students.filter((s) => !linkedIds.has(s.id));
  return toResult(students.length, unlinked.map((s) => ({ id: s.id, label: studentLabel(s) })));
};

// "Unassigned" covers both angles a teacher can be attached to real work:
// a subject/class assignment, or being a class's homeroom teacher.
const teachersUnassigned = async () => {
  const teachers = await Teacher.find({ status: 'active' }, { firstName: 1, lastName: 1, staffNo: 1 });
  const teacherIds = teachers.map((t) => t.id);
  const [assignments, homerooms] = await Promise.all([
    TeacherSubjectAssignment.find({ teacherId: { $in: teacherIds } }, { teacherId: 1 }),
    Class.find({ classTeacherId: { $in: teacherIds } }, { classTeacherId: 1 }),
  ]);
  const assignedIds = new Set([
    ...assignments.map((a) => a.teacherId.toString()),
    ...homerooms.map((c) => c.classTeacherId.toString()),
  ]);
  const unassigned = teachers.filter((t) => !assignedIds.has(t.id));
  return toResult(
    teachers.length,
    unassigned.map((t) => ({ id: t.id, label: `${t.firstName} ${t.lastName} (${t.staffNo})` })),
  );
};

// Reuses the assistant's own already-tested query (aiQuery.service.js) —
// the same "classes with no homeroom teacher" fact, just surfaced here too.
const classesMissingHomeroom = async () => {
  const total = await Class.countDocuments({});
  const rows = await runClassesWithoutHomeroomQuery();
  return toResult(total, rows.map((c) => ({ id: c.classId, label: c.className })));
};

const classesMissingSubjects = async () => {
  const classes = await Class.find({}, { name: 1, section: 1 });
  const links = await ClassSubject.find({ classId: { $in: classes.map((c) => c.id) } }, { classId: 1 });
  const linkedIds = new Set(links.map((l) => l.classId.toString()));
  const unlinked = classes.filter((c) => !linkedIds.has(c.id));
  return toResult(
    classes.length,
    unlinked.map((c) => ({ id: c.id, label: `${c.name} ${c.section || ''}`.trim() })),
  );
};

// Reuses the assistant's own already-tested query for the same reason as
// classesMissingHomeroom above.
const guardiansWithoutLogin = async () => {
  const total = await Guardian.countDocuments({});
  const rows = await runGuardiansWithoutLoginQuery();
  return toResult(total, rows.map((g) => ({ id: g.guardianId, label: g.name })));
};

// waecIndexNumber has no `default: null` (see student.model.js) so an
// unset value is truly absent, not stored as null -- Mongo's `null`
// equality already matches both missing and explicit-null fields, so this
// still catches every unset case without an $exists check.
const jhs3MissingWaecIndex = async () => {
  const jhs3Classes = await Class.find({ gradeLevel: 'JHS 3' }, { _id: 1 });
  const classIds = jhs3Classes.map((c) => c.id);
  if (classIds.length === 0) return toResult(0, []);
  const total = await Student.countDocuments({ ...ACTIVE_STUDENT_FILTER, classId: { $in: classIds } });
  const rows = await Student.find(
    { ...ACTIVE_STUDENT_FILTER, classId: { $in: classIds }, waecIndexNumber: { $in: [null, ''] } },
    { firstName: 1, lastName: 1, admissionNo: 1 },
  );
  return toResult(total, rows.map((s) => ({ id: s.id, label: studentLabel(s) })));
};

const CHECKS = [
  { key: 'students_missing_dob', label: 'Students Missing Date of Birth', scope: 'Students', run: studentsMissingDob },
  { key: 'students_missing_hometown_region', label: 'Students Missing Hometown/Region', scope: 'Students', run: studentsMissingHometownRegion },
  { key: 'students_without_guardian_link', label: 'Students With No Linked Guardian', scope: 'Students', run: studentsWithoutGuardianLink },
  { key: 'teachers_unassigned', label: 'Teachers With No Class or Subject Assignment', scope: 'Staff', run: teachersUnassigned },
  { key: 'classes_missing_homeroom', label: 'Classes With No Homeroom Teacher', scope: 'Academics', run: classesMissingHomeroom },
  { key: 'classes_missing_subjects', label: 'Classes With No Subjects Assigned', scope: 'Academics', run: classesMissingSubjects },
  { key: 'guardians_without_login', label: 'Guardians With No Portal Login', scope: 'Parents', run: guardiansWithoutLogin },
  { key: 'jhs3_missing_waec_index', label: 'JHS 3 Students Missing a WAEC Index Number', scope: 'BECE', run: jhs3MissingWaecIndex },
];

// overallScore: the average, across every check, of that check's own
// "clean rate" (1 when it has nothing to flag, whether because everything
// passed or because its denominator was 0 -- an empty school isn't a dirty
// one). Equally weighted rather than pooled, so one huge category (e.g.
// hundreds of students) can't drown out a small but real gap (e.g. two
// unassigned teachers).
const getDataQualityReport = async () => {
  const results = await Promise.all(CHECKS.map((c) => c.run()));

  const categories = CHECKS.map((check, i) => {
    const { total, items } = results[i];
    const cleanRate = total > 0 ? (total - items.length) / total : 1;
    return {
      key: check.key, label: check.label, scope: check.scope, total, count: items.length, items, cleanRate,
    };
  });

  const overallScore = round1(
    (categories.reduce((sum, c) => sum + c.cleanRate, 0) / categories.length) * 100,
  );

  return {
    generatedAt: new Date().toISOString(),
    overallScore,
    categories: categories.map(({ cleanRate, ...rest }) => rest),
  };
};

module.exports = { getDataQualityReport };
