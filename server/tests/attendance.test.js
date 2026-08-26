const request = require('supertest');
const { startTestServer, stopTestServer, clearTestDb } = require('./testServer');

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

// A class with a homeroom teacher and a separate subject-only teacher, so
// the daily-register write boundary can be tested from both sides.
const setupClassroomWithTwoTeachers = async (schoolId) => {
  const { teacher: homeroomTeacher, user: homeroomUser, password: homeroomPassword } = await fixtures.createTeacher(models, schoolId);
  const classRow = await fixtures.createClass(models, schoolId, { classTeacherId: homeroomTeacher.id });
  const subject = await fixtures.createSubject(models, schoolId);
  await fixtures.assignSubjectToClass(models, schoolId, { classId: classRow.id, subjectId: subject.id });

  const { teacher: subjectTeacher, user: subjectUser, password: subjectPassword } = await fixtures.createTeacher(models, schoolId);
  await fixtures.assignTeacherToClass(models, schoolId, { teacherId: subjectTeacher.id, subjectId: subject.id, classId: classRow.id });

  const { student } = await fixtures.createStudent(models, schoolId, { classId: classRow.id });
  return {
    classRow, subject, student, homeroomUser, homeroomPassword, subjectUser, subjectPassword,
  };
};

describe('Daily attendance register — homeroom-teacher write boundary', () => {
  test('the homeroom teacher can record the daily register', async () => {
    const school = await fixtures.createSchool(models);
    const { classRow, student, homeroomUser, homeroomPassword } = await setupClassroomWithTwoTeachers(school._id);
    const token = await fixtures.login(app, school.slug, homeroomUser.email, homeroomPassword);

    const res = await request(app).post('/api/attendance/bulk').set(fixtures.authHeader(token)).send({
      classId: classRow.id, date: '2026-01-05', records: [{ studentId: student.id, status: 'Present' }],
    });
    expect(res.status).toBe(200);
  });

  test('a subject-only teacher (not the homeroom teacher) cannot record the daily register', async () => {
    const school = await fixtures.createSchool(models);
    const { classRow, student, subjectUser, subjectPassword } = await setupClassroomWithTwoTeachers(school._id);
    const token = await fixtures.login(app, school.slug, subjectUser.email, subjectPassword);

    const res = await request(app).post('/api/attendance/bulk').set(fixtures.authHeader(token)).send({
      classId: classRow.id, date: '2026-01-05', records: [{ studentId: student.id, status: 'Present' }],
    });
    expect(res.status).toBe(403);
  });

  test('a subject-only teacher can still VIEW the register (read-only)', async () => {
    const school = await fixtures.createSchool(models);
    const { classRow, subjectUser, subjectPassword } = await setupClassroomWithTwoTeachers(school._id);
    const token = await fixtures.login(app, school.slug, subjectUser.email, subjectPassword);

    const res = await request(app).get('/api/attendance').query({ classId: classRow.id, date: '2026-01-05' }).set(fixtures.authHeader(token));
    expect(res.status).toBe(200);
  });

  test('an admin can always record the daily register', async () => {
    const school = await fixtures.createSchool(models);
    const { classRow, student } = await setupClassroomWithTwoTeachers(school._id);
    const { password } = await fixtures.createAdmin(models, school._id, { email: 'admin@attendance-test.local' });
    const token = await fixtures.login(app, school.slug, 'admin@attendance-test.local', password);

    const res = await request(app).post('/api/attendance/bulk').set(fixtures.authHeader(token)).send({
      classId: classRow.id, date: '2026-01-05', records: [{ studentId: student.id, status: 'Present' }],
    });
    expect(res.status).toBe(200);
  });
});
