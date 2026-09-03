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
// This dev environment has a real GEMINI_API_KEY in .env, which the "no
// GEMINI_API_KEY configured" tests below assume is absent by default —
// every test that needs AI configured already sets its own key explicitly,
// so clearing it here is safe and matches what a real CI/prod-unconfigured
// environment would see.
beforeEach(() => { delete process.env.GEMINI_API_KEY; });

const createDraftReport = async (schoolId, overrides = {}) => {
  const { TerminalReport } = models;
  return runWithSchool(schoolId, async () => TerminalReport.create({ status: 'Draft', ...overrides }));
};

const createResult = async (schoolId, fields) => {
  const { Result } = models;
  return runWithSchool(schoolId, async () => Result.create({ schoolId, ...fields }));
};

describe('AI Remark Assistant', () => {
  test('with no GEMINI_API_KEY configured, falls back to the deterministic templates instead of erroring', async () => {
    const school = await fixtures.createSchool(models);
    const classRow = await fixtures.createClass(models, school._id);
    const term = await fixtures.createTerm(models, school._id);
    const { student } = await fixtures.createStudent(models, school._id, { classId: classRow.id, overrides: { firstName: 'Ama' } });
    const { password } = await fixtures.createAdmin(models, school._id, { email: 'admin@ai-test.local' });
    const token = await fixtures.login(app, school.slug, 'admin@ai-test.local', password);

    const report = await createDraftReport(school._id, {
      schoolId: school._id, studentId: student.id, classId: classRow.id, academicTermId: term.id, averageScore: 75,
    });

    const res = await request(app).post('/api/ai/remarks/suggest').set(fixtures.authHeader(token)).send({ reportId: report.id });
    expect(res.status).toBe(200);
    expect(res.body.data.fallbackMode).toBe(true);
    expect(res.body.data.suggestions).toHaveLength(3);
    res.body.data.suggestions.forEach((s) => expect(s).toContain('Ama'));
  });

  test('fallback templates are banded by score — a low average gets a supportive, not congratulatory, remark', async () => {
    const school = await fixtures.createSchool(models);
    const classRow = await fixtures.createClass(models, school._id);
    const term = await fixtures.createTerm(models, school._id);
    const { student } = await fixtures.createStudent(models, school._id, { classId: classRow.id, overrides: { firstName: 'Kofi' } });
    const { password } = await fixtures.createAdmin(models, school._id, { email: 'admin5@ai-test.local' });
    const token = await fixtures.login(app, school.slug, 'admin5@ai-test.local', password);

    const report = await createDraftReport(school._id, {
      schoolId: school._id, studentId: student.id, classId: classRow.id, academicTermId: term.id, averageScore: 42,
    });

    const res = await request(app).post('/api/ai/remarks/suggest').set(fixtures.authHeader(token)).send({ reportId: report.id });
    expect(res.status).toBe(200);
    expect(res.body.data.fallbackMode).toBe(true);
    expect(res.body.data.suggestions.join(' ')).toMatch(/support|foundation|room to grow/i);
  });

  test('a failed live AI request falls back to templates rather than surfacing an error', async () => {
    const originalKey = process.env.GEMINI_API_KEY;
    const originalFetch = global.fetch;
    process.env.GEMINI_API_KEY = 'AIzaSy-test-fake-key';
    global.fetch = jest.fn(async () => ({ ok: false, status: 500 }));

    try {
      const school = await fixtures.createSchool(models);
      const classRow = await fixtures.createClass(models, school._id);
      const term = await fixtures.createTerm(models, school._id);
      const { student } = await fixtures.createStudent(models, school._id, { classId: classRow.id });
      const { password } = await fixtures.createAdmin(models, school._id, { email: 'admin6@ai-test.local' });
      const token = await fixtures.login(app, school.slug, 'admin6@ai-test.local', password);

      const report = await createDraftReport(school._id, {
        schoolId: school._id, studentId: student.id, classId: classRow.id, academicTermId: term.id, averageScore: 75,
      });

      const res = await request(app).post('/api/ai/remarks/suggest').set(fixtures.authHeader(token)).send({ reportId: report.id });
      expect(res.status).toBe(200);
      expect(res.body.data.fallbackMode).toBe(true);
      expect(res.body.data.suggestions).toHaveLength(3);
    } finally {
      process.env.GEMINI_API_KEY = originalKey;
      global.fetch = originalFetch;
    }
  });

  test('rejects a malformed reportId as a validation error', async () => {
    const school = await fixtures.createSchool(models);
    const { password } = await fixtures.createAdmin(models, school._id, { email: 'admin2@ai-test.local' });
    const token = await fixtures.login(app, school.slug, 'admin2@ai-test.local', password);

    const res = await request(app).post('/api/ai/remarks/suggest').set(fixtures.authHeader(token)).send({ reportId: 'not-an-id' });
    expect(res.status).toBe(400);
  });

  describe('with a Gemini key present (the network call itself is mocked)', () => {
    const originalKey = process.env.GEMINI_API_KEY;
    const originalFetch = global.fetch;

    beforeEach(() => {
      process.env.GEMINI_API_KEY = 'AIzaSy-test-fake-key';
      global.fetch = jest.fn(async () => ({
        ok: true,
        json: async () => ({
          candidates: [{
            content: {
              parts: [{
                text: JSON.stringify([
                  'Has shown consistent effort this term.',
                  'A pleasure to teach — keep up the good work.',
                  'Encouraged to participate more actively in class.',
                ]),
              }],
            },
          }],
        }),
      }));
    });

    afterEach(() => {
      process.env.GEMINI_API_KEY = originalKey;
      global.fetch = originalFetch;
    });

    test('a teacher not assigned to the class is rejected with 403 before the AI is ever called', async () => {
      const school = await fixtures.createSchool(models);
      const classRow = await fixtures.createClass(models, school._id);
      const term = await fixtures.createTerm(models, school._id);
      const { student } = await fixtures.createStudent(models, school._id, { classId: classRow.id });
      const { user: teacherUser, password } = await fixtures.createTeacher(models, school._id);

      const report = await createDraftReport(school._id, {
        schoolId: school._id, studentId: student.id, classId: classRow.id, academicTermId: term.id, averageScore: 75,
      });

      const token = await fixtures.login(app, school.slug, teacherUser.email, password);
      const res = await request(app).post('/api/ai/remarks/suggest').set(fixtures.authHeader(token)).send({ reportId: report.id });

      expect(res.status).toBe(403);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    test('a Locked report is rejected — suggestions aren\'t offered once editing is closed', async () => {
      const school = await fixtures.createSchool(models);
      const classRow = await fixtures.createClass(models, school._id);
      const term = await fixtures.createTerm(models, school._id);
      const { student } = await fixtures.createStudent(models, school._id, { classId: classRow.id });
      const { password } = await fixtures.createAdmin(models, school._id, { email: 'admin3@ai-test.local' });
      const token = await fixtures.login(app, school.slug, 'admin3@ai-test.local', password);

      const report = await createDraftReport(school._id, {
        schoolId: school._id, studentId: student.id, classId: classRow.id, academicTermId: term.id, averageScore: 75, status: 'Locked',
      });

      const res = await request(app).post('/api/ai/remarks/suggest').set(fixtures.authHeader(token)).send({ reportId: report.id });
      expect(res.status).toBe(400);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    test('an authorized admin gets 3 suggestions, the prompt carries only the student\'s first name, and generation is audit-logged', async () => {
      const school = await fixtures.createSchool(models);
      const classRow = await fixtures.createClass(models, school._id);
      const term = await fixtures.createTerm(models, school._id);
      const { student } = await fixtures.createStudent(models, school._id, {
        classId: classRow.id, overrides: { firstName: 'Ama', lastName: 'DoNotLeakThisSurname' },
      });
      const { password } = await fixtures.createAdmin(models, school._id, { email: 'admin4@ai-test.local' });
      const token = await fixtures.login(app, school.slug, 'admin4@ai-test.local', password);

      const report = await createDraftReport(school._id, {
        schoolId: school._id, studentId: student.id, classId: classRow.id, academicTermId: term.id, averageScore: 75, classPosition: 2, totalAttendance: 90, outOfAttendance: 100,
      });

      const res = await request(app).post('/api/ai/remarks/suggest').set(fixtures.authHeader(token)).send({ reportId: report.id });

      expect(res.status).toBe(200);
      expect(res.body.data.suggestions).toHaveLength(3);
      expect(res.body.data.fallbackMode).toBe(false);

      const promptSent = JSON.parse(global.fetch.mock.calls[0][1].body).contents[0].parts[0].text;
      expect(promptSent).toContain('Ama');
      expect(promptSent).not.toContain('DoNotLeakThisSurname');

      const { AuditLog } = models;
      const logs = await runWithSchool(school._id, async () => AuditLog.find({ action: 'ai.remarkSuggested' }));
      expect(logs.length).toBe(1);
    });
  });
});

describe('Headteacher Remark Assistant', () => {
  test('allows a suggestion while Submitted, unlike the teacher remarkType which stays Draft/Rejected-only', async () => {
    const school = await fixtures.createSchool(models);
    const classRow = await fixtures.createClass(models, school._id);
    const term = await fixtures.createTerm(models, school._id);
    const { student } = await fixtures.createStudent(models, school._id, { classId: classRow.id, overrides: { firstName: 'Efua' } });
    const { password } = await fixtures.createAdmin(models, school._id, { email: 'admin7@ai-test.local' });
    const token = await fixtures.login(app, school.slug, 'admin7@ai-test.local', password);

    const report = await createDraftReport(school._id, {
      schoolId: school._id, studentId: student.id, classId: classRow.id, academicTermId: term.id, averageScore: 75, status: 'Submitted',
    });

    const teacherRes = await request(app).post('/api/ai/remarks/suggest').set(fixtures.authHeader(token))
      .send({ reportId: report.id, remarkType: 'teacher' });
    expect(teacherRes.status).toBe(400);

    const headteacherRes = await request(app).post('/api/ai/remarks/suggest').set(fixtures.authHeader(token))
      .send({ reportId: report.id, remarkType: 'headteacher' });
    expect(headteacherRes.status).toBe(200);
    expect(headteacherRes.body.data.fallbackMode).toBe(true);
    expect(headteacherRes.body.data.suggestions).toHaveLength(3);
  });

  test('the fallback headteacher templates are a distinct, shorter voice from the teacher templates', async () => {
    const school = await fixtures.createSchool(models);
    const classRow = await fixtures.createClass(models, school._id);
    const term = await fixtures.createTerm(models, school._id);
    const { student } = await fixtures.createStudent(models, school._id, { classId: classRow.id, overrides: { firstName: 'Kwabena' } });
    const { password } = await fixtures.createAdmin(models, school._id, { email: 'admin8@ai-test.local' });
    const token = await fixtures.login(app, school.slug, 'admin8@ai-test.local', password);

    const report = await createDraftReport(school._id, {
      schoolId: school._id, studentId: student.id, classId: classRow.id, academicTermId: term.id, averageScore: 90,
    });

    const teacherRes = await request(app).post('/api/ai/remarks/suggest').set(fixtures.authHeader(token))
      .send({ reportId: report.id, remarkType: 'teacher' });
    const headteacherRes = await request(app).post('/api/ai/remarks/suggest').set(fixtures.authHeader(token))
      .send({ reportId: report.id, remarkType: 'headteacher' });

    expect(teacherRes.body.data.suggestions).not.toEqual(headteacherRes.body.data.suggestions);
    // The headteacher fallback templates are a one-line sign-off — meaningfully
    // shorter than the teacher's more detailed remark, on average.
    const avgLen = (arr) => arr.reduce((sum, s) => sum + s.length, 0) / arr.length;
    expect(avgLen(headteacherRes.body.data.suggestions)).toBeLessThan(avgLen(teacherRes.body.data.suggestions));
  });

  test('a teacher with real class access still cannot request a headteacher remark suggestion', async () => {
    const school = await fixtures.createSchool(models);
    const classRow = await fixtures.createClass(models, school._id);
    const subject = await fixtures.createSubject(models, school._id);
    const term = await fixtures.createTerm(models, school._id);
    const { teacher, user: teacherUser, password: teacherPassword } = await fixtures.createTeacher(models, school._id);
    await fixtures.assignSubjectToClass(models, school._id, { classId: classRow.id, subjectId: subject.id });
    await fixtures.assignTeacherToClass(models, school._id, { teacherId: teacher.id, subjectId: subject.id, classId: classRow.id });
    const { student } = await fixtures.createStudent(models, school._id, { classId: classRow.id });
    const teacherToken = await fixtures.login(app, school.slug, teacherUser.email, teacherPassword);

    const report = await createDraftReport(school._id, {
      schoolId: school._id, studentId: student.id, classId: classRow.id, academicTermId: term.id, averageScore: 75,
    });

    // Same teacher can request their own remarkType fine — proves the 403
    // below is specifically about remarkType, not a broader access problem.
    const teacherOwnRes = await request(app).post('/api/ai/remarks/suggest').set(fixtures.authHeader(teacherToken))
      .send({ reportId: report.id, remarkType: 'teacher' });
    expect(teacherOwnRes.status).toBe(200);

    const headteacherRes = await request(app).post('/api/ai/remarks/suggest').set(fixtures.authHeader(teacherToken))
      .send({ reportId: report.id, remarkType: 'headteacher' });
    expect(headteacherRes.status).toBe(403);
  });
});

describe('Announcement Composer', () => {
  test('with no GEMINI_API_KEY, falls back to tone templates that carry the exact objective text', async () => {
    const school = await fixtures.createSchool(models);
    const { password } = await fixtures.createAdmin(models, school._id, { email: 'admin@announce-test.local' });
    const token = await fixtures.login(app, school.slug, 'admin@announce-test.local', password);

    const res = await request(app).post('/api/ai/compose-announcement').set(fixtures.authHeader(token)).send({
      objective: 'PTA meeting this Friday at 3pm', tone: 'friendly', targetType: 'school',
    });

    expect(res.status).toBe(200);
    expect(res.body.data.fallbackMode).toBe(true);
    expect(res.body.data.suggestions).toHaveLength(3);
    res.body.data.suggestions.forEach((s) => expect(s).toContain('PTA meeting this Friday at 3pm'));
  });

  test('a teacher cannot compose an announcement — only admins can create one', async () => {
    const school = await fixtures.createSchool(models);
    const { user, password } = await fixtures.createTeacher(models, school._id);
    const token = await fixtures.login(app, school.slug, user.email, password);

    const res = await request(app).post('/api/ai/compose-announcement').set(fixtures.authHeader(token)).send({
      objective: 'Test', tone: 'formal', targetType: 'school',
    });
    expect(res.status).toBe(403);
  });

  test('rejects an unknown tone as a validation error', async () => {
    const school = await fixtures.createSchool(models);
    const { password } = await fixtures.createAdmin(models, school._id, { email: 'admin2@announce-test.local' });
    const token = await fixtures.login(app, school.slug, 'admin2@announce-test.local', password);

    const res = await request(app).post('/api/ai/compose-announcement').set(fixtures.authHeader(token)).send({
      objective: 'Test', tone: 'sarcastic', targetType: 'school',
    });
    expect(res.status).toBe(400);
  });

  test('resolves targetType=class into the actual class name for phrasing context', async () => {
    const school = await fixtures.createSchool(models);
    const classRow = await fixtures.createClass(models, school._id, { name: 'JHS 2' });
    const { password } = await fixtures.createAdmin(models, school._id, { email: 'admin3@announce-test.local' });
    const token = await fixtures.login(app, school.slug, 'admin3@announce-test.local', password);

    process.env.GEMINI_API_KEY = 'AIzaSy-test-fake-key';
    global.fetch = jest.fn(async () => ({
      ok: true,
      json: async () => ({ candidates: [{ content: { parts: [{ text: JSON.stringify(['a', 'b', 'c']) }] } }] }),
    }));
    try {
      const res = await request(app).post('/api/ai/compose-announcement').set(fixtures.authHeader(token)).send({
        objective: 'Sports day', tone: 'formal', targetType: 'class', targetClassId: classRow.id,
      });
      expect(res.status).toBe(200);
      const promptSent = JSON.parse(global.fetch.mock.calls[0][1].body).contents[0].parts[0].text;
      expect(promptSent).toContain('JHS 2');
    } finally {
      delete process.env.GEMINI_API_KEY;
      delete global.fetch;
    }
  });
});

describe('AI Performance Summary', () => {
  test('with no GEMINI_API_KEY, derives key strengths and areas for attention from computed averages', async () => {
    const school = await fixtures.createSchool(models);
    const classRow = await fixtures.createClass(models, school._id);
    const strongSubject = await fixtures.createSubject(models, school._id, { name: 'Mathematics' });
    const weakSubject = await fixtures.createSubject(models, school._id, { name: 'Science' });
    const term = await fixtures.createTerm(models, school._id, { isCurrent: true });
    const { student: studentA } = await fixtures.createStudent(models, school._id, { classId: classRow.id });
    const { student: studentB } = await fixtures.createStudent(models, school._id, { classId: classRow.id });
    const { password } = await fixtures.createAdmin(models, school._id, { email: 'admin@perf-test.local' });
    const token = await fixtures.login(app, school.slug, 'admin@perf-test.local', password);

    await createResult(school._id, {
      studentId: studentA.id, subjectId: strongSubject.id, classId: classRow.id, academicTermId: term.id, classScore: 45, examScore: 45, totalScore: 90,
    });
    await createResult(school._id, {
      studentId: studentB.id, subjectId: strongSubject.id, classId: classRow.id, academicTermId: term.id, classScore: 42, examScore: 42, totalScore: 84,
    });
    await createResult(school._id, {
      studentId: studentA.id, subjectId: weakSubject.id, classId: classRow.id, academicTermId: term.id, classScore: 15, examScore: 15, totalScore: 30,
    });
    await createResult(school._id, {
      studentId: studentB.id, subjectId: weakSubject.id, classId: classRow.id, academicTermId: term.id, classScore: 18, examScore: 18, totalScore: 36,
    });

    const res = await request(app).get(`/api/ai/performance-summary?academicTermId=${term.id}`).set(fixtures.authHeader(token));

    expect(res.status).toBe(200);
    expect(res.body.data.fallbackMode).toBe(true);
    expect(res.body.data.keyStrengths.join(' ')).toContain('Mathematics');
    expect(res.body.data.areasForAttention.join(' ')).toContain('Science');
    expect(res.body.data.recommendations.length).toBeGreaterThan(0);
  });

  test('a term with no results at all gets an empty, harmless response', async () => {
    const school = await fixtures.createSchool(models);
    const term = await fixtures.createTerm(models, school._id);
    const { password } = await fixtures.createAdmin(models, school._id, { email: 'admin2@perf-test.local' });
    const token = await fixtures.login(app, school.slug, 'admin2@perf-test.local', password);

    const res = await request(app).get(`/api/ai/performance-summary?academicTermId=${term.id}`).set(fixtures.authHeader(token));
    expect(res.status).toBe(200);
    expect(res.body.data.keyStrengths).toEqual([]);
    expect(res.body.data.areasForAttention).toEqual([]);
  });

  test('an unknown academicTermId is rejected with 404', async () => {
    const school = await fixtures.createSchool(models);
    const { password } = await fixtures.createAdmin(models, school._id, { email: 'admin3@perf-test.local' });
    const token = await fixtures.login(app, school.slug, 'admin3@perf-test.local', password);

    const res = await request(app).get(`/api/ai/performance-summary?academicTermId=${new models.mongoose.Types.ObjectId()}`).set(fixtures.authHeader(token));
    expect(res.status).toBe(404);
  });

  test('a teacher cannot request the school-wide performance summary', async () => {
    const school = await fixtures.createSchool(models);
    const term = await fixtures.createTerm(models, school._id);
    const { user, password } = await fixtures.createTeacher(models, school._id);
    const token = await fixtures.login(app, school.slug, user.email, password);

    const res = await request(app).get(`/api/ai/performance-summary?academicTermId=${term.id}`).set(fixtures.authHeader(token));
    expect(res.status).toBe(403);
  });
});
