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

// Mocks the AI call's TEXT response for the intent-interpretation step, and
// lets the (separate) summary call return a fixed sentence — matching how
// ai.service.js makes two independent fetch calls per query.
const mockAI = (intentJsonText, summaryText = 'Here is a summary.') => {
  let call = 0;
  global.fetch = jest.fn(async () => {
    call += 1;
    const content = call === 1 ? intentJsonText : summaryText;
    return { ok: true, json: async () => ({ choices: [{ message: { content } }] }) };
  });
};

describe('Natural-Language Admin Assistant', () => {
  test('is disabled by default (no DEEPSEEK_API_KEY) and returns a clear 503', async () => {
    const school = await fixtures.createSchool(models);
    const { password } = await fixtures.createAdmin(models, school._id, { email: 'admin@query-test.local' });
    const token = await fixtures.login(app, school.slug, 'admin@query-test.local', password);

    const res = await request(app).post('/api/ai/query').set(fixtures.authHeader(token)).send({ question: 'Which students owe fees?' });
    expect(res.status).toBe(503);
    expect(res.body.code).toBe('AI_NOT_CONFIGURED');
  });

  test('rejects an empty question with a validation error', async () => {
    const school = await fixtures.createSchool(models);
    const { password } = await fixtures.createAdmin(models, school._id, { email: 'admin2@query-test.local' });
    const token = await fixtures.login(app, school.slug, 'admin2@query-test.local', password);

    const res = await request(app).post('/api/ai/query').set(fixtures.authHeader(token)).send({ question: '' });
    expect(res.status).toBe(400);
  });

  describe('with a DeepSeek key present (network call mocked)', () => {
    const originalKey = process.env.DEEPSEEK_API_KEY;
    const originalFetch = global.fetch;

    beforeEach(() => { process.env.DEEPSEEK_API_KEY = 'test-fake-deepseek-key'; });
    afterEach(() => {
      process.env.DEEPSEEK_API_KEY = originalKey;
      global.fetch = originalFetch;
    });

    test('is admin-only — a teacher gets 403, and the AI is never called', async () => {
      const school = await fixtures.createSchool(models);
      const { user: teacherUser, password } = await fixtures.createTeacher(models, school._id);
      const token = await fixtures.login(app, school.slug, teacherUser.email, password);
      mockAI('{"intent":"at_risk_students","params":{}}');

      const res = await request(app).post('/api/ai/query').set(fixtures.authHeader(token)).send({ question: 'anything' });
      expect(res.status).toBe(403);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    test('an unrecognized intent from the model degrades to "unsupported" rather than being executed', async () => {
      const school = await fixtures.createSchool(models);
      const { password } = await fixtures.createAdmin(models, school._id, { email: 'admin3@query-test.local' });
      const token = await fixtures.login(app, school.slug, 'admin3@query-test.local', password);
      mockAI('{"intent":"delete_all_students","params":{}}');

      const res = await request(app).post('/api/ai/query').set(fixtures.authHeader(token)).send({ question: 'delete everyone' });
      expect(res.status).toBe(200);
      expect(res.body.data.intent).toBe('unsupported');
      expect(res.body.data.rows).toEqual([]);
    });

    test('a malformed (non-JSON) model response also degrades to "unsupported", not a crash', async () => {
      const school = await fixtures.createSchool(models);
      const { password } = await fixtures.createAdmin(models, school._id, { email: 'admin4@query-test.local' });
      const token = await fixtures.login(app, school.slug, 'admin4@query-test.local', password);
      mockAI('this is not json at all');

      const res = await request(app).post('/api/ai/query').set(fixtures.authHeader(token)).send({ question: 'garbage in' });
      expect(res.status).toBe(200);
      expect(res.body.data.intent).toBe('unsupported');
    });

    test('extra/adversarial fields in the model\'s params are silently dropped — allowlist, not passthrough', async () => {
      const school = await fixtures.createSchool(models);
      const classRow = await fixtures.createClass(models, school._id);
      const term = await fixtures.createTerm(models, school._id, { isCurrent: true });
      const { student } = await fixtures.createStudent(models, school._id, { classId: classRow.id });
      const { password } = await fixtures.createAdmin(models, school._id, { email: 'admin5@query-test.local' });
      const token = await fixtures.login(app, school.slug, 'admin5@query-test.local', password);

      const { Fee } = models;
      await runWithSchool(school._id, async () => Fee.create({
        schoolId: school._id, studentId: student.id, academicTermId: term.id, feeType: 'Tuition', category: 'Tuition', amountDue: 300,
      }));

      // The model tries to smuggle a raw query operator alongside legitimate params.
      mockAI('{"intent":"fee_arrears_by_class","params":{"classNameHint":null,"minBalance":100,"mongoFilter":{"$where":"malicious"}}}');

      const res = await request(app).post('/api/ai/query').set(fixtures.authHeader(token)).send({ question: 'who owes more than 100' });
      expect(res.status).toBe(200);
      expect(res.body.data.intent).toBe('fee_arrears_by_class');
      expect(res.body.data.rows).toEqual([
        { studentId: student.id, name: `${student.firstName} ${student.lastName}`, className: expect.any(String), outstandingBalance: 300 },
      ]);
    });

    test('fee_arrears_by_class resolves a class-name hint and filters by minBalance, tenant-scoped', async () => {
      const school = await fixtures.createSchool(models);
      const otherSchool = await fixtures.createSchool(models);
      const classRow = await fixtures.createClass(models, school._id, { name: 'Basic 5' });
      const term = await fixtures.createTerm(models, school._id, { isCurrent: true });
      const { student: bigDebt } = await fixtures.createStudent(models, school._id, { classId: classRow.id });
      const { student: smallDebt } = await fixtures.createStudent(models, school._id, { classId: classRow.id });
      // A same-named class in a DIFFERENT school — must never leak into this query.
      const otherClass = await fixtures.createClass(models, otherSchool._id, { name: 'Basic 5' });
      const otherTerm = await fixtures.createTerm(models, otherSchool._id, { isCurrent: true });
      const { student: otherSchoolStudent } = await fixtures.createStudent(models, otherSchool._id, { classId: otherClass.id });
      const { password } = await fixtures.createAdmin(models, school._id, { email: 'admin6@query-test.local' });
      const token = await fixtures.login(app, school.slug, 'admin6@query-test.local', password);

      const { Fee } = models;
      await runWithSchool(school._id, async () => Fee.create({
        schoolId: school._id, studentId: bigDebt.id, academicTermId: term.id, feeType: 'Tuition', category: 'Tuition', amountDue: 500,
      }));
      await runWithSchool(school._id, async () => Fee.create({
        schoolId: school._id, studentId: smallDebt.id, academicTermId: term.id, feeType: 'Tuition', category: 'Tuition', amountDue: 50,
      }));
      await runWithSchool(otherSchool._id, async () => Fee.create({
        schoolId: otherSchool._id, studentId: otherSchoolStudent.id, academicTermId: otherTerm.id, feeType: 'Tuition', category: 'Tuition', amountDue: 9999,
      }));

      mockAI('{"intent":"fee_arrears_by_class","params":{"classNameHint":"Basic 5","minBalance":100}}');

      const res = await request(app).post('/api/ai/query').set(fixtures.authHeader(token)).send({ question: 'Which Basic 5 students owe more than 100?' });
      expect(res.status).toBe(200);
      const ids = res.body.data.rows.map((r) => r.studentId);
      expect(ids).toEqual([bigDebt.id]);
      expect(ids).not.toContain(smallDebt.id);
      expect(ids).not.toContain(otherSchoolStudent.id);
    });

    test('subject_average_scores ranks subjects lowest-average-first', async () => {
      const school = await fixtures.createSchool(models);
      const classRow = await fixtures.createClass(models, school._id);
      const strongSubject = await fixtures.createSubject(models, school._id);
      const weakSubject = await fixtures.createSubject(models, school._id);
      const term = await fixtures.createTerm(models, school._id, { isCurrent: true });
      const { student: studentA } = await fixtures.createStudent(models, school._id, { classId: classRow.id });
      const { student: studentB } = await fixtures.createStudent(models, school._id, { classId: classRow.id });
      const { password } = await fixtures.createAdmin(models, school._id, { email: 'admin7@query-test.local' });
      const token = await fixtures.login(app, school.slug, 'admin7@query-test.local', password);

      const { Result } = models;
      const create = (fields) => runWithSchool(school._id, async () => Result.create({ schoolId: school._id, ...fields }));
      await create({
        studentId: studentA.id, subjectId: strongSubject.id, classId: classRow.id, academicTermId: term.id, classScore: 45, examScore: 45, totalScore: 90,
      });
      await create({
        studentId: studentB.id, subjectId: weakSubject.id, classId: classRow.id, academicTermId: term.id, classScore: 15, examScore: 15, totalScore: 30,
      });

      mockAI('{"intent":"subject_average_scores","params":{"academicTermHint":null}}');

      const res = await request(app).post('/api/ai/query').set(fixtures.authHeader(token)).send({ question: 'Which subjects had the lowest average scores this term?' });
      expect(res.status).toBe(200);
      expect(res.body.data.rows[0].subjectName).toBe(weakSubject.name);
      expect(res.body.data.rows[0].averageScore).toBe(30);
      expect(res.body.data.rows[1].subjectName).toBe(strongSubject.name);
    });

    test('at_risk_students reuses the Phase 4 detection logic and records an audit log entry', async () => {
      const school = await fixtures.createSchool(models);
      const classRow = await fixtures.createClass(models, school._id);
      const term = await fixtures.createTerm(models, school._id, { isCurrent: true });
      const { student } = await fixtures.createStudent(models, school._id, { classId: classRow.id });
      const { password } = await fixtures.createAdmin(models, school._id, { email: 'admin8@query-test.local' });
      const token = await fixtures.login(app, school.slug, 'admin8@query-test.local', password);

      const { Attendance, AuditLog } = models;
      const statuses = ['Absent', 'Absent', 'Absent', 'Absent', 'Absent', 'Absent', 'Present', 'Present'];
      await Promise.all(statuses.map((status, i) => runWithSchool(school._id, async () => Attendance.create({
        schoolId: school._id, studentId: student.id, classId: classRow.id, academicTermId: term.id, status, attendanceDate: new Date(2025, 0, 1 + i),
      }))));

      mockAI('{"intent":"at_risk_students","params":{}}');

      const res = await request(app).post('/api/ai/query').set(fixtures.authHeader(token)).send({ question: 'Which students need attention?' });
      expect(res.status).toBe(200);
      expect(res.body.data.rows.map((r) => r.studentId)).toContain(student.id);

      const logs = await runWithSchool(school._id, async () => AuditLog.find({ action: 'ai.adminQuery' }));
      expect(logs.length).toBe(1);
    });
  });
});
