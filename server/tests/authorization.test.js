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

describe('Role-based authorization', () => {
  test('a teacher cannot create a class (admin-only route)', async () => {
    const school = await fixtures.createSchool(models);
    const { password } = await fixtures.createTeacher(models, school._id, { email: 'teacher@authz.local' });
    const token = await fixtures.login(app, school.slug, 'teacher@authz.local', password);

    const res = await request(app).post('/api/classes').set(fixtures.authHeader(token)).send({ name: 'New Class' });
    expect(res.status).toBe(403);
  });

  test('a teacher cannot approve a result sheet (admin-only action)', async () => {
    const school = await fixtures.createSchool(models);
    const { teacher, password } = await fixtures.createTeacher(models, school._id, { email: 'teacher2@authz.local' });
    const classRow = await fixtures.createClass(models, school._id);
    const subject = await fixtures.createSubject(models, school._id);
    const term = await fixtures.createTerm(models, school._id);
    await fixtures.assignSubjectToClass(models, school._id, { classId: classRow.id, subjectId: subject.id, academicTermId: term.id });
    await fixtures.assignTeacherToClass(models, school._id, { teacherId: teacher.id, subjectId: subject.id, classId: classRow.id });

    const token = await fixtures.login(app, school.slug, 'teacher2@authz.local', password);
    const sheets = await request(app).get('/api/result-sheets').query({ classId: classRow.id, academicTermId: term.id }).set(fixtures.authHeader(token));
    const sheetId = sheets.body.data[0].id;

    const res = await request(app).post(`/api/result-sheets/${sheetId}/approve`).set(fixtures.authHeader(token));
    expect(res.status).toBe(403);
  });

  test('a teacher cannot record scores for a class they are not assigned to', async () => {
    const school = await fixtures.createSchool(models);
    const { password } = await fixtures.createTeacher(models, school._id, { email: 'teacher3@authz.local' });
    const unassignedClass = await fixtures.createClass(models, school._id);
    const subject = await fixtures.createSubject(models, school._id);
    const term = await fixtures.createTerm(models, school._id);
    const { student } = await fixtures.createStudent(models, school._id, { classId: unassignedClass.id });

    const token = await fixtures.login(app, school.slug, 'teacher3@authz.local', password);
    const res = await request(app).post('/api/results/bulk').set(fixtures.authHeader(token)).send({
      classId: unassignedClass.id, subjectId: subject.id, academicTermId: term.id,
      records: [{ studentId: student.id, classScore: 40, examScore: 35 }],
    });
    expect(res.status).toBe(403);
  });

  test('a student cannot access the admin-only classes-create route', async () => {
    const school = await fixtures.createSchool(models);
    const { user, password } = await fixtures.createStudent(models, school._id);
    const token = await fixtures.login(app, school.slug, user.email, password);

    const res = await request(app).post('/api/classes').set(fixtures.authHeader(token)).send({ name: 'Student Attempt' });
    expect(res.status).toBe(403);
  });

  test('Super-Admin auth is a completely separate system — a tenant admin token cannot hit Super-Admin routes', async () => {
    const school = await fixtures.createSchool(models);
    const { password } = await fixtures.createAdmin(models, school._id, { email: 'admin@authz-super.local' });
    const tenantToken = await fixtures.login(app, school.slug, 'admin@authz-super.local', password);

    const res = await request(app).get('/api/super-admin/schools').set(fixtures.authHeader(tenantToken));
    expect(res.status).toBe(401);
  });

  test('a tenant route rejects a well-formed but unauthenticated request', async () => {
    const res = await request(app).get('/api/students');
    expect(res.status).toBe(401);
  });

  test('an admin CAN create a class (positive control — proves 403s above are real authorization, not a broken route)', async () => {
    const school = await fixtures.createSchool(models);
    const { password } = await fixtures.createAdmin(models, school._id, { email: 'admin@authz-positive.local' });
    const token = await fixtures.login(app, school.slug, 'admin@authz-positive.local', password);

    const res = await request(app).post('/api/classes').set(fixtures.authHeader(token)).send({ name: 'Admin Made This' });
    expect(res.status).toBe(201);
  });
});
