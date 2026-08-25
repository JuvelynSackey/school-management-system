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

describe('GET /guardians/list', () => {
  test('admin sees every guardian, with linked students and portal login status', async () => {
    const school = await fixtures.createSchool(models);
    const classRow = await fixtures.createClass(models, school._id);
    const { student } = await fixtures.createStudent(models, school._id, { classId: classRow.id });
    const { guardian } = await fixtures.createParentWithChild(models, school._id, student.id);

    const { password } = await fixtures.createAdmin(models, school._id, { email: 'admin@guardians-test.local' });
    const token = await fixtures.login(app, school.slug, 'admin@guardians-test.local', password);

    const res = await request(app).get('/api/guardians/list').set(fixtures.authHeader(token));

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].id).toBe(guardian.id);
    expect(res.body.data[0].hasLogin).toBe(true);
    expect(res.body.data[0].loginStatus).toBe('active');
    expect(res.body.data[0].students).toEqual([
      expect.objectContaining({ studentId: student.id, contactPriority: 'primary', isPickupAuthorized: true }),
    ]);
  });

  test('a guardian with no portal login reports hasLogin: false', async () => {
    const school = await fixtures.createSchool(models);
    const classRow = await fixtures.createClass(models, school._id);
    const { student } = await fixtures.createStudent(models, school._id, { classId: classRow.id });
    const { Guardian, StudentGuardian } = models;
    const { runWithSchool } = require('../src/middleware/tenantContext');
    const guardian = await runWithSchool(school._id, () => Guardian.create({
      schoolId: school._id, fullName: 'No Login Guardian', phone: '0501234999',
    }));
    await runWithSchool(school._id, () => StudentGuardian.create({ schoolId: school._id, studentId: student.id, guardianId: guardian.id }));

    const { password } = await fixtures.createAdmin(models, school._id, { email: 'admin2@guardians-test.local' });
    const token = await fixtures.login(app, school.slug, 'admin2@guardians-test.local', password);

    const res = await request(app).get('/api/guardians/list').set(fixtures.authHeader(token));
    expect(res.body.data[0].hasLogin).toBe(false);
    expect(res.body.data[0].loginStatus).toBeNull();
  });

  test('a teacher only sees guardians of students in their own classes', async () => {
    const school = await fixtures.createSchool(models);
    const myClass = await fixtures.createClass(models, school._id);
    const otherClass = await fixtures.createClass(models, school._id);
    const { student: myStudent } = await fixtures.createStudent(models, school._id, { classId: myClass.id });
    const { student: otherStudent } = await fixtures.createStudent(models, school._id, { classId: otherClass.id });
    await fixtures.createParentWithChild(models, school._id, myStudent.id);
    await fixtures.createParentWithChild(models, school._id, otherStudent.id);

    const { teacher, password } = await fixtures.createTeacher(models, school._id, { email: 'teacher@guardians-test.local' });
    await fixtures.assignTeacherToClass(models, school._id, {
      teacherId: teacher.id, subjectId: (await fixtures.createSubject(models, school._id)).id, classId: myClass.id,
    });
    const token = await fixtures.login(app, school.slug, 'teacher@guardians-test.local', password);

    const res = await request(app).get('/api/guardians/list').set(fixtures.authHeader(token));
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].students[0].studentId).toBe(myStudent.id);
  });
});
