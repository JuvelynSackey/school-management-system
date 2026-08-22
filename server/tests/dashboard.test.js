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

describe('Admin dashboard — Action Center data', () => {
  test('counts a teacher with no result sheet yet as having unsubmitted marks', async () => {
    const school = await fixtures.createSchool(models);
    const classRow = await fixtures.createClass(models, school._id);
    const subject = await fixtures.createSubject(models, school._id);
    const term = await fixtures.createTerm(models, school._id, { isCurrent: true });
    const { teacher } = await fixtures.createTeacher(models, school._id);
    await fixtures.assignTeacherToClass(models, school._id, { teacherId: teacher.id, subjectId: subject.id, classId: classRow.id });
    const { password } = await fixtures.createAdmin(models, school._id, { email: 'admin@dash-test.local' });
    const token = await fixtures.login(app, school.slug, 'admin@dash-test.local', password);

    const res = await request(app).get('/api/dashboard').set(fixtures.authHeader(token));
    expect(res.status).toBe(200);
    expect(res.body.data.alerts.teachersUnsubmittedCount).toBe(1);
  });

  test('does not count a teacher whose only assignment has an already-Submitted sheet', async () => {
    const school = await fixtures.createSchool(models);
    const classRow = await fixtures.createClass(models, school._id);
    const subject = await fixtures.createSubject(models, school._id);
    const term = await fixtures.createTerm(models, school._id, { isCurrent: true });
    const { teacher } = await fixtures.createTeacher(models, school._id);
    await fixtures.assignTeacherToClass(models, school._id, { teacherId: teacher.id, subjectId: subject.id, classId: classRow.id });
    const { ResultSheet } = models;
    await runWithSchool(school._id, async () => ResultSheet.create({
      schoolId: school._id, classId: classRow.id, subjectId: subject.id, academicTermId: term.id, status: 'Submitted',
    }));
    const { password } = await fixtures.createAdmin(models, school._id, { email: 'admin2@dash-test.local' });
    const token = await fixtures.login(app, school.slug, 'admin2@dash-test.local', password);

    const res = await request(app).get('/api/dashboard').set(fixtures.authHeader(token));
    expect(res.body.data.alerts.teachersUnsubmittedCount).toBe(0);
  });

  test('a teacher with one submitted and one unsubmitted assignment is counted once, not twice', async () => {
    const school = await fixtures.createSchool(models);
    const classRow = await fixtures.createClass(models, school._id);
    const subjectA = await fixtures.createSubject(models, school._id);
    const subjectB = await fixtures.createSubject(models, school._id);
    const term = await fixtures.createTerm(models, school._id, { isCurrent: true });
    const { teacher } = await fixtures.createTeacher(models, school._id);
    await fixtures.assignTeacherToClass(models, school._id, { teacherId: teacher.id, subjectId: subjectA.id, classId: classRow.id });
    await fixtures.assignTeacherToClass(models, school._id, { teacherId: teacher.id, subjectId: subjectB.id, classId: classRow.id });
    const { ResultSheet } = models;
    await runWithSchool(school._id, async () => ResultSheet.create({
      schoolId: school._id, classId: classRow.id, subjectId: subjectA.id, academicTermId: term.id, status: 'Submitted',
    }));
    // subjectB has no sheet at all yet -> still unsubmitted
    const { password } = await fixtures.createAdmin(models, school._id, { email: 'admin3@dash-test.local' });
    const token = await fixtures.login(app, school.slug, 'admin3@dash-test.local', password);

    const res = await request(app).get('/api/dashboard').set(fixtures.authHeader(token));
    expect(res.body.data.alerts.teachersUnsubmittedCount).toBe(1);
  });

  test('with no current term set, the count is 0 rather than throwing', async () => {
    const school = await fixtures.createSchool(models);
    const { password } = await fixtures.createAdmin(models, school._id, { email: 'admin4@dash-test.local' });
    const token = await fixtures.login(app, school.slug, 'admin4@dash-test.local', password);

    const res = await request(app).get('/api/dashboard').set(fixtures.authHeader(token));
    expect(res.status).toBe(200);
    expect(res.body.data.alerts.teachersUnsubmittedCount).toBe(0);
  });
});
