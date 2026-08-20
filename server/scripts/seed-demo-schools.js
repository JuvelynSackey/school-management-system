// Seeds two demo schools, each with a JHS 3 class of the same name, an
// admin, a teacher assigned to that class, and a small roster of students
// with WAEC-export-ready fields set — for the capstone cross-tenant
// isolation demo (two schools, identically-named classes, provably
// separate data) and the WAEC export demo (no missing-field blockers).
// Idempotent: safe to re-run — skips a school whose slug already exists.
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { mongoose, connect } = require('../src/config/database');
const { runWithSchool } = require('../src/middleware/tenantContext');
const {
  School, SchoolSettings, User, Teacher, AcademicTerm, Class, Subject, TeacherSubjectAssignment, Student,
} = require('../src/models');
const { seedSchoolDefaults } = require('../src/services/schoolOnboarding.service');
const { createStudentAccount } = require('../src/services/studentEnrollment.service');

const DEMO_PASSWORD = 'Demo@1234';

const STUDENT_ROSTER = [
  { firstName: 'Ama', lastName: 'Boateng', gender: 'Female', dateOfBirth: '2009-03-14', waecIndexNumber: '4012345001' },
  { firstName: 'Kwame', lastName: 'Owusu', gender: 'Male', dateOfBirth: '2009-06-22', waecIndexNumber: '4012345002' },
  { firstName: 'Efua', lastName: 'Mensah', gender: 'Female', dateOfBirth: '2009-01-30', waecIndexNumber: '4012345003' },
  { firstName: 'Kojo', lastName: 'Asante', gender: 'Male', dateOfBirth: '2009-09-11', waecIndexNumber: '4012345004' },
  { firstName: 'Abena', lastName: 'Darko', gender: 'Female', dateOfBirth: '2009-04-05', waecIndexNumber: '4012345005' },
];

const seedOneSchool = async ({
  name, slug, adminEmail, teacherEmail,
}) => {
  const existing = await School.findOne({ slug });
  if (existing) {
    console.log(`  Skipping ${name} — a school with slug "${slug}" already exists (id ${existing.id}).`);
    return;
  }

  const school = await School.create({ name, slug, status: 'active' });
  await runWithSchool(school._id, async () => SchoolSettings.create({ schoolId: school._id, name }));

  await seedSchoolDefaults(school._id, 'jhs_only');

  const jhs3 = await runWithSchool(school._id, async () => Class.findOne({ schoolId: school._id, name: 'JHS 3' }));
  const mathSubject = await runWithSchool(school._id, async () => Subject.findOne({ schoolId: school._id, code: 'MATH' }));

  const term = await runWithSchool(school._id, async () => AcademicTerm.create({
    schoolId: school._id, name: '2025/2026 Term 1', academicYear: '2025/2026', termNumber: 1, isCurrent: true, startDate: new Date('2025-09-08'),
  }));

  const adminPasswordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  await runWithSchool(school._id, async () => User.create({
    schoolId: school._id, email: adminEmail, passwordHash: adminPasswordHash, fullName: 'Demo Admin', role: 'admin', status: 'active', mustChangePassword: false,
  }));

  const teacherPasswordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const teacherUser = await runWithSchool(school._id, async () => User.create({
    schoolId: school._id, email: teacherEmail, passwordHash: teacherPasswordHash, fullName: 'Demo Teacher', role: 'teacher', status: 'active', mustChangePassword: false,
  }));
  const teacher = await runWithSchool(school._id, async () => Teacher.create({
    schoolId: school._id, userId: teacherUser.id, staffNo: `T-DEMO-${slug}`, firstName: 'Demo', lastName: 'Teacher', status: 'active',
  }));
  await runWithSchool(school._id, async () => TeacherSubjectAssignment.create({
    schoolId: school._id, teacherId: teacher._id, subjectId: mathSubject._id, classId: jhs3._id, academicTermId: null,
  }));

  // createStudentAccount never takes a schoolId parameter — in the real app
  // it always runs inside an Express request already wrapped in
  // authenticate middleware's runWithSchool(), so it relies entirely on
  // that ambient context rather than opening its own. This script has no
  // such ambient wrapping, so each call needs its own explicit one.
  for (const s of STUDENT_ROSTER) {
    const { student } = await runWithSchool(school._id, async () => createStudentAccount({
      email: `${s.firstName.toLowerCase()}.${s.lastName.toLowerCase()}@${slug}.local`,
      admissionNo: `${slug.toUpperCase()}-${s.waecIndexNumber.slice(-4)}`,
      firstName: s.firstName,
      lastName: s.lastName,
      gender: s.gender,
      dateOfBirth: s.dateOfBirth,
      classId: jhs3.id,
    }));
    await runWithSchool(school._id, async () => User.updateOne({ _id: student.userId }, { $set: { passwordHash: adminPasswordHash } }));
    await runWithSchool(school._id, async () => Student.updateOne(
      { _id: student._id },
      { $set: { waecIndexNumber: s.waecIndexNumber } },
    ));
  }

  console.log(`  Created ${name} (${slug}): admin=${adminEmail} teacher=${teacherEmail} password="${DEMO_PASSWORD}" — ${STUDENT_ROSTER.length} students in JHS 3.`);
};

async function main() {
  await connect();
  console.log('Seeding demo schools for the cross-tenant capstone demo...');
  await seedOneSchool({
    name: 'Demo School A', slug: 'demo-school-a', adminEmail: 'admin@demo-school-a.local', teacherEmail: 'teacher@demo-school-a.local',
  });
  await seedOneSchool({
    name: 'Demo School B', slug: 'demo-school-b', adminEmail: 'admin@demo-school-b.local', teacherEmail: 'teacher@demo-school-b.local',
  });
  console.log('Done. Both schools have a class named "JHS 3" for the cross-tenant isolation demo.');
  await mongoose.disconnect();
}

main().catch((err) => { console.error(err); process.exit(1); });
