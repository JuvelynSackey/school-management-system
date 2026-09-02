const fs = require('node:fs');
const path = require('node:path');
const bcrypt = require('bcryptjs');
const request = require('supertest');
const { startTestServer, stopTestServer, clearTestDb } = require('./testServer');
const { runWithSchool } = require('../src/middleware/tenantContext');

let app;
let models;
let SuperAdmin;

// backup.service.js writes real files under server/backups/ regardless of
// which MongoDB instance is connected (in-memory for tests) -- track every
// timestamp folder these tests create so afterEach can remove it, same
// discipline as cleaning up disposable Puppeteer/seed scripts.
const BACKUPS_DIR = path.join(__dirname, '..', 'backups');
const createdTimestamps = [];

beforeAll(async () => {
  app = await startTestServer();
  // eslint-disable-next-line global-require
  models = require('../src/models');
  // eslint-disable-next-line global-require
  SuperAdmin = require('../src/superAdmin/superAdmin.model');
});
afterAll(async () => {
  createdTimestamps.forEach((ts) => fs.rmSync(path.join(BACKUPS_DIR, ts), { recursive: true, force: true }));
  await stopTestServer();
});
afterEach(clearTestDb);

const createSuperAdmin = async () => {
  const password = 'Original#Pass1';
  const passwordHash = await bcrypt.hash(password, 10);
  const superAdmin = await SuperAdmin.create({
    email: 'platform@jesmanage.local', passwordHash, fullName: 'Platform Administrator', status: 'active',
  });
  return { superAdmin, password };
};

const superLogin = async () => {
  const { superAdmin, password } = await createSuperAdmin();
  const res = await request(app).post('/api/super-admin/auth/login').send({ email: superAdmin.email, password });
  return res.body.data.token;
};

const authHeader = (token) => ({ Authorization: `Bearer ${token}` });

describe('POST /super-admin/backups/run — EJSON round-trip', () => {
  test('a real ObjectId ref survives a backup + restore round-trip as an actual ObjectId, not a string', async () => {
    const token = await superLogin();
    const { School, SchoolSettings, Class } = models;
    const school = await School.create({ name: 'RoundTrip School', slug: 'roundtrip-school', status: 'active' });
    const classRow = await runWithSchool(school._id, async () => {
      await SchoolSettings.create({ schoolId: school._id, name: 'RoundTrip School' });
      return Class.create({ schoolId: school._id, name: 'Basic 1', stage: 'Primary' });
    });

    const runRes = await request(app).post('/api/super-admin/backups/run').set(authHeader(token));
    expect(runRes.status).toBe(201);
    createdTimestamps.push(runRes.body.data.timestamp);

    // Mutate the live data so restore has something to actually reverse.
    await runWithSchool(school._id, async () => Class.deleteOne({ _id: classRow.id }));
    const goneCheck = await runWithSchool(school._id, async () => Class.findById(classRow.id));
    expect(goneCheck).toBeNull();

    const restoreRes = await request(app).post(`/api/super-admin/backups/${runRes.body.data.timestamp}/restore`)
      .set(authHeader(token)).send({ confirmation: 'RESTORE' });
    expect(restoreRes.status).toBe(200);
    createdTimestamps.push(restoreRes.body.data.safetyBackup);

    const restoredClass = await runWithSchool(school._id, async () => Class.findById(classRow.id));
    expect(restoredClass).not.toBeNull();
    expect(restoredClass.schoolId.toString()).toBe(school._id.toString());
    // The real bug this fixes: schoolId (an ObjectId ref) must come back as
    // an actual ObjectId, not a plain string left over from a naive
    // JSON.stringify/parse round-trip.
    expect(restoredClass.schoolId._bsontype || restoredClass.schoolId.constructor.name).toMatch(/ObjectId/i);
  });
});

describe('POST /super-admin/backups/:timestamp/restore — safety gates', () => {
  test('rejects without the exact confirmation phrase', async () => {
    const token = await superLogin();
    const runRes = await request(app).post('/api/super-admin/backups/run').set(authHeader(token));
    createdTimestamps.push(runRes.body.data.timestamp);

    const res = await request(app).post(`/api/super-admin/backups/${runRes.body.data.timestamp}/restore`)
      .set(authHeader(token)).send({ confirmation: 'restore' }); // wrong case
    expect(res.status).toBe(400);
  });

  test('404s for a timestamp that does not correspond to a real backup', async () => {
    const token = await superLogin();
    const res = await request(app).post('/api/super-admin/backups/not-a-real-backup/restore')
      .set(authHeader(token)).send({ confirmation: 'RESTORE' });
    expect(res.status).toBe(404);
  });

  test('rejects a path-traversal attempt in the timestamp param', async () => {
    const token = await superLogin();
    const res = await request(app).post('/api/super-admin/backups/..%2F..%2Fetc/restore')
      .set(authHeader(token)).send({ confirmation: 'RESTORE' });
    expect([400, 404]).toContain(res.status);
  });

  test('takes an automatic safety backup of the current state before restoring', async () => {
    const token = await superLogin();
    const runRes = await request(app).post('/api/super-admin/backups/run').set(authHeader(token));
    createdTimestamps.push(runRes.body.data.timestamp);

    const restoreRes = await request(app).post(`/api/super-admin/backups/${runRes.body.data.timestamp}/restore`)
      .set(authHeader(token)).send({ confirmation: 'RESTORE' });
    expect(restoreRes.status).toBe(200);
    expect(restoreRes.body.data.safetyBackup).toBeTruthy();
    expect(restoreRes.body.data.safetyBackup).not.toBe(runRes.body.data.timestamp);
    createdTimestamps.push(restoreRes.body.data.safetyBackup);

    const listRes = await request(app).get('/api/super-admin/backups').set(authHeader(token));
    expect(listRes.body.data.map((b) => b.timestamp)).toContain(restoreRes.body.data.safetyBackup);
  });
});

describe('GET /super-admin/backups/:timestamp/download', () => {
  test('streams a zip file for a real backup', async () => {
    const token = await superLogin();
    const runRes = await request(app).post('/api/super-admin/backups/run').set(authHeader(token));
    createdTimestamps.push(runRes.body.data.timestamp);

    const res = await request(app).get(`/api/super-admin/backups/${runRes.body.data.timestamp}/download`).set(authHeader(token)).buffer(true).parse((response, cb) => {
      const chunks = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => cb(null, Buffer.concat(chunks)));
    });
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toBe('application/zip');
    expect(res.body.length).toBeGreaterThan(0);
  });

  test('404s for an unknown timestamp', async () => {
    const token = await superLogin();
    const res = await request(app).get('/api/super-admin/backups/not-a-real-backup/download').set(authHeader(token));
    expect(res.status).toBe(404);
  });
});

describe('GET /super-admin/audit-logs — action and date-range filters', () => {
  const seedLogs = async () => {
    const { AuditLog } = models;
    await AuditLog.create([
      {
        schoolId: null, actorType: 'system', action: 'backup.trigger', entityType: 'Backup', description: 'old backup', createdAt: new Date('2024-01-01'),
      },
      {
        schoolId: null, actorType: 'system', action: 'backup.trigger', entityType: 'Backup', description: 'recent backup', createdAt: new Date('2026-06-15'),
      },
      {
        schoolId: null, actorType: 'super-admin', action: 'school.create', entityType: 'School', description: 'made a school', createdAt: new Date('2026-06-15'),
      },
    ]);
  };

  test('filters by exact action', async () => {
    const token = await superLogin();
    await seedLogs();
    const res = await request(app).get('/api/super-admin/audit-logs').query({ action: 'school.create' }).set(authHeader(token));
    expect(res.status).toBe(200);
    expect(res.body.data.logs).toHaveLength(1);
    expect(res.body.data.logs[0].description).toBe('made a school');
  });

  test('filters by date range', async () => {
    const token = await superLogin();
    await seedLogs();
    // Narrow window around the seeded 2026-06-15 entries -- wide enough to
    // include them, but excludes both the 2024 "old backup" row and the
    // login helper's own audit entry (created "now", i.e. today's real date).
    const res = await request(app).get('/api/super-admin/audit-logs').query({ startDate: '2026-06-01', endDate: '2026-06-30' }).set(authHeader(token));
    expect(res.status).toBe(200);
    expect(res.body.data.logs).toHaveLength(2);
    expect(res.body.data.logs.every((l) => l.description !== 'old backup')).toBe(true);
  });
});

describe('GET /super-admin/audit-logs/export', () => {
  test('exports matching rows as CSV', async () => {
    const token = await superLogin();
    const { AuditLog } = models;
    await AuditLog.create({
      schoolId: null, actorType: 'super-admin', action: 'school.create', entityType: 'School', description: 'made a school',
    });

    const res = await request(app).get('/api/super-admin/audit-logs/export').query({ format: 'csv' }).set(authHeader(token));
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/csv');
    expect(res.text).toContain('made a school');
  });

  test('exports matching rows as JSON', async () => {
    const token = await superLogin();
    const { AuditLog } = models;
    await AuditLog.create({
      schoolId: null, actorType: 'super-admin', action: 'school.create', entityType: 'School', description: 'made a school',
    });

    const res = await request(app).get('/api/super-admin/audit-logs/export').query({ format: 'json' }).set(authHeader(token));
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('application/json');
    const parsed = JSON.parse(res.text);
    expect(parsed.some((l) => l.description === 'made a school')).toBe(true);
  });

  test('requires authentication', async () => {
    const res = await request(app).get('/api/super-admin/audit-logs/export').query({ format: 'csv' });
    expect(res.status).toBe(401);
  });
});
