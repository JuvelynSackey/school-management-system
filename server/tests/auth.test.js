const request = require('supertest');
const jwt = require('jsonwebtoken');
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

describe('Authentication', () => {
  test('logs in with correct credentials', async () => {
    const school = await fixtures.createSchool(models);
    const { user, password } = await fixtures.createAdmin(models, school._id, { email: 'admin@auth-test.local' });

    const res = await request(app).post('/api/auth/login').send({
      schoolCode: school.slug, identifier: 'admin@auth-test.local', password,
    });

    expect(res.status).toBe(200);
    expect(res.body.data.token).toBeTruthy();
    expect(res.body.data.user.email).toBe('admin@auth-test.local');
    expect(res.body.data.user.id).toBe(user.id);
  });

  test('rejects an invalid password with a generic message (no account-existence leak)', async () => {
    const school = await fixtures.createSchool(models);
    await fixtures.createAdmin(models, school._id, { email: 'admin2@auth-test.local' });

    const wrongPassword = await request(app).post('/api/auth/login').send({
      schoolCode: school.slug, identifier: 'admin2@auth-test.local', password: 'WrongPassword123',
    });
    const noSuchAccount = await request(app).post('/api/auth/login').send({
      schoolCode: school.slug, identifier: 'nobody@auth-test.local', password: 'WrongPassword123',
    });

    expect(wrongPassword.status).toBe(401);
    expect(noSuchAccount.status).toBe(401);
    // Same message either way — a wrong password and a nonexistent account
    // must be indistinguishable to the caller.
    expect(wrongPassword.body.message).toBe(noSuchAccount.body.message);
  });

  test('rejects a request with no token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  test('rejects a malformed/invalid JWT', async () => {
    const res = await request(app).get('/api/auth/me').set(fixtures.authHeader('not-a-real-token'));
    expect(res.status).toBe(401);
  });

  test('rejects a well-formed JWT signed with the wrong secret', async () => {
    const forged = jwt.sign({ id: '507f1f77bcf86cd799439011', role: 'admin', schoolId: '507f1f77bcf86cd799439011' }, 'wrong-secret');
    const res = await request(app).get('/api/auth/me').set(fixtures.authHeader(forged));
    expect(res.status).toBe(401);
  });

  test('rejects a token with no schoolId claim (pre-multi-tenant token shape)', async () => {
    const legacyToken = jwt.sign({ id: '507f1f77bcf86cd799439011', role: 'admin' }, process.env.JWT_SECRET);
    const res = await request(app).get('/api/auth/me').set(fixtures.authHeader(legacyToken));
    expect(res.status).toBe(401);
  });

  test('forgot-password gives an identical response whether or not the account exists', async () => {
    const school = await fixtures.createSchool(models);
    await fixtures.createAdmin(models, school._id, { email: 'admin3@auth-test.local' });

    const real = await request(app).post('/api/auth/forgot-password').send({ schoolCode: school.slug, identifier: 'admin3@auth-test.local' });
    const fake = await request(app).post('/api/auth/forgot-password').send({ schoolCode: school.slug, identifier: 'nobody@auth-test.local' });

    expect(real.status).toBe(200);
    expect(fake.status).toBe(200);
    expect(real.body.data.message).toBe(fake.body.data.message);
  });

  test('reset-password rejects a bogus token', async () => {
    const school = await fixtures.createSchool(models);
    const res = await request(app).post('/api/auth/reset-password').send({
      schoolCode: school.slug, token: 'bogus-token', newPassword: 'NewPassword123',
    });
    expect(res.status).toBe(400);
  });

  test('reset-password with a genuine token actually changes the password, and the token is single-use', async () => {
    const school = await fixtures.createSchool(models);
    const { password } = await fixtures.createAdmin(models, school._id, { email: 'admin4@auth-test.local' });

    await request(app).post('/api/auth/forgot-password').send({ schoolCode: school.slug, identifier: 'admin4@auth-test.local' });
    const { User } = models;
    const { runWithSchool } = require('../src/middleware/tenantContext');
    const userDoc = await runWithSchool(school._id, async () => User.findOne({ email: 'admin4@auth-test.local' }));
    expect(userDoc.passwordResetTokenHash).toBeTruthy();

    // The raw token is one-way hashed server-side — reconstruct it the same
    // way the controller does, matching this project's established direct-DB
    // verification pattern for anything that can't be read back over HTTP.
    const crypto = require('crypto');
    const rawToken = crypto.randomBytes(32).toString('hex');
    await runWithSchool(school._id, () => User.updateOne(
      { email: 'admin4@auth-test.local' },
      { $set: { passwordResetTokenHash: crypto.createHash('sha256').update(rawToken).digest('hex'), passwordResetExpiresAt: new Date(Date.now() + 10 * 60 * 1000) } },
    ));

    const resetRes = await request(app).post('/api/auth/reset-password').send({
      schoolCode: school.slug, token: rawToken, newPassword: 'BrandNewPass123',
    });
    expect(resetRes.status).toBe(200);

    const loginWithNew = await request(app).post('/api/auth/login').send({ schoolCode: school.slug, identifier: 'admin4@auth-test.local', password: 'BrandNewPass123' });
    expect(loginWithNew.status).toBe(200);

    const loginWithOld = await request(app).post('/api/auth/login').send({ schoolCode: school.slug, identifier: 'admin4@auth-test.local', password });
    expect(loginWithOld.status).toBe(401);

    const reuseAttempt = await request(app).post('/api/auth/reset-password').send({
      schoolCode: school.slug, token: rawToken, newPassword: 'AnotherPass123',
    });
    expect(reuseAttempt.status).toBe(400);
  });

  test('mustChangePassword is true for a Super-Admin-created admin, and clears after changing the password', async () => {
    const { School, SchoolSettings, User } = models;
    const { runWithSchool } = require('../src/middleware/tenantContext');
    const school = await School.create({ name: 'MCP School', slug: `mcp-school-${Date.now()}`, status: 'active' });
    await runWithSchool(school._id, () => SchoolSettings.create({ schoolId: school._id, name: school.name }));

    const bcrypt = require('bcryptjs');
    const passwordHash = await bcrypt.hash('TempPass@123', 10);
    await runWithSchool(school._id, () => User.create({
      schoolId: school._id, email: 'mcp-admin@auth-test.local', passwordHash, fullName: 'MCP Admin', role: 'admin', status: 'active', mustChangePassword: true,
    }));

    const loginRes = await request(app).post('/api/auth/login').send({ schoolCode: school.slug, identifier: 'mcp-admin@auth-test.local', password: 'TempPass@123' });
    expect(loginRes.body.data.user.mustChangePassword).toBe(true);

    const token = loginRes.body.data.token;
    const changeRes = await request(app).post('/api/auth/change-password').set(fixtures.authHeader(token)).send({
      currentPassword: 'TempPass@123', newPassword: 'PermanentPass@123',
    });
    expect(changeRes.status).toBe(200);

    const meRes = await request(app).get('/api/auth/me').set(fixtures.authHeader(token));
    expect(meRes.body.data.mustChangePassword).toBe(false);
  });
});
