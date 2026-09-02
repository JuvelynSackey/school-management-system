const request = require('supertest');
const { startTestServer, stopTestServer, clearTestDb } = require('./testServer');

// Own file/app instance for the same reason aiQueryScoped.test.js is split
// out from aiQuery.test.js -- fresh in-memory rate-limiter state, so this
// suite's own volume of /api/ai/query calls can't trip queryLimiter and
// starve a later test's login.
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

const mockAI = (intentJsonText, summaryText = 'Here is a summary.') => {
  let call = 0;
  global.fetch = jest.fn(async () => {
    call += 1;
    const content = call === 1 ? intentJsonText : summaryText;
    return { ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: content }] } }] }) };
  });
};

describe('Intelligence Inspector — GET /api/ai/query { includeInspector }', () => {
  const originalKey = process.env.GEMINI_API_KEY;
  const originalFetch = global.fetch;

  beforeEach(() => { process.env.GEMINI_API_KEY = 'AIzaSy-test-fake-key'; });
  afterEach(() => {
    process.env.GEMINI_API_KEY = originalKey;
    global.fetch = originalFetch;
  });

  test('an admin requesting includeInspector gets a full, accurate trace alongside the normal answer', async () => {
    const school = await fixtures.createSchool(models);
    const { teacher } = await fixtures.createTeacher(models, school._id, { email: 'homeroom@inspector-test.local' });
    await fixtures.createClass(models, school._id, { name: 'No Homeroom' });
    await fixtures.createClass(models, school._id, { name: 'Has Homeroom', classTeacherId: teacher.id });
    const { password } = await fixtures.createAdmin(models, school._id, { email: 'admin@inspector-test.local' });
    const token = await fixtures.login(app, school.slug, 'admin@inspector-test.local', password);

    mockAI('{"intent":"classes_without_homeroom_teacher","params":{}}');

    const res = await request(app).post('/api/ai/query').set(fixtures.authHeader(token))
      .send({ question: 'Which classes have no homeroom teacher?', includeInspector: true });

    expect(res.status).toBe(200);
    const { inspector } = res.body.data;
    expect(inspector).toBeDefined();
    expect(inspector.rawQuery).toBe('Which classes have no homeroom teacher?');
    expect(inspector.classifiedIntent).toBe('classes_without_homeroom_teacher');
    expect(inspector.rbac).toEqual({ requiredRoles: ['admin'], userRole: 'admin', passed: true });
    expect(inspector.tenantBoundary).toEqual({ activeSchoolId: school.id, enforced: true });
    expect(inspector.executedService).toBe('aiQuery.service.js#runClassesWithoutHomeroomQuery');
    expect(inspector.sanitization.fieldsReturnedPerRow).toEqual(expect.arrayContaining(['classId', 'className']));
    expect(inspector.sanitization.fieldsReturnedPerRow).not.toEqual(expect.arrayContaining(['_id', 'passwordHash', 'schoolId']));
    expect(typeof inspector.executionTimeMs).toBe('number');
  });

  test('a non-admin role never receives inspector data, even when it asks for it', async () => {
    const school = await fixtures.createSchool(models);
    const classRow = await fixtures.createClass(models, school._id);
    const { teacher, user: teacherUser, password } = await fixtures.createTeacher(models, school._id, { email: 'teacher@inspector-test.local' });
    await fixtures.assignTeacherToClass(models, school._id, { teacherId: teacher.id, subjectId: (await fixtures.createSubject(models, school._id)).id, classId: classRow.id });
    const token = await fixtures.login(app, school.slug, teacherUser.email, password);

    mockAI('{"intent":"my_class_attendance_summary","params":{"academicTermHint":null}}');

    const res = await request(app).post('/api/ai/query').set(fixtures.authHeader(token))
      .send({ question: 'How is attendance in my classes?', includeInspector: true });

    expect(res.status).toBe(200);
    expect(res.body.data.inspector).toBeUndefined();
  });

  test('an admin question WITHOUT includeInspector never carries the trace (opt-in only)', async () => {
    const school = await fixtures.createSchool(models);
    const { password } = await fixtures.createAdmin(models, school._id, { email: 'admin2@inspector-test.local' });
    const token = await fixtures.login(app, school.slug, 'admin2@inspector-test.local', password);

    mockAI('{"intent":"classes_without_homeroom_teacher","params":{}}');

    const res = await request(app).post('/api/ai/query').set(fixtures.authHeader(token)).send({ question: 'Which classes have no homeroom teacher?' });
    expect(res.status).toBe(200);
    expect(res.body.data.inspector).toBeUndefined();
  });

  test('the hard refusal path reports rbac.passed: false and no executed service', async () => {
    const school = await fixtures.createSchool(models);
    const { password } = await fixtures.createAdmin(models, school._id, { email: 'admin3@inspector-test.local' });
    const token = await fixtures.login(app, school.slug, 'admin3@inspector-test.local', password);

    // A real, registered intent that's teacher-only -- admin's own prompt
    // never offers it, so this simulates the model returning something
    // outside what it was given (the adversarial case the hard refusal
    // boundary exists for).
    mockAI('{"intent":"my_class_attendance_summary","params":{"academicTermHint":null}}');

    const res = await request(app).post('/api/ai/query').set(fixtures.authHeader(token))
      .send({ question: 'attendance in my classes', includeInspector: true });

    expect(res.status).toBe(200);
    expect(res.body.data.answer).toBe('I cannot access or disclose information outside your authorized scope.');
    const { inspector } = res.body.data;
    expect(inspector.rbac).toEqual({ requiredRoles: ['teacher'], userRole: 'admin', passed: false });
    expect(inspector.executedService).toBeNull();
    expect(inspector.sanitization).toBeNull();
  });

  test('an unsupported question still reports a full trace with no service executed', async () => {
    const school = await fixtures.createSchool(models);
    const { password } = await fixtures.createAdmin(models, school._id, { email: 'admin4@inspector-test.local' });
    const token = await fixtures.login(app, school.slug, 'admin4@inspector-test.local', password);

    mockAI('{"intent":"unsupported","params":{}}');

    const res = await request(app).post('/api/ai/query').set(fixtures.authHeader(token))
      .send({ question: 'What is the meaning of life?', includeInspector: true });

    expect(res.status).toBe(200);
    const { inspector } = res.body.data;
    expect(inspector.classifiedIntent).toBe('unsupported');
    expect(inspector.executedService).toBeNull();
  });

  test('the tenant boundary reported in the inspector is the requesting admin\'s own school, never another one\'s', async () => {
    const schoolA = await fixtures.createSchool(models);
    const schoolB = await fixtures.createSchool(models);
    const { password } = await fixtures.createAdmin(models, schoolA._id, { email: 'admin5@inspector-test.local' });
    const token = await fixtures.login(app, schoolA.slug, 'admin5@inspector-test.local', password);

    mockAI('{"intent":"classes_without_homeroom_teacher","params":{}}');

    const res = await request(app).post('/api/ai/query').set(fixtures.authHeader(token))
      .send({ question: 'Which classes have no homeroom teacher?', includeInspector: true });

    expect(res.body.data.inspector.tenantBoundary.activeSchoolId).toBe(schoolA.id);
    expect(res.body.data.inspector.tenantBoundary.activeSchoolId).not.toBe(schoolB.id);
  });
});
