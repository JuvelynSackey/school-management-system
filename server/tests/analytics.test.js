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

const createResult = async (schoolId, fields) => {
  const { Result } = models;
  return runWithSchool(schoolId, async () => Result.create({ schoolId, ...fields }));
};

describe('GET /analytics/academic — pass rate', () => {
  test('computes the overall pass rate using the default NaCCA scheme (pass = totalScore >= 40)', async () => {
    const school = await fixtures.createSchool(models);
    const classRow = await fixtures.createClass(models, school._id);
    const subject = await fixtures.createSubject(models, school._id);
    const term = await fixtures.createTerm(models, school._id, { isCurrent: true });
    const { student: studentA } = await fixtures.createStudent(models, school._id, { classId: classRow.id });
    const { student: studentB } = await fixtures.createStudent(models, school._id, { classId: classRow.id });
    const { student: studentC } = await fixtures.createStudent(models, school._id, { classId: classRow.id });
    const { password } = await fixtures.createAdmin(models, school._id, { email: 'admin@analytics-test.local' });
    const token = await fixtures.login(app, school.slug, 'admin@analytics-test.local', password);

    // Two passes (>= 40), one fail (< 40).
    await createResult(school._id, {
      studentId: studentA.id, subjectId: subject.id, classId: classRow.id, academicTermId: term.id, classScore: 45, examScore: 45, totalScore: 90,
    });
    await createResult(school._id, {
      studentId: studentB.id, subjectId: subject.id, classId: classRow.id, academicTermId: term.id, classScore: 20, examScore: 20, totalScore: 40,
    });
    await createResult(school._id, {
      studentId: studentC.id, subjectId: subject.id, classId: classRow.id, academicTermId: term.id, classScore: 15, examScore: 15, totalScore: 30,
    });

    const res = await request(app).get('/api/analytics/academic').query({ academicTermId: term.id }).set(fixtures.authHeader(token));
    expect(res.status).toBe(200);
    expect(res.body.data.passRate).toBe(66.7);
  });

  test('a term with no results at all reports a null pass rate, not a divide-by-zero error', async () => {
    const school = await fixtures.createSchool(models);
    const term = await fixtures.createTerm(models, school._id, { isCurrent: true });
    const { password } = await fixtures.createAdmin(models, school._id, { email: 'admin2@analytics-test.local' });
    const token = await fixtures.login(app, school.slug, 'admin2@analytics-test.local', password);

    const res = await request(app).get('/api/analytics/academic').query({ academicTermId: term.id }).set(fixtures.authHeader(token));
    expect(res.status).toBe(200);
    expect(res.body.data.passRate).toBeNull();
  });
});
