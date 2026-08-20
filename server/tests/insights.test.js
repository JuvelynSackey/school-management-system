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

describe('Student Performance Insights', () => {
  test('computes an improving trend across two terms, plus strongest/needs-attention subjects for the latest term', async () => {
    const school = await fixtures.createSchool(models);
    const classRow = await fixtures.createClass(models, school._id);
    const subjectA = await fixtures.createSubject(models, school._id);
    const subjectB = await fixtures.createSubject(models, school._id);
    const priorTerm = await fixtures.createTerm(models, school._id, { termNumber: 1, isCurrent: false, startDate: new Date('2025-01-10') });
    const currentTerm = await fixtures.createTerm(models, school._id, { termNumber: 2, isCurrent: true, startDate: new Date('2025-05-10') });
    const { student } = await fixtures.createStudent(models, school._id, { classId: classRow.id });
    const { password } = await fixtures.createAdmin(models, school._id, { email: 'admin@insights-test.local' });
    const token = await fixtures.login(app, school.slug, 'admin@insights-test.local', password);

    // Prior term: only subjectA, totalScore 50 -> term average 50.
    // Current term: subjectA 90 (strongest) + subjectB 30 (needs attention) -> term average 60.
    // (60-50)/50 = +20% -> 'improving'.
    await createResult(school._id, {
      studentId: student.id, subjectId: subjectA.id, classId: classRow.id, academicTermId: priorTerm.id, classScore: 25, examScore: 25, totalScore: 50,
    });
    await createResult(school._id, {
      studentId: student.id, subjectId: subjectA.id, classId: classRow.id, academicTermId: currentTerm.id, classScore: 45, examScore: 45, totalScore: 90,
    });
    await createResult(school._id, {
      studentId: student.id, subjectId: subjectB.id, classId: classRow.id, academicTermId: currentTerm.id, classScore: 15, examScore: 15, totalScore: 30,
    });

    const res = await request(app).get(`/api/results/insights/${student.id}`).set(fixtures.authHeader(token));

    expect(res.status).toBe(200);
    expect(res.body.data.trend).toEqual({ direction: 'improving', deltaPercent: 20, termsCompared: 2 });
    expect(res.body.data.strongestSubjects).toEqual([{ subjectName: subjectA.name, percentage: 90 }]);
    expect(res.body.data.needsAttentionSubjects).toEqual([{ subjectName: subjectB.name, percentage: 30 }]);
    expect(res.body.data.aiNarrative).toBeNull();
  });

  test('a single term of history is not enough for a trend, but still reports strongest/weak subjects', async () => {
    const school = await fixtures.createSchool(models);
    const classRow = await fixtures.createClass(models, school._id);
    const subject = await fixtures.createSubject(models, school._id);
    const term = await fixtures.createTerm(models, school._id, { startDate: new Date('2025-01-10') });
    const { student } = await fixtures.createStudent(models, school._id, { classId: classRow.id });
    const { password } = await fixtures.createAdmin(models, school._id, { email: 'admin2@insights-test.local' });
    const token = await fixtures.login(app, school.slug, 'admin2@insights-test.local', password);

    await createResult(school._id, {
      studentId: student.id, subjectId: subject.id, classId: classRow.id, academicTermId: term.id, classScore: 45, examScore: 45, totalScore: 90,
    });

    const res = await request(app).get(`/api/results/insights/${student.id}`).set(fixtures.authHeader(token));
    expect(res.status).toBe(200);
    expect(res.body.data.trend).toEqual({ direction: null, deltaPercent: null, termsCompared: 1 });
    expect(res.body.data.strongestSubjects).toEqual([{ subjectName: subject.name, percentage: 90 }]);
  });

  test('a student with no results at all gets an empty, harmless response (not an error)', async () => {
    const school = await fixtures.createSchool(models);
    const classRow = await fixtures.createClass(models, school._id);
    const { student } = await fixtures.createStudent(models, school._id, { classId: classRow.id });
    const { password } = await fixtures.createAdmin(models, school._id, { email: 'admin3@insights-test.local' });
    const token = await fixtures.login(app, school.slug, 'admin3@insights-test.local', password);

    const res = await request(app).get(`/api/results/insights/${student.id}`).set(fixtures.authHeader(token));
    expect(res.status).toBe(200);
    expect(res.body.data.trend.termsCompared).toBe(0);
    expect(res.body.data.strongestSubjects).toEqual([]);
    expect(res.body.data.needsAttentionSubjects).toEqual([]);
  });

  describe('authorization', () => {
    test('a student can view their own insights but not another student\'s', async () => {
      const school = await fixtures.createSchool(models);
      const { user: userA, student: studentA, password: passwordA } = await fixtures.createStudent(models, school._id);
      const { student: studentB } = await fixtures.createStudent(models, school._id);
      const token = await fixtures.login(app, school.slug, userA.email, passwordA);

      const ownRes = await request(app).get(`/api/results/insights/${studentA.id}`).set(fixtures.authHeader(token));
      expect(ownRes.status).toBe(200);

      const otherRes = await request(app).get(`/api/results/insights/${studentB.id}`).set(fixtures.authHeader(token));
      expect(otherRes.status).toBe(403);
    });

    test('a parent can view a linked child\'s insights but not an unlinked child\'s', async () => {
      const school = await fixtures.createSchool(models);
      const { student: ownChild } = await fixtures.createStudent(models, school._id);
      const { student: otherChild } = await fixtures.createStudent(models, school._id);
      const { user: parentUser, password } = await fixtures.createParentWithChild(models, school._id, ownChild.id);
      const token = await fixtures.login(app, school.slug, parentUser.email, password);

      const ownRes = await request(app).get(`/api/results/insights/${ownChild.id}`).set(fixtures.authHeader(token));
      expect(ownRes.status).toBe(200);

      const otherRes = await request(app).get(`/api/results/insights/${otherChild.id}`).set(fixtures.authHeader(token));
      expect(otherRes.status).toBe(403);
    });

    test('a teacher not assigned to the student\'s class is rejected with 403', async () => {
      const school = await fixtures.createSchool(models);
      const classRow = await fixtures.createClass(models, school._id);
      const { student } = await fixtures.createStudent(models, school._id, { classId: classRow.id });
      const { user: teacherUser, password } = await fixtures.createTeacher(models, school._id);
      const token = await fixtures.login(app, school.slug, teacherUser.email, password);

      const res = await request(app).get(`/api/results/insights/${student.id}`).set(fixtures.authHeader(token));
      expect(res.status).toBe(403);
    });
  });

  describe('with a Gemini key present (network call mocked)', () => {
    const originalKey = process.env.GEMINI_API_KEY;
    const originalFetch = global.fetch;

    beforeEach(() => {
      process.env.GEMINI_API_KEY = 'test-fake-key';
      global.fetch = jest.fn(async () => ({
        ok: true,
        json: async () => ({ candidates: [{ content: { parts: [{ text: 'Ama has shown strong, consistent improvement this term.' }] } }] }),
      }));
    });

    afterEach(() => {
      process.env.GEMINI_API_KEY = originalKey;
      global.fetch = originalFetch;
    });

    test('adds an AI narrative when there\'s enough data, sending only the first name and computed summaries', async () => {
      const school = await fixtures.createSchool(models);
      const classRow = await fixtures.createClass(models, school._id);
      const subject = await fixtures.createSubject(models, school._id);
      const term = await fixtures.createTerm(models, school._id, { startDate: new Date('2025-01-10') });
      const { student } = await fixtures.createStudent(models, school._id, {
        classId: classRow.id, overrides: { firstName: 'Ama', lastName: 'DoNotLeakThisSurname' },
      });
      const { password } = await fixtures.createAdmin(models, school._id, { email: 'admin4@insights-test.local' });
      const token = await fixtures.login(app, school.slug, 'admin4@insights-test.local', password);

      await createResult(school._id, {
        studentId: student.id, subjectId: subject.id, classId: classRow.id, academicTermId: term.id, classScore: 45, examScore: 45, totalScore: 90,
      });

      const res = await request(app).get(`/api/results/insights/${student.id}`).set(fixtures.authHeader(token));
      expect(res.status).toBe(200);
      expect(res.body.data.aiNarrative).toBe('Ama has shown strong, consistent improvement this term.');

      const promptSent = JSON.parse(global.fetch.mock.calls[0][1].body).contents[0].parts[0].text;
      expect(promptSent).toContain('Ama');
      expect(promptSent).not.toContain('DoNotLeakThisSurname');
    });

    test('a student with no results at all gets no narrative, and the AI is never called', async () => {
      const school = await fixtures.createSchool(models);
      const classRow = await fixtures.createClass(models, school._id);
      const { student } = await fixtures.createStudent(models, school._id, { classId: classRow.id });
      const { password } = await fixtures.createAdmin(models, school._id, { email: 'admin5@insights-test.local' });
      const token = await fixtures.login(app, school.slug, 'admin5@insights-test.local', password);

      const res = await request(app).get(`/api/results/insights/${student.id}`).set(fixtures.authHeader(token));
      expect(res.status).toBe(200);
      expect(res.body.data.aiNarrative).toBeNull();
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });
});
