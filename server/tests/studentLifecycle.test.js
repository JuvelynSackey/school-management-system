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

describe('Student lifecycle states', () => {
  test.each(['transferred', 'withdrawn', 'graduated'])('accepts the new "%s" status via update', async (status) => {
    const school = await fixtures.createSchool(models);
    const classRow = await fixtures.createClass(models, school._id);
    const { student } = await fixtures.createStudent(models, school._id, { classId: classRow.id });
    const { password } = await fixtures.createAdmin(models, school._id, { email: 'admin@lifecycle-test.local' });
    const token = await fixtures.login(app, school.slug, 'admin@lifecycle-test.local', password);

    const res = await request(app).put(`/api/students/${student.id}`).set(fixtures.authHeader(token)).send({ status });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe(status);
  });

  test.each(['transferred', 'withdrawn', 'graduated', 'archived'])('a student marked "%s" no longer appears on the default roster, but does under an explicit status filter', async (status) => {
    const school = await fixtures.createSchool(models);
    const classRow = await fixtures.createClass(models, school._id);
    const { student } = await fixtures.createStudent(models, school._id, { classId: classRow.id });
    const { password } = await fixtures.createAdmin(models, school._id, { email: 'admin2@lifecycle-test.local' });
    const token = await fixtures.login(app, school.slug, 'admin2@lifecycle-test.local', password);

    await request(app).put(`/api/students/${student.id}`).set(fixtures.authHeader(token)).send({ status });

    const defaultList = await request(app).get('/api/students').set(fixtures.authHeader(token));
    expect(defaultList.body.data.map((s) => s.id)).not.toContain(student.id);

    const filtered = await request(app).get('/api/students').query({ status }).set(fixtures.authHeader(token));
    expect(filtered.body.data.map((s) => s.id)).toContain(student.id);
  });

  test('setting a non-active status deactivates the student\'s login; setting back to active reactivates it', async () => {
    const school = await fixtures.createSchool(models);
    const classRow = await fixtures.createClass(models, school._id);
    const { student, user } = await fixtures.createStudent(models, school._id, { classId: classRow.id });
    const { password } = await fixtures.createAdmin(models, school._id, { email: 'admin3@lifecycle-test.local' });
    const token = await fixtures.login(app, school.slug, 'admin3@lifecycle-test.local', password);
    const { User } = models;

    await request(app).put(`/api/students/${student.id}`).set(fixtures.authHeader(token)).send({ status: 'graduated' });
    let updatedUser = await runWithSchool(school._id, async () => User.findById(user.id));
    expect(updatedUser.status).toBe('inactive');

    await request(app).put(`/api/students/${student.id}`).set(fixtures.authHeader(token)).send({ status: 'active' });
    updatedUser = await runWithSchool(school._id, async () => User.findById(user.id));
    expect(updatedUser.status).toBe('active');
  });
});
