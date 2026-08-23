const bcrypt = require('bcryptjs');
const request = require('supertest');
const { startTestServer, stopTestServer, clearTestDb } = require('./testServer');

let app;
let SuperAdmin;

beforeAll(async () => {
  app = await startTestServer();
  // eslint-disable-next-line global-require
  SuperAdmin = require('../src/superAdmin/superAdmin.model');
});
afterAll(stopTestServer);
afterEach(clearTestDb);

const validPayload = (overrides = {}) => ({
  schoolName: 'Kings Prep Academy',
  slug: 'kings-prep',
  adminFullName: 'Ama Boateng',
  adminEmail: 'ama@kings-prep.local',
  password: 'StrongPass123',
  ...overrides,
});

const loginSuperAdmin = async () => {
  const password = 'Original#Pass1';
  const passwordHash = await bcrypt.hash(password, 10);
  const superAdmin = await SuperAdmin.create({
    email: 'platform@jesmanage.local', passwordHash, fullName: 'Platform Administrator', status: 'active',
  });
  const res = await request(app).post('/api/super-admin/auth/login').send({ email: superAdmin.email, password });
  return res.body.data.token;
};

const attemptTenantLogin = () => request(app).post('/api/auth/login').send({
  schoolCode: 'kings-prep', identifier: 'ama@kings-prep.local', password: 'StrongPass123',
});

describe('Self-service school registration', () => {
  test('creates a pending school and its admin, but the admin cannot log in until approved', async () => {
    const res = await request(app).post('/api/schools/register').send(validPayload());
    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('pending');
    expect(res.body.data.slug).toBe('kings-prep');

    const blockedLogin = await attemptTenantLogin();
    expect(blockedLogin.status).toBe(401);
  });

  test('rejects a slug that is already taken', async () => {
    await request(app).post('/api/schools/register').send(validPayload());
    const res = await request(app).post('/api/schools/register').send(validPayload({ adminEmail: 'other@kings-prep.local' }));
    expect(res.status).toBe(400);
  });

  test('rejects a password shorter than the platform minimum', async () => {
    const res = await request(app).post('/api/schools/register').send(validPayload({ password: 'short' }));
    expect(res.status).toBe(400);
  });

  test('rejects an invalid admin email', async () => {
    const res = await request(app).post('/api/schools/register').send(validPayload({ adminEmail: 'not-an-email' }));
    expect(res.status).toBe(400);
  });

  test('a super admin approving the school unlocks login; rejecting keeps it locked', async () => {
    const token = await loginSuperAdmin();
    const registerRes = await request(app).post('/api/schools/register').send(validPayload());
    const schoolId = registerRes.body.data.slug;

    // Fetch the school's real id via the super-admin list, since the
    // registration response deliberately doesn't expose it (matches how
    // little info register() hands back to an unauthenticated caller).
    const listRes = await request(app).get('/api/super-admin/schools').set('Authorization', `Bearer ${token}`);
    const school = listRes.body.data.find((s) => s.slug === schoolId);
    expect(school.status).toBe('pending');

    const rejectRes = await request(app).put(`/api/super-admin/schools/${school.id}`)
      .set('Authorization', `Bearer ${token}`).send({ status: 'rejected' });
    expect(rejectRes.status).toBe(200);
    expect((await attemptTenantLogin()).status).toBe(401);

    const approveRes = await request(app).put(`/api/super-admin/schools/${school.id}`)
      .set('Authorization', `Bearer ${token}`).send({ status: 'active' });
    expect(approveRes.status).toBe(200);
    expect((await attemptTenantLogin()).status).toBe(200);
  });
});
