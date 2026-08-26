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

describe('GET /analytics/academic — classAverages ordering (Phase: Ghanaian class hierarchy)', () => {
  test('classAverages are ordered by grade level, not by aggregate/insertion order', async () => {
    const school = await fixtures.createSchool(models);
    const subject = await fixtures.createSubject(models, school._id);
    const term = await fixtures.createTerm(models, school._id, { isCurrent: true });
    // Created out of pedagogical order, and results recorded in that same
    // scrambled order, so a passing test can't be an accident of insertion order.
    const jhs1 = await fixtures.createClass(models, school._id, { name: 'JHS 1', gradeLevel: 'JHS 1', levelOrder: 11, stage: 'JHS' });
    const basic1 = await fixtures.createClass(models, school._id, { name: 'Basic 1', gradeLevel: 'Basic 1', levelOrder: 5, stage: 'Primary' });
    const kg2 = await fixtures.createClass(models, school._id, { name: 'KG 2', gradeLevel: 'KG 2', levelOrder: 4, stage: 'KG' });
    const { student: studentJhs1 } = await fixtures.createStudent(models, school._id, { classId: jhs1.id });
    const { student: studentBasic1 } = await fixtures.createStudent(models, school._id, { classId: basic1.id });
    const { student: studentKg2 } = await fixtures.createStudent(models, school._id, { classId: kg2.id });
    await createResult(school._id, {
      studentId: studentJhs1.id, subjectId: subject.id, classId: jhs1.id, academicTermId: term.id, classScore: 40, examScore: 40, totalScore: 80,
    });
    await createResult(school._id, {
      studentId: studentBasic1.id, subjectId: subject.id, classId: basic1.id, academicTermId: term.id, classScore: 40, examScore: 40, totalScore: 80,
    });
    await createResult(school._id, {
      studentId: studentKg2.id, subjectId: subject.id, classId: kg2.id, academicTermId: term.id, classScore: 40, examScore: 40, totalScore: 80,
    });
    const { password } = await fixtures.createAdmin(models, school._id, { email: 'admin3@analytics-test.local' });
    const token = await fixtures.login(app, school.slug, 'admin3@analytics-test.local', password);

    const res = await request(app).get('/api/analytics/academic').query({ academicTermId: term.id }).set(fixtures.authHeader(token));
    expect(res.status).toBe(200);
    expect(res.body.data.classAverages.map((c) => c.className)).toEqual(['KG 2', 'Basic 1', 'JHS 1']);
  });
});

describe('GET /analytics/financial — byClass ordering (Phase: Ghanaian class hierarchy)', () => {
  test('byClass entries are ordered by grade level', async () => {
    const school = await fixtures.createSchool(models);
    const term = await fixtures.createTerm(models, school._id, { isCurrent: true });
    const jhs1 = await fixtures.createClass(models, school._id, { name: 'JHS 1', gradeLevel: 'JHS 1', levelOrder: 11, stage: 'JHS' });
    const basic1 = await fixtures.createClass(models, school._id, { name: 'Basic 1', gradeLevel: 'Basic 1', levelOrder: 5, stage: 'Primary' });
    const { student: studentJhs1 } = await fixtures.createStudent(models, school._id, { classId: jhs1.id });
    const { student: studentBasic1 } = await fixtures.createStudent(models, school._id, { classId: basic1.id });
    const { Fee } = models;
    await runWithSchool(school._id, () => Fee.create({
      schoolId: school._id, studentId: studentJhs1.id, academicTermId: term.id, feeType: 'Tuition', category: 'Tuition', amountDue: 100,
    }));
    await runWithSchool(school._id, () => Fee.create({
      schoolId: school._id, studentId: studentBasic1.id, academicTermId: term.id, feeType: 'Tuition', category: 'Tuition', amountDue: 100,
    }));
    const { password } = await fixtures.createAdmin(models, school._id, { email: 'admin4@analytics-test.local' });
    const token = await fixtures.login(app, school.slug, 'admin4@analytics-test.local', password);

    const res = await request(app).get('/api/analytics/financial').query({ academicTermId: term.id }).set(fixtures.authHeader(token));
    expect(res.status).toBe(200);
    expect(res.body.data.byClass.map((c) => c.className)).toEqual(['Basic 1', 'JHS 1']);
  });
});
