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

describe('Academic Anomaly Detection', () => {
  test('flags a sharp drop vs. a student\'s own subject history, and a class/exam score gap — but flags nothing for a normal, consistent student', async () => {
    const school = await fixtures.createSchool(models);
    const classRow = await fixtures.createClass(models, school._id);
    const subject = await fixtures.createSubject(models, school._id);
    const priorTerm = await fixtures.createTerm(models, school._id, { termNumber: 1, isCurrent: false });
    const currentTerm = await fixtures.createTerm(models, school._id, { termNumber: 2, isCurrent: true });
    const { student: studentA } = await fixtures.createStudent(models, school._id, { classId: classRow.id });
    const { student: studentB } = await fixtures.createStudent(models, school._id, { classId: classRow.id });
    const { password } = await fixtures.createAdmin(models, school._id, { email: 'admin@anomaly-test.local' });
    const token = await fixtures.login(app, school.slug, 'admin@anomaly-test.local', password);

    // Student A: strong history (90), then a sharp drop AND a class/exam gap this term.
    await createResult(school._id, {
      studentId: studentA.id, subjectId: subject.id, classId: classRow.id, academicTermId: priorTerm.id, classScore: 45, examScore: 45, totalScore: 90,
    });
    await createResult(school._id, {
      studentId: studentA.id, subjectId: subject.id, classId: classRow.id, academicTermId: currentTerm.id, classScore: 45, examScore: 5, totalScore: 50,
    });
    // Student B: no history, balanced class/exam split — nothing to flag.
    await createResult(school._id, {
      studentId: studentB.id, subjectId: subject.id, classId: classRow.id, academicTermId: currentTerm.id, classScore: 25, examScore: 25, totalScore: 50,
    });

    const res = await request(app).get('/api/results/anomalies').query({
      classId: classRow.id, subjectId: subject.id, academicTermId: currentTerm.id,
    }).set(fixtures.authHeader(token));

    expect(res.status).toBe(200);
    const byStudent = new Map(res.body.data.flags.map((f) => [f.studentId, f.flags.map((x) => x.type)]));
    expect(byStudent.get(studentA.id).sort()).toEqual(['performance_drop', 'score_discrepancy']);
    expect(byStudent.has(studentB.id)).toBe(false);
    // No key configured in this default test env — enrichment is skipped, not broken.
    expect(res.body.data.aiSummary).toBeNull();
  });

  test('a teacher not assigned to the class is rejected with 403', async () => {
    const school = await fixtures.createSchool(models);
    const classRow = await fixtures.createClass(models, school._id);
    const subject = await fixtures.createSubject(models, school._id);
    const term = await fixtures.createTerm(models, school._id);
    const { user: teacherUser, password } = await fixtures.createTeacher(models, school._id);
    const token = await fixtures.login(app, school.slug, teacherUser.email, password);

    const res = await request(app).get('/api/results/anomalies').query({
      classId: classRow.id, subjectId: subject.id, academicTermId: term.id,
    }).set(fixtures.authHeader(token));
    expect(res.status).toBe(403);
  });

  test('flags are advisory only — approving a sheet with flagged students still succeeds', async () => {
    const school = await fixtures.createSchool(models);
    const classRow = await fixtures.createClass(models, school._id);
    const subject = await fixtures.createSubject(models, school._id);
    const term = await fixtures.createTerm(models, school._id);
    const { teacher, user: teacherUser, password: teacherPassword } = await fixtures.createTeacher(models, school._id);
    await fixtures.assignSubjectToClass(models, school._id, { classId: classRow.id, subjectId: subject.id, academicTermId: term.id });
    await fixtures.assignTeacherToClass(models, school._id, { teacherId: teacher.id, subjectId: subject.id, classId: classRow.id });
    const { student } = await fixtures.createStudent(models, school._id, { classId: classRow.id });
    const { password: adminPassword } = await fixtures.createAdmin(models, school._id, { email: 'admin2@anomaly-test.local' });

    const teacherToken = await fixtures.login(app, school.slug, teacherUser.email, teacherPassword);
    const adminToken = await fixtures.login(app, school.slug, 'admin2@anomaly-test.local', adminPassword);

    // A blatant class/exam discrepancy — would be flagged — but recordBulk
    // and approve don't consult anomaly detection at all, so neither should care.
    await request(app).post('/api/results/bulk').set(fixtures.authHeader(teacherToken)).send({
      classId: classRow.id, subjectId: subject.id, academicTermId: term.id,
      records: [{ studentId: student.id, classScore: 50, examScore: 0 }],
    });
    const sheets = await request(app).get('/api/result-sheets').query({ classId: classRow.id, academicTermId: term.id }).set(fixtures.authHeader(teacherToken));
    const sheet = sheets.body.data.find((s) => s.subjectId === subject.id);
    await request(app).post(`/api/result-sheets/${sheet.id}/submit`).set(fixtures.authHeader(teacherToken));
    const approveRes = await request(app).post(`/api/result-sheets/${sheet.id}/approve`).set(fixtures.authHeader(adminToken));

    expect(approveRes.status).toBe(200);
  });

  describe('with a DeepSeek key present (network call mocked)', () => {
    const originalKey = process.env.DEEPSEEK_API_KEY;
    const originalFetch = global.fetch;

    beforeEach(() => {
      process.env.DEEPSEEK_API_KEY = 'test-fake-deepseek-key';
      global.fetch = jest.fn(async () => ({
        ok: true,
        json: async () => ({ choices: [{ message: { content: 'These look like genuine performance changes worth a closer look.' } }] }),
      }));
    });

    afterEach(() => {
      process.env.DEEPSEEK_API_KEY = originalKey;
      global.fetch = originalFetch;
    });

    test('adds an AI summary when flags exist, and never sends a studentId or name to the model', async () => {
      const school = await fixtures.createSchool(models);
      const classRow = await fixtures.createClass(models, school._id);
      const subject = await fixtures.createSubject(models, school._id);
      const term = await fixtures.createTerm(models, school._id);
      const { student } = await fixtures.createStudent(models, school._id, {
        classId: classRow.id, overrides: { firstName: 'Kojo', lastName: 'ShouldNeverBeSent' },
      });
      const { password } = await fixtures.createAdmin(models, school._id, { email: 'admin3@anomaly-test.local' });
      const token = await fixtures.login(app, school.slug, 'admin3@anomaly-test.local', password);

      await createResult(school._id, {
        studentId: student.id, subjectId: subject.id, classId: classRow.id, academicTermId: term.id, classScore: 50, examScore: 0, totalScore: 50,
      });

      const res = await request(app).get('/api/results/anomalies').query({
        classId: classRow.id, subjectId: subject.id, academicTermId: term.id,
      }).set(fixtures.authHeader(token));

      expect(res.status).toBe(200);
      expect(res.body.data.aiSummary).toBe('These look like genuine performance changes worth a closer look.');

      const promptSent = JSON.parse(global.fetch.mock.calls[0][1].body).messages[0].content;
      expect(promptSent).not.toContain('Kojo');
      expect(promptSent).not.toContain('ShouldNeverBeSent');
      expect(promptSent).not.toContain(String(student.id));
    });

    test('a sheet with no flagged students gets no AI summary, and the AI is never called', async () => {
      const school = await fixtures.createSchool(models);
      const classRow = await fixtures.createClass(models, school._id);
      const subject = await fixtures.createSubject(models, school._id);
      const term = await fixtures.createTerm(models, school._id);
      const { student } = await fixtures.createStudent(models, school._id, { classId: classRow.id });
      const { password } = await fixtures.createAdmin(models, school._id, { email: 'admin4@anomaly-test.local' });
      const token = await fixtures.login(app, school.slug, 'admin4@anomaly-test.local', password);

      await createResult(school._id, {
        studentId: student.id, subjectId: subject.id, classId: classRow.id, academicTermId: term.id, classScore: 25, examScore: 25, totalScore: 50,
      });

      const res = await request(app).get('/api/results/anomalies').query({
        classId: classRow.id, subjectId: subject.id, academicTermId: term.id,
      }).set(fixtures.authHeader(token));

      expect(res.status).toBe(200);
      expect(res.body.data.flags).toEqual([]);
      expect(res.body.data.aiSummary).toBeNull();
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });
});
