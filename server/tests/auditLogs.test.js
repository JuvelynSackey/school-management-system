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

const setup = async (emailSuffix) => {
  const school = await fixtures.createSchool(models);
  const { password } = await fixtures.createAdmin(models, school._id, { email: `admin-${emailSuffix}@auditlog-test.local` });
  const token = await fixtures.login(app, school.slug, `admin-${emailSuffix}@auditlog-test.local`, password);
  return { school, token };
};

const createLog = (schoolId, overrides = {}) => runWithSchool(schoolId, async () => models.AuditLog.create({
  schoolId,
  actorId: null,
  actorType: 'user',
  actorName: 'Test Admin',
  actorRole: 'admin',
  action: 'result.recordBulk',
  entityType: 'Result',
  description: 'Recorded 3 score(s) for Basic 5 A — Mathematics',
  ...overrides,
}));

describe('GET /audit-logs/export', () => {
  test('is admin-only', async () => {
    const { school } = await setup('role');
    const { user: teacherUser, password } = await fixtures.createTeacher(models, school._id, { email: 'teacher@auditlog-test.local' });
    const token = await fixtures.login(app, school.slug, teacherUser.email, password);
    const res = await request(app).get('/api/audit-logs/export').set(fixtures.authHeader(token));
    expect(res.status).toBe(403);
  });

  test('returns a CSV with the expected columns, no School/entityId/metadata columns', async () => {
    const { school, token } = await setup('csv');
    await createLog(school._id, { description: 'Approved Mathematics for Basic 5 A' });

    const res = await request(app).get('/api/audit-logs/export').set(fixtures.authHeader(token));
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/csv/);
    expect(res.headers['content-disposition']).toContain('audit-log-export.csv');

    const [header, row] = res.text.trim().split('\n');
    expect(header).toBe('When,Who,Role,Action,Type,Description');
    expect(row).toContain('Test Admin');
    expect(row).toContain('admin');
    expect(row).toContain('result.recordBulk');
    expect(row).toContain('Result');
    expect(row).toContain('Approved Mathematics for Basic 5 A');
  });

  test('falls back to "Unknown" for a log with no actorName', async () => {
    const { school, token } = await setup('unknown-actor');
    await createLog(school._id, { actorName: null });

    const res = await request(app).get('/api/audit-logs/export').set(fixtures.authHeader(token));
    const [, row] = res.text.trim().split('\n');
    expect(row).toContain('Unknown');
  });

  test('filters by entityType', async () => {
    const { school, token } = await setup('entity-filter');
    await createLog(school._id, { entityType: 'Result', description: 'A result event' });
    await createLog(school._id, { entityType: 'Fee', description: 'A fee event' });

    const res = await request(app).get('/api/audit-logs/export').query({ entityType: 'Fee' }).set(fixtures.authHeader(token));
    const lines = res.text.trim().split('\n');
    expect(lines).toHaveLength(2); // header + 1 row
    expect(lines[1]).toContain('A fee event');
  });

  test('filters by action', async () => {
    const { school, token } = await setup('action-filter');
    await createLog(school._id, { action: 'result.recordBulk', description: 'Bulk record event' });
    await createLog(school._id, { action: 'result.amend', description: 'Amend event' });

    const res = await request(app).get('/api/audit-logs/export').query({ action: 'result.amend' }).set(fixtures.authHeader(token));
    const lines = res.text.trim().split('\n');
    expect(lines).toHaveLength(2);
    expect(lines[1]).toContain('Amend event');
  });

  test('filters by startDate/endDate, inclusive of the whole endDate day', async () => {
    const { school, token } = await setup('date-filter');
    await runWithSchool(school._id, async () => models.AuditLog.create({
      schoolId: school._id, actorType: 'user', actorRole: 'admin', action: 'result.recordBulk', entityType: 'Result',
      description: 'Too early', createdAt: new Date('2026-01-01T00:00:00.000Z'),
    }));
    await runWithSchool(school._id, async () => models.AuditLog.create({
      schoolId: school._id, actorType: 'user', actorRole: 'admin', action: 'result.recordBulk', entityType: 'Result',
      description: 'In range, end of day', createdAt: new Date('2026-01-15T23:30:00.000Z'),
    }));
    await runWithSchool(school._id, async () => models.AuditLog.create({
      schoolId: school._id, actorType: 'user', actorRole: 'admin', action: 'result.recordBulk', entityType: 'Result',
      description: 'Too late', createdAt: new Date('2026-02-01T00:00:00.000Z'),
    }));

    const res = await request(app).get('/api/audit-logs/export').query({ startDate: '2026-01-10', endDate: '2026-01-15' }).set(fixtures.authHeader(token));
    const lines = res.text.trim().split('\n');
    expect(lines).toHaveLength(2);
    expect(lines[1]).toContain('In range, end of day');
  });

  test('format=json returns the matching logs as JSON', async () => {
    const { school, token } = await setup('json-format');
    await createLog(school._id, { description: 'A JSON-format event' });

    // No filter here, so the real audit entry fixtures.login() itself just
    // produced (a genuine auth.loginSuccess entry, from the real HTTP
    // login flow) is expected alongside the one this test created.
    const res = await request(app).get('/api/audit-logs/export').query({ format: 'json' }).set(fixtures.authHeader(token));
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/application\/json/);
    const parsed = JSON.parse(res.text);
    expect(parsed.map((l) => l.description)).toContain('A JSON-format event');
  });

  test('never includes another school\'s audit log entries', async () => {
    const { school: schoolA, token: tokenA } = await setup('tenant-a');
    const { school: schoolB } = await setup('tenant-b');
    await createLog(schoolA._id, { description: 'School A event' });
    await createLog(schoolB._id, { description: 'School B event' });

    const res = await request(app).get('/api/audit-logs/export').set(fixtures.authHeader(tokenA));
    expect(res.text).toContain('School A event');
    expect(res.text).not.toContain('School B event');
  });
});
