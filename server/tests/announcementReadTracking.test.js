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

describe('Announcement read-tracking', () => {
  test('a fresh notice board is entirely unread, and marking one read updates both the notice board and the unread count', async () => {
    const school = await fixtures.createSchool(models);
    const classRow = await fixtures.createClass(models, school._id);
    const { user: studentUser, password: studentPassword } = await fixtures.createStudent(models, school._id, { classId: classRow.id });
    const { password: adminPassword } = await fixtures.createAdmin(models, school._id, { email: 'admin@read-test.local' });
    const adminToken = await fixtures.login(app, school.slug, 'admin@read-test.local', adminPassword);

    await request(app).post('/api/announcements').set(fixtures.authHeader(adminToken))
      .send({ message: 'Welcome back to term 2!', targetType: 'school' });

    const studentToken = await fixtures.login(app, school.slug, studentUser.email, studentPassword);

    const before = await request(app).get('/api/announcements/me').set(fixtures.authHeader(studentToken));
    expect(before.body.data).toHaveLength(1);
    expect(before.body.data[0].isRead).toBe(false);
    expect(before.body.data[0].readBy).toBeUndefined();

    const beforeCount = await request(app).get('/api/announcements/unread-count').set(fixtures.authHeader(studentToken));
    expect(beforeCount.body.data.count).toBe(1);

    const announcementId = before.body.data[0].id;
    const markRes = await request(app).post(`/api/announcements/${announcementId}/read`).set(fixtures.authHeader(studentToken));
    expect(markRes.status).toBe(200);

    const after = await request(app).get('/api/announcements/me').set(fixtures.authHeader(studentToken));
    expect(after.body.data[0].isRead).toBe(true);

    const afterCount = await request(app).get('/api/announcements/unread-count').set(fixtures.authHeader(studentToken));
    expect(afterCount.body.data.count).toBe(0);
  });

  test('marking a notice read twice is a no-op, not an error', async () => {
    const school = await fixtures.createSchool(models);
    const classRow = await fixtures.createClass(models, school._id);
    const { user: studentUser, password: studentPassword } = await fixtures.createStudent(models, school._id, { classId: classRow.id });
    const { password: adminPassword } = await fixtures.createAdmin(models, school._id, { email: 'admin2@read-test.local' });
    const adminToken = await fixtures.login(app, school.slug, 'admin2@read-test.local', adminPassword);

    const created = await request(app).post('/api/announcements').set(fixtures.authHeader(adminToken))
      .send({ message: 'Second notice', targetType: 'school' });
    const studentToken = await fixtures.login(app, school.slug, studentUser.email, studentPassword);

    const first = await request(app).post(`/api/announcements/${created.body.data.id}/read`).set(fixtures.authHeader(studentToken));
    const second = await request(app).post(`/api/announcements/${created.body.data.id}/read`).set(fixtures.authHeader(studentToken));
    expect(first.status).toBe(200);
    expect(second.status).toBe(200);

    const count = await request(app).get('/api/announcements/unread-count').set(fixtures.authHeader(studentToken));
    expect(count.body.data.count).toBe(0);
  });

  test("one student's read state does not mark the notice read for another student", async () => {
    const school = await fixtures.createSchool(models);
    const classRow = await fixtures.createClass(models, school._id);
    const { user: u1, password: p1 } = await fixtures.createStudent(models, school._id, { classId: classRow.id });
    const { user: u2, password: p2 } = await fixtures.createStudent(models, school._id, { classId: classRow.id });
    const { password: adminPassword } = await fixtures.createAdmin(models, school._id, { email: 'admin3@read-test.local' });
    const adminToken = await fixtures.login(app, school.slug, 'admin3@read-test.local', adminPassword);

    const created = await request(app).post('/api/announcements').set(fixtures.authHeader(adminToken))
      .send({ message: 'Shared notice', targetType: 'school' });

    const token1 = await fixtures.login(app, school.slug, u1.email, p1);
    const token2 = await fixtures.login(app, school.slug, u2.email, p2);

    await request(app).post(`/api/announcements/${created.body.data.id}/read`).set(fixtures.authHeader(token1));

    const s2Board = await request(app).get('/api/announcements/me').set(fixtures.authHeader(token2));
    expect(s2Board.body.data[0].isRead).toBe(false);
  });
});
