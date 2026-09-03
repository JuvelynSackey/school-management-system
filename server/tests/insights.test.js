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
// See ai.test.js — this dev environment has a real GEMINI_API_KEY in .env;
// tests that need AI configured set their own key explicitly, so this is safe.
beforeEach(() => { delete process.env.GEMINI_API_KEY; });

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
      process.env.GEMINI_API_KEY = 'AIzaSy-test-fake-key';
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

describe('Academic Progress History', () => {
  test('builds overall term averages and a per-subject score progression, ordered chronologically', async () => {
    const school = await fixtures.createSchool(models);
    const classRow = await fixtures.createClass(models, school._id);
    const subjectA = await fixtures.createSubject(models, school._id, { name: 'Mathematics' });
    const subjectB = await fixtures.createSubject(models, school._id, { name: 'Science' });
    const termOne = await fixtures.createTerm(models, school._id, { termNumber: 1, isCurrent: false, startDate: new Date('2025-01-10'), name: 'Term 1' });
    const termTwo = await fixtures.createTerm(models, school._id, { termNumber: 2, isCurrent: true, startDate: new Date('2025-05-10'), name: 'Term 2' });
    const { student } = await fixtures.createStudent(models, school._id, { classId: classRow.id });
    const { password } = await fixtures.createAdmin(models, school._id, { email: 'admin@history-test.local' });
    const token = await fixtures.login(app, school.slug, 'admin@history-test.local', password);

    // Term 1: Math 72 -> average 72. Term 2: Math 84, Science 60 -> average 72.
    await createResult(school._id, {
      studentId: student.id, subjectId: subjectA.id, classId: classRow.id, academicTermId: termOne.id, classScore: 36, examScore: 36, totalScore: 72,
    });
    await createResult(school._id, {
      studentId: student.id, subjectId: subjectA.id, classId: classRow.id, academicTermId: termTwo.id, classScore: 42, examScore: 42, totalScore: 84,
    });
    await createResult(school._id, {
      studentId: student.id, subjectId: subjectB.id, classId: classRow.id, academicTermId: termTwo.id, classScore: 30, examScore: 30, totalScore: 60,
    });

    const res = await request(app).get(`/api/results/academic-history/${student.id}`).set(fixtures.authHeader(token));

    expect(res.status).toBe(200);
    expect(res.body.data.overallHistory).toEqual([
      { term: 'Term 1', average: 72 },
      { term: 'Term 2', average: 72 },
    ]);
    expect(res.body.data.subjectHistory).toEqual([
      { subject: 'Mathematics', scores: [{ term: 'Term 1', score: 72 }, { term: 'Term 2', score: 84 }] },
      { subject: 'Science', scores: [{ term: 'Term 2', score: 60 }] },
    ]);
  });

  test('includes class-position history for admin/teacher, ordered by term', async () => {
    const school = await fixtures.createSchool(models);
    const classRow = await fixtures.createClass(models, school._id);
    const subject = await fixtures.createSubject(models, school._id);
    const termOne = await fixtures.createTerm(models, school._id, { termNumber: 1, isCurrent: false, startDate: new Date('2025-01-10'), name: 'Term 1' });
    const termTwo = await fixtures.createTerm(models, school._id, { termNumber: 2, isCurrent: true, startDate: new Date('2025-05-10'), name: 'Term 2' });
    const { student } = await fixtures.createStudent(models, school._id, { classId: classRow.id });
    const { password } = await fixtures.createAdmin(models, school._id, { email: 'admin8@history-test.local' });
    const token = await fixtures.login(app, school.slug, 'admin8@history-test.local', password);

    await createResult(school._id, {
      studentId: student.id, subjectId: subject.id, classId: classRow.id, academicTermId: termOne.id, classScore: 30, examScore: 30, totalScore: 60,
    });
    await createResult(school._id, {
      studentId: student.id, subjectId: subject.id, classId: classRow.id, academicTermId: termTwo.id, classScore: 40, examScore: 40, totalScore: 80,
    });
    const { TerminalReport } = models;
    await runWithSchool(school._id, async () => TerminalReport.create({
      schoolId: school._id, studentId: student.id, classId: classRow.id, academicTermId: termOne.id, classPosition: 5, status: 'Draft',
    }));
    await runWithSchool(school._id, async () => TerminalReport.create({
      schoolId: school._id, studentId: student.id, classId: classRow.id, academicTermId: termTwo.id, classPosition: 2, status: 'Published',
    }));

    const res = await request(app).get(`/api/results/academic-history/${student.id}`).set(fixtures.authHeader(token));
    expect(res.status).toBe(200);
    expect(res.body.data.positionHistory).toEqual([
      { term: 'Term 1', classPosition: 5 },
      { term: 'Term 2', classPosition: 2 },
    ]);
  });

  test('a student only sees class-position history from a Published report, not a Draft one', async () => {
    const school = await fixtures.createSchool(models);
    const classRow = await fixtures.createClass(models, school._id);
    const subject = await fixtures.createSubject(models, school._id);
    const termOne = await fixtures.createTerm(models, school._id, { termNumber: 1, isCurrent: false, startDate: new Date('2025-01-10'), name: 'Term 1' });
    const termTwo = await fixtures.createTerm(models, school._id, { termNumber: 2, isCurrent: true, startDate: new Date('2025-05-10'), name: 'Term 2' });
    const { user, student, password } = await fixtures.createStudent(models, school._id, { classId: classRow.id });

    await createResult(school._id, {
      studentId: student.id, subjectId: subject.id, classId: classRow.id, academicTermId: termOne.id, classScore: 30, examScore: 30, totalScore: 60,
    });
    await createResult(school._id, {
      studentId: student.id, subjectId: subject.id, classId: classRow.id, academicTermId: termTwo.id, classScore: 40, examScore: 40, totalScore: 80,
    });
    const { ResultSheet, TerminalReport } = models;
    await runWithSchool(school._id, async () => ResultSheet.create({
      schoolId: school._id, classId: classRow.id, subjectId: subject.id, academicTermId: termOne.id, status: 'Approved',
    }));
    await runWithSchool(school._id, async () => ResultSheet.create({
      schoolId: school._id, classId: classRow.id, subjectId: subject.id, academicTermId: termTwo.id, status: 'Approved',
    }));
    await runWithSchool(school._id, async () => TerminalReport.create({
      schoolId: school._id, studentId: student.id, classId: classRow.id, academicTermId: termOne.id, classPosition: 5, status: 'Draft',
    }));
    await runWithSchool(school._id, async () => TerminalReport.create({
      schoolId: school._id, studentId: student.id, classId: classRow.id, academicTermId: termTwo.id, classPosition: 2, status: 'Published',
    }));

    const token = await fixtures.login(app, school.slug, user.email, password);
    const res = await request(app).get(`/api/results/academic-history/${student.id}`).set(fixtures.authHeader(token));
    expect(res.status).toBe(200);
    expect(res.body.data.positionHistory).toEqual([{ term: 'Term 2', classPosition: 2 }]);
  });

  test('a student with no results at all gets an empty, harmless response', async () => {
    const school = await fixtures.createSchool(models);
    const classRow = await fixtures.createClass(models, school._id);
    const { student } = await fixtures.createStudent(models, school._id, { classId: classRow.id });
    const { password } = await fixtures.createAdmin(models, school._id, { email: 'admin7@history-test.local' });
    const token = await fixtures.login(app, school.slug, 'admin7@history-test.local', password);

    const res = await request(app).get(`/api/results/academic-history/${student.id}`).set(fixtures.authHeader(token));
    expect(res.status).toBe(200);
    expect(res.body.data.overallHistory).toEqual([]);
    expect(res.body.data.subjectHistory).toEqual([]);
    expect(res.body.data.positionHistory).toEqual([]);
  });

  test('a student only sees scores from an Approved sheet in their own history, not a Draft one', async () => {
    const school = await fixtures.createSchool(models);
    const classRow = await fixtures.createClass(models, school._id);
    const subjectApproved = await fixtures.createSubject(models, school._id, { name: 'Approved Subject' });
    const subjectDraft = await fixtures.createSubject(models, school._id, { name: 'Draft Subject' });
    const term = await fixtures.createTerm(models, school._id, { startDate: new Date('2025-01-10') });
    const { user, student, password } = await fixtures.createStudent(models, school._id, { classId: classRow.id });

    await createResult(school._id, {
      studentId: student.id, subjectId: subjectApproved.id, classId: classRow.id, academicTermId: term.id, classScore: 40, examScore: 40, totalScore: 80,
    });
    await createResult(school._id, {
      studentId: student.id, subjectId: subjectDraft.id, classId: classRow.id, academicTermId: term.id, classScore: 20, examScore: 20, totalScore: 40,
    });
    const { ResultSheet } = models;
    await runWithSchool(school._id, async () => ResultSheet.create({
      schoolId: school._id, classId: classRow.id, subjectId: subjectApproved.id, academicTermId: term.id, status: 'Approved',
    }));
    await runWithSchool(school._id, async () => ResultSheet.create({
      schoolId: school._id, classId: classRow.id, subjectId: subjectDraft.id, academicTermId: term.id, status: 'Draft',
    }));

    const token = await fixtures.login(app, school.slug, user.email, password);
    const res = await request(app).get(`/api/results/academic-history/${student.id}`).set(fixtures.authHeader(token));

    expect(res.status).toBe(200);
    expect(res.body.data.subjectHistory).toEqual([{ subject: 'Approved Subject', scores: [{ term: term.name, score: 80 }] }]);
  });

  test('a student cannot view another student\'s academic history', async () => {
    const school = await fixtures.createSchool(models);
    const { user: userA, student: studentA, password: passwordA } = await fixtures.createStudent(models, school._id);
    const { student: studentB } = await fixtures.createStudent(models, school._id);
    const token = await fixtures.login(app, school.slug, userA.email, passwordA);

    const ownRes = await request(app).get(`/api/results/academic-history/${studentA.id}`).set(fixtures.authHeader(token));
    expect(ownRes.status).toBe(200);

    const otherRes = await request(app).get(`/api/results/academic-history/${studentB.id}`).set(fixtures.authHeader(token));
    expect(otherRes.status).toBe(403);
  });
});
