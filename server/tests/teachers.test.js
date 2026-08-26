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

describe('DELETE /teachers/:id — safe offboarding guard', () => {
  test('refuses to delete a teacher who is the homeroom (Class Teacher) of a class', async () => {
    const school = await fixtures.createSchool(models);
    const { teacher } = await fixtures.createTeacher(models, school._id);
    await fixtures.createClass(models, school._id, { classTeacherId: teacher.id });
    const { password } = await fixtures.createAdmin(models, school._id, { email: 'admin@teachers-test.local' });
    const token = await fixtures.login(app, school.slug, 'admin@teachers-test.local', password);

    const res = await request(app).delete(`/api/teachers/${teacher.id}`).set(fixtures.authHeader(token));
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Cannot delete teacher with active class or subject assignments. Please reassign their classes and deactivate the account instead.');

    const stillExists = await models.Teacher.findById(teacher.id).setOptions({ skipTenantScope: true });
    expect(stillExists).not.toBeNull();
  });

  test('refuses to delete a teacher who has a subject assignment, even with no homeroom class', async () => {
    const school = await fixtures.createSchool(models);
    const classRow = await fixtures.createClass(models, school._id);
    const subject = await fixtures.createSubject(models, school._id);
    const { teacher } = await fixtures.createTeacher(models, school._id);
    await fixtures.assignTeacherToClass(models, school._id, { teacherId: teacher.id, subjectId: subject.id, classId: classRow.id });
    const { password } = await fixtures.createAdmin(models, school._id, { email: 'admin2@teachers-test.local' });
    const token = await fixtures.login(app, school.slug, 'admin2@teachers-test.local', password);

    const res = await request(app).delete(`/api/teachers/${teacher.id}`).set(fixtures.authHeader(token));
    expect(res.status).toBe(400);
  });

  test('allows deleting a teacher with no homeroom class and no subject assignments', async () => {
    const school = await fixtures.createSchool(models);
    const { teacher } = await fixtures.createTeacher(models, school._id);
    const { password } = await fixtures.createAdmin(models, school._id, { email: 'admin3@teachers-test.local' });
    const token = await fixtures.login(app, school.slug, 'admin3@teachers-test.local', password);

    const res = await request(app).delete(`/api/teachers/${teacher.id}`).set(fixtures.authHeader(token));
    expect(res.status).toBe(200);

    const stillExists = await models.Teacher.findById(teacher.id).setOptions({ skipTenantScope: true });
    expect(stillExists).toBeNull();
  });

  test('deactivation is never blocked, regardless of active assignments — it is the safe alternative', async () => {
    const school = await fixtures.createSchool(models);
    const { teacher } = await fixtures.createTeacher(models, school._id);
    await fixtures.createClass(models, school._id, { classTeacherId: teacher.id });
    const { password } = await fixtures.createAdmin(models, school._id, { email: 'admin4@teachers-test.local' });
    const token = await fixtures.login(app, school.slug, 'admin4@teachers-test.local', password);

    const res = await request(app).put(`/api/teachers/${teacher.id}`).set(fixtures.authHeader(token)).send({ status: 'inactive' });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('inactive');

    const user = await models.User.findById(teacher.userId).setOptions({ skipTenantScope: true });
    expect(user.status).toBe('inactive');
  });

  test('a deactivated teacher cannot log in', async () => {
    const school = await fixtures.createSchool(models);
    const { teacher, user, password } = await fixtures.createTeacher(models, school._id);
    const { password: adminPassword } = await fixtures.createAdmin(models, school._id, { email: 'admin5@teachers-test.local' });
    const adminToken = await fixtures.login(app, school.slug, 'admin5@teachers-test.local', adminPassword);

    await request(app).put(`/api/teachers/${teacher.id}`).set(fixtures.authHeader(adminToken)).send({ status: 'inactive' });

    const loginAttempt = await request(app).post('/api/auth/login').send({
      schoolCode: school.slug, identifier: user.email, password,
    });
    expect(loginAttempt.status).not.toBe(200);
  });
});

describe('POST /teachers — atomic onboarding assignments', () => {
  test('setting homeroomClassId makes the new teacher the Class Teacher for that class', async () => {
    const school = await fixtures.createSchool(models);
    const classRow = await fixtures.createClass(models, school._id);
    const { password } = await fixtures.createAdmin(models, school._id, { email: 'admin@teachers-onboard.local' });
    const token = await fixtures.login(app, school.slug, 'admin@teachers-onboard.local', password);

    const res = await request(app).post('/api/teachers').set(fixtures.authHeader(token)).send({
      email: 'new-homeroom@teachers-onboard.local', staffNo: 'T-100', firstName: 'New', lastName: 'Homeroom',
      homeroomClassId: classRow.id,
    });
    expect(res.status).toBe(201);

    const updatedClass = await models.Class.findById(classRow.id).setOptions({ skipTenantScope: true });
    expect(updatedClass.classTeacherId.toString()).toBe(res.body.data.id);
  });

  test('subjectAssignments creates the corresponding TeacherSubjectAssignment records', async () => {
    const school = await fixtures.createSchool(models);
    const classA = await fixtures.createClass(models, school._id);
    const classB = await fixtures.createClass(models, school._id);
    const subject = await fixtures.createSubject(models, school._id);
    const { password } = await fixtures.createAdmin(models, school._id, { email: 'admin2@teachers-onboard.local' });
    const token = await fixtures.login(app, school.slug, 'admin2@teachers-onboard.local', password);

    const res = await request(app).post('/api/teachers').set(fixtures.authHeader(token)).send({
      email: 'new-subject@teachers-onboard.local', staffNo: 'T-101', firstName: 'New', lastName: 'Subject',
      subjectAssignments: [
        { classId: classA.id, subjectId: subject.id },
        { classId: classB.id, subjectId: subject.id },
      ],
    });
    expect(res.status).toBe(201);

    const assignments = await models.TeacherSubjectAssignment.find({ teacherId: res.body.data.id }).setOptions({ skipTenantScope: true });
    expect(assignments).toHaveLength(2);
    expect(assignments.map((a) => a.classId.toString()).sort()).toEqual([classA.id, classB.id].sort());
  });

  test('a duplicate (classId, subjectId) pair in subjectAssignments only creates one assignment', async () => {
    const school = await fixtures.createSchool(models);
    const classRow = await fixtures.createClass(models, school._id);
    const subject = await fixtures.createSubject(models, school._id);
    const { password } = await fixtures.createAdmin(models, school._id, { email: 'admin3@teachers-onboard.local' });
    const token = await fixtures.login(app, school.slug, 'admin3@teachers-onboard.local', password);

    const res = await request(app).post('/api/teachers').set(fixtures.authHeader(token)).send({
      email: 'new-dupe@teachers-onboard.local', staffNo: 'T-102', firstName: 'New', lastName: 'Dupe',
      subjectAssignments: [
        { classId: classRow.id, subjectId: subject.id },
        { classId: classRow.id, subjectId: subject.id },
      ],
    });
    expect(res.status).toBe(201);

    const assignments = await models.TeacherSubjectAssignment.find({ teacherId: res.body.data.id }).setOptions({ skipTenantScope: true });
    expect(assignments).toHaveLength(1);
  });

  test('an invalid homeroomClassId rejects the whole request — no user or teacher is created', async () => {
    const school = await fixtures.createSchool(models);
    const { password } = await fixtures.createAdmin(models, school._id, { email: 'admin4@teachers-onboard.local' });
    const token = await fixtures.login(app, school.slug, 'admin4@teachers-onboard.local', password);
    const fakeClassId = '507f1f77bcf86cd799439011';

    const res = await request(app).post('/api/teachers').set(fixtures.authHeader(token)).send({
      email: 'should-not-exist@teachers-onboard.local', staffNo: 'T-103', firstName: 'Should', lastName: 'Fail',
      homeroomClassId: fakeClassId,
    });
    expect(res.status).toBe(400);

    const user = await models.User.findOne({ email: 'should-not-exist@teachers-onboard.local' }).setOptions({ skipTenantScope: true });
    expect(user).toBeNull();
  });

  test('omitting homeroomClassId and subjectAssignments still works exactly as before', async () => {
    const school = await fixtures.createSchool(models);
    const { password } = await fixtures.createAdmin(models, school._id, { email: 'admin5@teachers-onboard.local' });
    const token = await fixtures.login(app, school.slug, 'admin5@teachers-onboard.local', password);

    const res = await request(app).post('/api/teachers').set(fixtures.authHeader(token)).send({
      email: 'plain@teachers-onboard.local', staffNo: 'T-104', firstName: 'Plain', lastName: 'Teacher',
    });
    expect(res.status).toBe(201);
    expect(res.body.data.tempPassword).toBeDefined();
  });
});
