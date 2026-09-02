const request = require('supertest');
const { startTestServer, stopTestServer, clearTestDb } = require('./testServer');
const { runWithSchool } = require('../src/middleware/tenantContext');

let app;
let models;
let fixtures;

beforeAll(async () => {
  app = await startTestServer();
  // eslint-disable-next-line global-require
  models = require('../src/models');
  // eslint-disable-next-line global-require
  fixtures = require('./fixtures');
});
afterAll(stopTestServer);
afterEach(clearTestDb);

const setup = async (emailSuffix) => {
  const school = await fixtures.createSchool(models);
  const { password } = await fixtures.createAdmin(models, school._id, { email: `admin-${emailSuffix}@dq-test.local` });
  const token = await fixtures.login(app, school.slug, `admin-${emailSuffix}@dq-test.local`, password);
  return { school, token };
};

const getReport = (token) => request(app).get('/api/analytics/data-quality').set(fixtures.authHeader(token));

const findCategory = (res, key) => res.body.data.categories.find((c) => c.key === key);

describe('GET /analytics/data-quality', () => {
  test('is admin-only', async () => {
    const { school } = await setup('role');
    const { user: teacherUser, password } = await fixtures.createTeacher(models, school._id, { email: 'teacher@dq-test.local' });
    const token = await fixtures.login(app, school.slug, teacherUser.email, password);
    const res = await getReport(token);
    expect(res.status).toBe(403);
  });

  test('an empty school reports a clean 100% score, not a divide-by-zero error', async () => {
    const { token } = await setup('empty');
    const res = await getReport(token);
    expect(res.status).toBe(200);
    expect(res.body.data.overallScore).toBe(100);
    res.body.data.categories.forEach((c) => {
      expect(c.total).toBe(0);
      expect(c.count).toBe(0);
    });
  });

  test('flags an active student missing a date of birth, but not one with it set', async () => {
    const { school, token } = await setup('dob');
    const classRow = await fixtures.createClass(models, school._id);
    const { student: missing } = await fixtures.createStudent(models, school._id, { classId: classRow.id, overrides: { dateOfBirth: null } });
    await fixtures.createStudent(models, school._id, { classId: classRow.id, overrides: { dateOfBirth: '2010-01-01' } });

    const res = await getReport(token);
    const cat = findCategory(res, 'students_missing_dob');
    expect(cat.total).toBe(2);
    expect(cat.count).toBe(1);
    expect(cat.items.map((i) => i.id)).toEqual([missing.id]);
  });

  test('flags a student missing hometown or region', async () => {
    const { school, token } = await setup('hometown');
    const classRow = await fixtures.createClass(models, school._id);
    const { student: missing } = await fixtures.createStudent(models, school._id, { classId: classRow.id, overrides: { hometown: null, region: null } });
    await fixtures.createStudent(models, school._id, { classId: classRow.id, overrides: { hometown: 'Kumasi', region: 'Ashanti Region' } });

    const res = await getReport(token);
    const cat = findCategory(res, 'students_missing_hometown_region');
    expect(cat.count).toBe(1);
    expect(cat.items[0].id).toBe(missing.id);
  });

  test('flags a student with no guardian link, excludes one with a linked parent', async () => {
    const { school, token } = await setup('guardian-link');
    const classRow = await fixtures.createClass(models, school._id);
    const { student: unlinked } = await fixtures.createStudent(models, school._id, { classId: classRow.id });
    const { student: linked } = await fixtures.createStudent(models, school._id, { classId: classRow.id });
    await fixtures.createParentWithChild(models, school._id, linked.id);

    const res = await getReport(token);
    const cat = findCategory(res, 'students_without_guardian_link');
    expect(cat.total).toBe(2);
    expect(cat.count).toBe(1);
    expect(cat.items[0].id).toBe(unlinked.id);
  });

  test('flags a teacher with no subject assignment and no homeroom class, excludes one with either', async () => {
    const { school, token } = await setup('teacher-unassigned');
    const classRow = await fixtures.createClass(models, school._id);
    const subject = await fixtures.createSubject(models, school._id);
    const { teacher: idle } = await fixtures.createTeacher(models, school._id, { email: 'idle@dq-test.local' });
    const { teacher: assigned } = await fixtures.createTeacher(models, school._id, { email: 'assigned@dq-test.local' });
    await fixtures.assignTeacherToClass(models, school._id, { teacherId: assigned.id, subjectId: subject.id, classId: classRow.id });
    const { teacher: homeroom } = await fixtures.createTeacher(models, school._id, { email: 'homeroom@dq-test.local' });
    await fixtures.createClass(models, school._id, { classTeacherId: homeroom.id });

    const res = await getReport(token);
    const cat = findCategory(res, 'teachers_unassigned');
    expect(cat.total).toBe(3);
    expect(cat.items.map((i) => i.id)).toEqual([idle.id]);
  });

  test('flags a class with no homeroom teacher', async () => {
    const { school, token } = await setup('homeroom');
    const { teacher } = await fixtures.createTeacher(models, school._id, { email: 'homeroom2@dq-test.local' });
    await fixtures.createClass(models, school._id, { name: 'Has Homeroom', classTeacherId: teacher.id });
    const noHomeroom = await fixtures.createClass(models, school._id, { name: 'No Homeroom' });

    const res = await getReport(token);
    const cat = findCategory(res, 'classes_missing_homeroom');
    expect(cat.total).toBe(2);
    expect(cat.items.map((i) => i.id)).toEqual([noHomeroom.id]);
  });

  test('flags a class with no subjects assigned', async () => {
    const { school, token } = await setup('subjects');
    const subject = await fixtures.createSubject(models, school._id);
    const withSubjects = await fixtures.createClass(models, school._id, { name: 'Has Subjects' });
    await fixtures.assignSubjectToClass(models, school._id, { classId: withSubjects.id, subjectId: subject.id });
    const withoutSubjects = await fixtures.createClass(models, school._id, { name: 'No Subjects' });

    const res = await getReport(token);
    const cat = findCategory(res, 'classes_missing_subjects');
    expect(cat.total).toBe(2);
    expect(cat.items.map((i) => i.id)).toEqual([withoutSubjects.id]);
  });

  test('flags a guardian with no portal login, excludes one who has logged in before', async () => {
    const { school, token } = await setup('guardian-login');
    const classRow = await fixtures.createClass(models, school._id);
    const { student: withLoginChild } = await fixtures.createStudent(models, school._id, { classId: classRow.id });
    await fixtures.createParentWithChild(models, school._id, withLoginChild.id);
    const { student: noLoginChild } = await fixtures.createStudent(models, school._id, { classId: classRow.id });
    const { Guardian, StudentGuardian } = models;
    const noLoginGuardian = await runWithSchool(school._id, () => Guardian.create({
      schoolId: school._id, fullName: 'No Login Guardian', phone: '0501234999',
    }));
    await runWithSchool(school._id, () => StudentGuardian.create({ schoolId: school._id, studentId: noLoginChild.id, guardianId: noLoginGuardian.id }));

    const res = await getReport(token);
    const cat = findCategory(res, 'guardians_without_login');
    expect(cat.total).toBe(2);
    expect(cat.items.map((i) => i.id)).toEqual([noLoginGuardian.id]);
  });

  test('flags a JHS 3 student missing a WAEC index number, and ignores non-JHS-3 classes entirely', async () => {
    const { school, token } = await setup('waec');
    const jhs3 = await fixtures.createClass(models, school._id, { name: 'JHS 3', gradeLevel: 'JHS 3', levelOrder: 13 });
    const basic6 = await fixtures.createClass(models, school._id, { name: 'Basic 6' });
    const { student: missingIndex } = await fixtures.createStudent(models, school._id, { classId: jhs3.id });
    await fixtures.createStudent(models, school._id, { classId: jhs3.id, overrides: { waecIndexNumber: '4012345099' } });
    // A Basic 6 student with no WAEC index is normal, not a data-quality issue.
    await fixtures.createStudent(models, school._id, { classId: basic6.id });

    const res = await getReport(token);
    const cat = findCategory(res, 'jhs3_missing_waec_index');
    expect(cat.total).toBe(2);
    expect(cat.items.map((i) => i.id)).toEqual([missingIndex.id]);
  });

  test('never leaks another school\'s flagged records into this school\'s report', async () => {
    const { school: schoolA, token: tokenA } = await setup('tenant-a');
    const { school: schoolB } = await setup('tenant-b');
    const classA = await fixtures.createClass(models, schoolA._id);
    const classB = await fixtures.createClass(models, schoolB._id);
    await fixtures.createStudent(models, schoolA._id, { classId: classA.id, overrides: { dateOfBirth: null } });
    await fixtures.createStudent(models, schoolB._id, { classId: classB.id, overrides: { dateOfBirth: null } });

    const res = await getReport(tokenA);
    const cat = findCategory(res, 'students_missing_dob');
    expect(cat.count).toBe(1);
  });

  test('overallScore reflects a mix of clean and flagged categories, not just pass/fail', async () => {
    const { school, token } = await setup('score');
    const classRow = await fixtures.createClass(models, school._id);
    // One flagged student out of two -- every other category stays clean (0/0).
    await fixtures.createStudent(models, school._id, { classId: classRow.id, overrides: { dateOfBirth: null } });
    await fixtures.createStudent(models, school._id, { classId: classRow.id, overrides: { dateOfBirth: '2010-01-01' } });

    const res = await getReport(token);
    expect(res.body.data.overallScore).toBeGreaterThan(0);
    expect(res.body.data.overallScore).toBeLessThan(100);
  });
});
