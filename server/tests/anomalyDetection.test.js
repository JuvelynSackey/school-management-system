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

// A steady 60/40/50/45/55 (mean 50, sample stdDev ~7.9) history — a new
// score has to be genuinely far outside that band to trip the >2.5sigma
// check, not just "different."
const seedSteadyHistory = async (models_, school, student, subject, classRow, terms, scores) => Promise.all(
  terms.map((term, i) => runWithSchool(school._id, () => models_.Result.create({
    schoolId: school._id, studentId: student.id, subjectId: subject.id, classId: classRow.id, academicTermId: term.id, classScore: scores[i] / 2, examScore: scores[i] / 2,
  }))),
);

describe('statistical outlier detection (>2.5 sigma)', () => {
  test('GET /results/roster includes historyMean/historyStdDev/historyCount for a student with prior scores', async () => {
    const school = await fixtures.createSchool(models);
    const classRow = await fixtures.createClass(models, school._id);
    const subject = await fixtures.createSubject(models, school._id);
    const currentTerm = await fixtures.createTerm(models, school._id, { name: 'Term 3' });
    const priorTerms = await Promise.all([1, 2].map((n) => fixtures.createTerm(models, school._id, { name: `Prior ${n}` })));
    const { student } = await fixtures.createStudent(models, school._id, { classId: classRow.id });

    await seedSteadyHistory(models, school, student, subject, classRow, priorTerms, [60, 40]);

    const { password } = await fixtures.createAdmin(models, school._id, { email: 'admin@outlier-test.local' });
    const token = await fixtures.login(app, school.slug, 'admin@outlier-test.local', password);

    const res = await request(app).get('/api/results/roster').query({
      classId: classRow.id, subjectId: subject.id, academicTermId: currentTerm.id,
    }).set(fixtures.authHeader(token));

    expect(res.status).toBe(200);
    const row = res.body.data.find((r) => r.studentId === student.id);
    expect(row.historyCount).toBe(2);
    expect(row.historyMean).toBe(50);
    expect(row.historyStdDev).toBeGreaterThan(0);
  });

  test('GET /results/roster reports historyCount: 0 for a student with no prior scores in this subject', async () => {
    const school = await fixtures.createSchool(models);
    const classRow = await fixtures.createClass(models, school._id);
    const subject = await fixtures.createSubject(models, school._id);
    const term = await fixtures.createTerm(models, school._id);
    const { student } = await fixtures.createStudent(models, school._id, { classId: classRow.id });

    const { password } = await fixtures.createAdmin(models, school._id, { email: 'admin2@outlier-test.local' });
    const token = await fixtures.login(app, school.slug, 'admin2@outlier-test.local', password);

    const res = await request(app).get('/api/results/roster').query({
      classId: classRow.id, subjectId: subject.id, academicTermId: term.id,
    }).set(fixtures.authHeader(token));

    const row = res.body.data.find((r) => r.studentId === student.id);
    expect(row.historyCount).toBe(0);
    expect(row.historyMean).toBeNull();
  });

  test('GET /results/anomalies flags a statistical_outlier when the current score is >2.5 sigma from a steady history', async () => {
    const school = await fixtures.createSchool(models);
    const classRow = await fixtures.createClass(models, school._id);
    const subject = await fixtures.createSubject(models, school._id);
    const currentTerm = await fixtures.createTerm(models, school._id, { name: 'Term 3' });
    const priorTerms = await Promise.all([1, 2, 3].map((n) => fixtures.createTerm(models, school._id, { name: `Prior ${n}` })));
    const { student } = await fixtures.createStudent(models, school._id, { classId: classRow.id });

    // Steady 60/58/62 history: mean 60, sample stdDev 2 — a score of 20 is
    // 20 sigma below, unmistakably an outlier regardless of rounding.
    await seedSteadyHistory(models, school, student, subject, classRow, priorTerms, [60, 58, 62]);
    await runWithSchool(school._id, () => models.Result.create({
      schoolId: school._id, studentId: student.id, subjectId: subject.id, classId: classRow.id, academicTermId: currentTerm.id, classScore: 10, examScore: 10,
    }));

    const { password } = await fixtures.createAdmin(models, school._id, { email: 'admin3@outlier-test.local' });
    const token = await fixtures.login(app, school.slug, 'admin3@outlier-test.local', password);

    const res = await request(app).get('/api/results/anomalies').query({
      classId: classRow.id, subjectId: subject.id, academicTermId: currentTerm.id,
    }).set(fixtures.authHeader(token));

    expect(res.status).toBe(200);
    const entry = res.body.data.flags.find((f) => f.studentId === student.id);
    expect(entry).toBeDefined();
    expect(entry.flags.some((f) => f.type === 'statistical_outlier')).toBe(true);
  });

  test('GET /results/anomalies does NOT flag a score within normal variation of a steady history', async () => {
    const school = await fixtures.createSchool(models);
    const classRow = await fixtures.createClass(models, school._id);
    const subject = await fixtures.createSubject(models, school._id);
    const currentTerm = await fixtures.createTerm(models, school._id, { name: 'Term 3' });
    const priorTerms = await Promise.all([1, 2, 3].map((n) => fixtures.createTerm(models, school._id, { name: `Prior ${n}` })));
    const { student } = await fixtures.createStudent(models, school._id, { classId: classRow.id });

    await seedSteadyHistory(models, school, student, subject, classRow, priorTerms, [60, 58, 62]);
    await runWithSchool(school._id, () => models.Result.create({
      schoolId: school._id, studentId: student.id, subjectId: subject.id, classId: classRow.id, academicTermId: currentTerm.id, classScore: 30, examScore: 30,
    }));

    const { password } = await fixtures.createAdmin(models, school._id, { email: 'admin4@outlier-test.local' });
    const token = await fixtures.login(app, school.slug, 'admin4@outlier-test.local', password);

    const res = await request(app).get('/api/results/anomalies').query({
      classId: classRow.id, subjectId: subject.id, academicTermId: currentTerm.id,
    }).set(fixtures.authHeader(token));

    const entry = res.body.data.flags.find((f) => f.studentId === student.id);
    // 60 total is right at the historical mean, well inside 2.5 sigma — the
    // flag here (if any) may only be a performance_drop/discrepancy type,
    // never statistical_outlier.
    if (entry) {
      expect(entry.flags.some((f) => f.type === 'statistical_outlier')).toBe(false);
    }
  });

  test('does not flag a statistical_outlier with fewer than 3 prior terms of history', async () => {
    const school = await fixtures.createSchool(models);
    const classRow = await fixtures.createClass(models, school._id);
    const subject = await fixtures.createSubject(models, school._id);
    const currentTerm = await fixtures.createTerm(models, school._id, { name: 'Term 2' });
    const priorTerm = await fixtures.createTerm(models, school._id, { name: 'Prior 1' });
    const { student } = await fixtures.createStudent(models, school._id, { classId: classRow.id });

    await runWithSchool(school._id, () => models.Result.create({
      schoolId: school._id, studentId: student.id, subjectId: subject.id, classId: classRow.id, academicTermId: priorTerm.id, classScore: 30, examScore: 30,
    }));
    await runWithSchool(school._id, () => models.Result.create({
      schoolId: school._id, studentId: student.id, subjectId: subject.id, classId: classRow.id, academicTermId: currentTerm.id, classScore: 5, examScore: 5,
    }));

    const { password } = await fixtures.createAdmin(models, school._id, { email: 'admin5@outlier-test.local' });
    const token = await fixtures.login(app, school.slug, 'admin5@outlier-test.local', password);

    const res = await request(app).get('/api/results/anomalies').query({
      classId: classRow.id, subjectId: subject.id, academicTermId: currentTerm.id,
    }).set(fixtures.authHeader(token));

    const entry = res.body.data.flags.find((f) => f.studentId === student.id);
    if (entry) {
      expect(entry.flags.some((f) => f.type === 'statistical_outlier')).toBe(false);
    }
  });

  test('is tenant-isolated — another school\'s history never contributes to this school\'s stats', async () => {
    const otherSchool = await fixtures.createSchool(models);
    const otherClass = await fixtures.createClass(models, otherSchool._id);
    const otherSubject = await fixtures.createSubject(models, otherSchool._id);
    const otherTerm = await fixtures.createTerm(models, otherSchool._id);
    const { student: otherStudent } = await fixtures.createStudent(models, otherSchool._id, { classId: otherClass.id });
    await runWithSchool(otherSchool._id, () => models.Result.create({
      schoolId: otherSchool._id, studentId: otherStudent.id, subjectId: otherSubject.id, classId: otherClass.id, academicTermId: otherTerm.id, classScore: 50, examScore: 50,
    }));

    const school = await fixtures.createSchool(models);
    const classRow = await fixtures.createClass(models, school._id);
    const subject = await fixtures.createSubject(models, school._id);
    const term = await fixtures.createTerm(models, school._id);
    const { student } = await fixtures.createStudent(models, school._id, { classId: classRow.id });

    const { password } = await fixtures.createAdmin(models, school._id, { email: 'admin6@outlier-test.local' });
    const token = await fixtures.login(app, school.slug, 'admin6@outlier-test.local', password);

    const res = await request(app).get('/api/results/roster').query({
      classId: classRow.id, subjectId: subject.id, academicTermId: term.id,
    }).set(fixtures.authHeader(token));

    const row = res.body.data.find((r) => r.studentId === student.id);
    expect(row.historyCount).toBe(0);
  });
});
