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

describe('Announcement expanded targeting', () => {
  test('all_teachers reaches every teacher, not students', async () => {
    const school = await fixtures.createSchool(models);
    const classRow = await fixtures.createClass(models, school._id);
    const { user: teacherUser, password: teacherPassword } = await fixtures.createTeacher(models, school._id, { email: 'teacher@target-test.local' });
    const { user: studentUser, password: studentPassword } = await fixtures.createStudent(models, school._id, { classId: classRow.id });
    const { password: adminPassword } = await fixtures.createAdmin(models, school._id, { email: 'admin@target-test.local' });
    const adminToken = await fixtures.login(app, school.slug, 'admin@target-test.local', adminPassword);

    const created = await request(app).post('/api/announcements').set(fixtures.authHeader(adminToken))
      .send({ message: 'Staff meeting Friday', targetType: 'all_teachers' });
    expect(created.status).toBe(201);

    const teacherToken = await fixtures.login(app, school.slug, teacherUser.email, teacherPassword);
    const teacherBoard = await request(app).get('/api/announcements/me').set(fixtures.authHeader(teacherToken));
    expect(teacherBoard.body.data).toHaveLength(1);

    const studentToken = await fixtures.login(app, school.slug, studentUser.email, studentPassword);
    const studentBoard = await request(app).get('/api/announcements/me').set(fixtures.authHeader(studentToken));
    expect(studentBoard.body.data).toHaveLength(0);
  });

  test('specific_classes reaches teachers assigned to that class, students in it, and their parents', async () => {
    const school = await fixtures.createSchool(models);
    const targetClass = await fixtures.createClass(models, school._id);
    const otherClass = await fixtures.createClass(models, school._id);
    const subject = await fixtures.createSubject(models, school._id);

    const { teacher, user: teacherUser, password: teacherPassword } = await fixtures.createTeacher(models, school._id, { email: 'teacher2@target-test.local' });
    await fixtures.assignTeacherToClass(models, school._id, { teacherId: teacher.id, subjectId: subject.id, classId: targetClass.id });

    const { user: otherTeacherUser, password: otherTeacherPassword } = await fixtures.createTeacher(models, school._id, { email: 'teacher3@target-test.local' });

    const { student, user: studentUser, password: studentPassword } = await fixtures.createStudent(models, school._id, { classId: targetClass.id });
    const { user: parentUser, password: parentPassword } = await fixtures.createParentWithChild(models, school._id, student.id);

    const { password: adminPassword } = await fixtures.createAdmin(models, school._id, { email: 'admin2@target-test.local' });
    const adminToken = await fixtures.login(app, school.slug, 'admin2@target-test.local', adminPassword);

    const created = await request(app).post('/api/announcements').set(fixtures.authHeader(adminToken))
      .send({ message: 'Class trip permission slip', targetType: 'specific_classes', targetClassIds: [targetClass.id] });
    expect(created.status).toBe(201);

    const assignedTeacherToken = await fixtures.login(app, school.slug, teacherUser.email, teacherPassword);
    expect((await request(app).get('/api/announcements/me').set(fixtures.authHeader(assignedTeacherToken))).body.data).toHaveLength(1);

    const otherTeacherToken = await fixtures.login(app, school.slug, otherTeacherUser.email, otherTeacherPassword);
    expect((await request(app).get('/api/announcements/me').set(fixtures.authHeader(otherTeacherToken))).body.data).toHaveLength(0);

    const studentToken = await fixtures.login(app, school.slug, studentUser.email, studentPassword);
    expect((await request(app).get('/api/announcements/me').set(fixtures.authHeader(studentToken))).body.data).toHaveLength(1);

    const parentToken = await fixtures.login(app, school.slug, parentUser.email, parentPassword);
    expect((await request(app).get('/api/announcements/me').set(fixtures.authHeader(parentToken))).body.data).toHaveLength(1);
  });

  test('specific_students requires a non-empty targetStudentIds array', async () => {
    const school = await fixtures.createSchool(models);
    const { password: adminPassword } = await fixtures.createAdmin(models, school._id, { email: 'admin3@target-test.local' });
    const adminToken = await fixtures.login(app, school.slug, 'admin3@target-test.local', adminPassword);

    const res = await request(app).post('/api/announcements').set(fixtures.authHeader(adminToken))
      .send({ message: 'Missing target', targetType: 'specific_students', targetStudentIds: [] });
    expect(res.status).toBe(400);
  });

  test('specific_parents reaches only the named guardian', async () => {
    const school = await fixtures.createSchool(models);
    const classRow = await fixtures.createClass(models, school._id);
    const { student: s1 } = await fixtures.createStudent(models, school._id, { classId: classRow.id });
    const { student: s2 } = await fixtures.createStudent(models, school._id, { classId: classRow.id });
    const { guardian, user: parent1User, password: parent1Password } = await fixtures.createParentWithChild(models, school._id, s1.id);
    const { user: parent2User, password: parent2Password } = await fixtures.createParentWithChild(models, school._id, s2.id);

    const { password: adminPassword } = await fixtures.createAdmin(models, school._id, { email: 'admin4@target-test.local' });
    const adminToken = await fixtures.login(app, school.slug, 'admin4@target-test.local', adminPassword);

    const created = await request(app).post('/api/announcements').set(fixtures.authHeader(adminToken))
      .send({ message: 'Private note', targetType: 'specific_parents', targetGuardianIds: [guardian.id] });
    expect(created.status).toBe(201);

    const p1Token = await fixtures.login(app, school.slug, parent1User.email, parent1Password);
    expect((await request(app).get('/api/announcements/me').set(fixtures.authHeader(p1Token))).body.data).toHaveLength(1);

    const p2Token = await fixtures.login(app, school.slug, parent2User.email, parent2Password);
    expect((await request(app).get('/api/announcements/me').set(fixtures.authHeader(p2Token))).body.data).toHaveLength(0);
  });
});

describe('Admin-facing read-count aggregate', () => {
  test('GET /announcements reports readCount and totalRecipients per announcement', async () => {
    const school = await fixtures.createSchool(models);
    const classRow = await fixtures.createClass(models, school._id);
    const { user: s1User, password: p1 } = await fixtures.createStudent(models, school._id, { classId: classRow.id });
    await fixtures.createStudent(models, school._id, { classId: classRow.id });

    const { password: adminPassword } = await fixtures.createAdmin(models, school._id, { email: 'admin5@target-test.local' });
    const adminToken = await fixtures.login(app, school.slug, 'admin5@target-test.local', adminPassword);

    const created = await request(app).post('/api/announcements').set(fixtures.authHeader(adminToken))
      .send({ message: 'Read count check', targetType: 'school' });

    const s1Token = await fixtures.login(app, school.slug, s1User.email, p1);
    const board = await request(app).get('/api/announcements/me').set(fixtures.authHeader(s1Token));
    await request(app).post(`/api/announcements/${board.body.data[0].id}/read`).set(fixtures.authHeader(s1Token));

    const list = await request(app).get('/api/announcements').set(fixtures.authHeader(adminToken));
    const row = list.body.data.find((a) => a.id === created.body.data.id);
    expect(row.readCount).toBe(1);
    expect(row.totalRecipients).toBeGreaterThanOrEqual(2);
    expect(row.status).toBe('sent');
  });
});

describe('Scheduled announcements', () => {
  test('a future scheduledFor announcement is not visible on any notice board until dispatched', async () => {
    const school = await fixtures.createSchool(models);
    const classRow = await fixtures.createClass(models, school._id);
    const { user: studentUser, password: studentPassword } = await fixtures.createStudent(models, school._id, { classId: classRow.id });
    const { password: adminPassword } = await fixtures.createAdmin(models, school._id, { email: 'admin6@target-test.local' });
    const adminToken = await fixtures.login(app, school.slug, 'admin6@target-test.local', adminPassword);

    const future = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    const created = await request(app).post('/api/announcements').set(fixtures.authHeader(adminToken))
      .send({ message: 'Exam reminder next week', targetType: 'school', scheduledFor: future });
    expect(created.status).toBe(201);
    expect(created.body.data.sentAt).toBeNull();

    const studentToken = await fixtures.login(app, school.slug, studentUser.email, studentPassword);
    const board = await request(app).get('/api/announcements/me').set(fixtures.authHeader(studentToken));
    expect(board.body.data).toHaveLength(0);

    const list = await request(app).get('/api/announcements').set(fixtures.authHeader(adminToken));
    expect(list.body.data.find((a) => a.id === created.body.data.id).status).toBe('scheduled');
  });

  test('rejects a scheduledFor in the past', async () => {
    const school = await fixtures.createSchool(models);
    const { password: adminPassword } = await fixtures.createAdmin(models, school._id, { email: 'admin7@target-test.local' });
    const adminToken = await fixtures.login(app, school.slug, 'admin7@target-test.local', adminPassword);

    const past = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const res = await request(app).post('/api/announcements').set(fixtures.authHeader(adminToken))
      .send({ message: 'Too late', targetType: 'school', scheduledFor: past });
    expect(res.status).toBe(400);
  });

  test('the scheduler dispatches a due announcement and it then appears on the notice board', async () => {
    const { Announcement } = models;
    // eslint-disable-next-line global-require
    const { dispatchDueAnnouncements } = require('../src/services/announcementScheduler');

    const school = await fixtures.createSchool(models);
    const classRow = await fixtures.createClass(models, school._id);
    const { user: studentUser, password: studentPassword } = await fixtures.createStudent(models, school._id, { classId: classRow.id });
    const { password: adminPassword } = await fixtures.createAdmin(models, school._id, { email: 'admin8@target-test.local' });
    const adminToken = await fixtures.login(app, school.slug, 'admin8@target-test.local', adminPassword);

    const future = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    const created = await request(app).post('/api/announcements').set(fixtures.authHeader(adminToken))
      .send({ message: 'Due now', targetType: 'school', scheduledFor: future });

    // Simulate time passing: back-date scheduledFor directly (bypassing the API's future-only validation).
    await runWithSchool(school._id, () => Announcement.updateOne({ _id: created.body.data.id }, { $set: { scheduledFor: new Date(Date.now() - 1000) } }));

    await dispatchDueAnnouncements();

    const studentToken = await fixtures.login(app, school.slug, studentUser.email, studentPassword);
    const board = await request(app).get('/api/announcements/me').set(fixtures.authHeader(studentToken));
    expect(board.body.data).toHaveLength(1);
    expect(board.body.data[0].message).toBe('Due now');
  });
});
