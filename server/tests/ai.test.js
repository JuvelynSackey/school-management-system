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

const createDraftReport = async (schoolId, overrides = {}) => {
  const { TerminalReport } = models;
  return runWithSchool(schoolId, async () => TerminalReport.create({ status: 'Draft', ...overrides }));
};

describe('AI Remark Assistant', () => {
  test('is disabled by default (no GEMINI_API_KEY) and returns a clear 503, not a crash', async () => {
    const school = await fixtures.createSchool(models);
    const classRow = await fixtures.createClass(models, school._id);
    const term = await fixtures.createTerm(models, school._id);
    const { student } = await fixtures.createStudent(models, school._id, { classId: classRow.id });
    const { password } = await fixtures.createAdmin(models, school._id, { email: 'admin@ai-test.local' });
    const token = await fixtures.login(app, school.slug, 'admin@ai-test.local', password);

    const report = await createDraftReport(school._id, {
      schoolId: school._id, studentId: student.id, classId: classRow.id, academicTermId: term.id, averageScore: 75,
    });

    const res = await request(app).post('/api/ai/remarks/suggest').set(fixtures.authHeader(token)).send({ reportId: report.id });
    expect(res.status).toBe(503);
    expect(res.body.code).toBe('AI_NOT_CONFIGURED');
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
      process.env.GEMINI_API_KEY = 'test-fake-key';
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

      const promptSent = JSON.parse(global.fetch.mock.calls[0][1].body).contents[0].parts[0].text;
      expect(promptSent).toContain('Ama');
      expect(promptSent).not.toContain('DoNotLeakThisSurname');

      const { AuditLog } = models;
      const logs = await runWithSchool(school._id, async () => AuditLog.find({ action: 'ai.remarkSuggested' }));
      expect(logs.length).toBe(1);
    });
  });
});
