const request = require('supertest');
const { startTestServer, stopTestServer, clearTestDb } = require('./testServer');

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

const DEFAULT_BANDS = [
  { min: 80, grade: 'A1', label: 'Excellent' },
  { min: 0, grade: 'F9', label: 'Fail' },
];

const setup = async (emailSuffix) => {
  const school = await fixtures.createSchool(models);
  const { password } = await fixtures.createAdmin(models, school._id, { email: `admin-${emailSuffix}@grading-test.local` });
  const token = await fixtures.login(app, school.slug, `admin-${emailSuffix}@grading-test.local`, password);
  return { school, token };
};

describe('PUT /grading-scheme — classScoreConfig', () => {
  test('accepts a decomposition config whose component maximums sum exactly to classScoreMax', async () => {
    const { token } = await setup('accept');
    const res = await request(app).put('/api/grading-scheme').set(fixtures.authHeader(token)).send({
      classScoreMax: 50,
      examScoreMax: 50,
      bands: DEFAULT_BANDS,
      classScoreConfig: {
        enabled: true,
        components: [
          { key: 'exercise', label: 'Class Exercises', maxMarks: 20 },
          { key: 'assignment', label: 'Assignments', maxMarks: 15 },
          { key: 'project', label: 'Group Project', maxMarks: 15 },
        ],
      },
    });
    expect(res.status).toBe(200);
    expect(res.body.data.classScoreConfig.enabled).toBe(true);
    expect(res.body.data.classScoreConfig.components).toHaveLength(3);
  });

  test('rejects a decomposition config whose component maximums do not sum to classScoreMax', async () => {
    const { token } = await setup('reject');
    const res = await request(app).put('/api/grading-scheme').set(fixtures.authHeader(token)).send({
      classScoreMax: 50,
      examScoreMax: 50,
      bands: DEFAULT_BANDS,
      classScoreConfig: {
        enabled: true,
        components: [{ key: 'exercise', label: 'Class Exercises', maxMarks: 20 }],
      },
    });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/sum to exactly 50/);
  });

  test('an update with no classScoreConfig at all leaves a previously-saved one untouched', async () => {
    const { token } = await setup('preserve');
    await request(app).put('/api/grading-scheme').set(fixtures.authHeader(token)).send({
      classScoreMax: 50,
      examScoreMax: 50,
      bands: DEFAULT_BANDS,
      classScoreConfig: {
        enabled: true,
        components: [
          { key: 'exercise', label: 'Class Exercises', maxMarks: 30 },
          { key: 'project', label: 'Group Project', maxMarks: 20 },
        ],
      },
    });

    // A later, unrelated edit (just re-saving the same bands) omits
    // classScoreConfig entirely -- must not silently reset it.
    const res = await request(app).put('/api/grading-scheme').set(fixtures.authHeader(token)).send({
      classScoreMax: 50,
      examScoreMax: 50,
      bands: DEFAULT_BANDS,
    });
    expect(res.status).toBe(200);
    expect(res.body.data.classScoreConfig.enabled).toBe(true);
    expect(res.body.data.classScoreConfig.components).toHaveLength(2);
  });

  test('an update explicitly disabling decomposition is honored', async () => {
    const { token } = await setup('disable');
    await request(app).put('/api/grading-scheme').set(fixtures.authHeader(token)).send({
      classScoreMax: 50, examScoreMax: 50, bands: DEFAULT_BANDS,
      classScoreConfig: { enabled: true, components: [{ key: 'exercise', label: 'Class Exercises', maxMarks: 50 }] },
    });
    const res = await request(app).put('/api/grading-scheme').set(fixtures.authHeader(token)).send({
      classScoreMax: 50, examScoreMax: 50, bands: DEFAULT_BANDS,
      classScoreConfig: { enabled: false, components: [] },
    });
    expect(res.status).toBe(200);
    expect(res.body.data.classScoreConfig.enabled).toBe(false);
  });

  test('is admin-only', async () => {
    const { school } = await setup('role');
    const { user: teacherUser, password } = await fixtures.createTeacher(models, school._id, { email: 'teacher@grading-test.local' });
    const token = await fixtures.login(app, school.slug, teacherUser.email, password);
    const res = await request(app).put('/api/grading-scheme').set(fixtures.authHeader(token)).send({
      classScoreMax: 50, examScoreMax: 50, bands: DEFAULT_BANDS,
    });
    expect(res.status).toBe(403);
  });
});
