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

describe('Batch Student ID Card PDF Generator', () => {
  test('an admin gets a PDF for a class with active students, and it is audit-logged', async () => {
    const school = await fixtures.createSchool(models);
    const classRow = await fixtures.createClass(models, school._id);
    await fixtures.createStudent(models, school._id, { classId: classRow.id });
    await fixtures.createStudent(models, school._id, { classId: classRow.id });
    const { password } = await fixtures.createAdmin(models, school._id, { email: 'admin@idcards-test.local' });
    const token = await fixtures.login(app, school.slug, 'admin@idcards-test.local', password);

    const res = await request(app).get('/api/students/id-cards/pdf').query({ classId: classRow.id }).set(fixtures.authHeader(token));

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toBe('application/pdf');
    expect(res.headers['content-disposition']).toContain('id-cards');

    const { AuditLog } = models;
    const logs = await runWithSchool(school._id, async () => AuditLog.find({ action: 'student.idCardsDownload' }));
    expect(logs.length).toBe(1);
  });

  test('rejects a missing classId', async () => {
    const school = await fixtures.createSchool(models);
    const { password } = await fixtures.createAdmin(models, school._id, { email: 'admin2@idcards-test.local' });
    const token = await fixtures.login(app, school.slug, 'admin2@idcards-test.local', password);

    const res = await request(app).get('/api/students/id-cards/pdf').set(fixtures.authHeader(token));
    expect(res.status).toBe(400);
  });

  test('rejects a class with no active students, rather than generating an empty PDF', async () => {
    const school = await fixtures.createSchool(models);
    const classRow = await fixtures.createClass(models, school._id);
    const { password } = await fixtures.createAdmin(models, school._id, { email: 'admin3@idcards-test.local' });
    const token = await fixtures.login(app, school.slug, 'admin3@idcards-test.local', password);

    const res = await request(app).get('/api/students/id-cards/pdf').query({ classId: classRow.id }).set(fixtures.authHeader(token));
    expect(res.status).toBe(400);
  });

  test('is admin-only — a teacher gets 403', async () => {
    const school = await fixtures.createSchool(models);
    const classRow = await fixtures.createClass(models, school._id);
    await fixtures.createStudent(models, school._id, { classId: classRow.id });
    const { user: teacherUser, password } = await fixtures.createTeacher(models, school._id);
    const token = await fixtures.login(app, school.slug, teacherUser.email, password);

    const res = await request(app).get('/api/students/id-cards/pdf').query({ classId: classRow.id }).set(fixtures.authHeader(token));
    expect(res.status).toBe(403);
  });

  test('a classId belonging to a different school is treated as not found, not another tenant\'s class', async () => {
    const schoolA = await fixtures.createSchool(models);
    const schoolB = await fixtures.createSchool(models);
    const classInB = await fixtures.createClass(models, schoolB._id);
    await fixtures.createStudent(models, schoolB._id, { classId: classInB.id });
    const { password } = await fixtures.createAdmin(models, schoolA._id, { email: 'admin4@idcards-test.local' });
    const token = await fixtures.login(app, schoolA.slug, 'admin4@idcards-test.local', password);

    const res = await request(app).get('/api/students/id-cards/pdf').query({ classId: classInB.id }).set(fixtures.authHeader(token));
    expect(res.status).toBe(400);
  });
});

describe('Student ID verification (QR target)', () => {
  test('a genuine, active student verifies successfully', async () => {
    const school = await fixtures.createSchool(models);
    const classRow = await fixtures.createClass(models, school._id);
    const { student } = await fixtures.createStudent(models, school._id, { classId: classRow.id });

    const res = await request(app).get(`/api/verify/student/${school.slug}/${student.id}`);
    expect(res.status).toBe(200);
    expect(res.body.data.valid).toBe(true);
    expect(res.body.data.type).toBe('student');
    expect(res.body.data.admissionNo).toBe(student.admissionNo);
  });

  test('a nonexistent student id resolves as not found', async () => {
    const school = await fixtures.createSchool(models);
    const res = await request(app).get(`/api/verify/student/${school.slug}/507f1f77bcf86cd799439011`);
    expect(res.body.data.valid).toBe(false);
    expect(res.body.data.reason).toBe('not_found');
  });

  test('a real student id under the WRONG school\'s slug is not found — no cross-tenant leak', async () => {
    const schoolA = await fixtures.createSchool(models);
    const schoolB = await fixtures.createSchool(models);
    const classInB = await fixtures.createClass(models, schoolB._id);
    const { student } = await fixtures.createStudent(models, schoolB._id, { classId: classInB.id });

    const res = await request(app).get(`/api/verify/student/${schoolA.slug}/${student.id}`);
    expect(res.body.data.valid).toBe(false);
    expect(res.body.data.reason).toBe('not_found');
  });
});
