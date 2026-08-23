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

const createSuperAdmin = async (overrides = {}) => {
  const password = overrides.password || 'Original#Pass1';
  const passwordHash = await bcrypt.hash(password, 10);
  const superAdmin = await SuperAdmin.create({
    email: overrides.email || 'platform@jesmanage.local',
    passwordHash,
    fullName: overrides.fullName || 'Platform Administrator',
    status: overrides.status || 'active',
  });
  return { superAdmin, password };
};

const login = async (email, password) => {
  const res = await request(app).post('/api/super-admin/auth/login').send({ email, password });
  return res.body.data.token;
};

describe('Super Admin — self-service password change', () => {
  test('changes the password when the current password is correct, and the new password logs in afterwards', async () => {
    const { superAdmin, password } = await createSuperAdmin();
    const token = await login(superAdmin.email, password);

    const res = await request(app).put('/api/super-admin/auth/password')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: password, newPassword: 'BrandNew#Pass2' });

    expect(res.status).toBe(200);

    const oldLogin = await request(app).post('/api/super-admin/auth/login').send({ email: superAdmin.email, password });
    expect(oldLogin.status).toBe(401);

    const newLogin = await request(app).post('/api/super-admin/auth/login').send({ email: superAdmin.email, password: 'BrandNew#Pass2' });
    expect(newLogin.status).toBe(200);
  });

  test('rejects the wrong current password without changing anything', async () => {
    const { superAdmin, password } = await createSuperAdmin();
    const token = await login(superAdmin.email, password);

    const res = await request(app).put('/api/super-admin/auth/password')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: 'totally-wrong', newPassword: 'BrandNew#Pass2' });

    expect(res.status).toBe(400);

    const stillWorks = await request(app).post('/api/super-admin/auth/login').send({ email: superAdmin.email, password });
    expect(stillWorks.status).toBe(200);
  });

  test('rejects a new password shorter than the platform minimum', async () => {
    const { superAdmin, password } = await createSuperAdmin();
    const token = await login(superAdmin.email, password);

    const res = await request(app).put('/api/super-admin/auth/password')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: password, newPassword: 'short' });

    expect(res.status).toBe(400);
  });

  test('requires authentication', async () => {
    const res = await request(app).put('/api/super-admin/auth/password')
      .send({ currentPassword: 'x', newPassword: 'BrandNew#Pass2' });
    expect(res.status).toBe(401);
  });
});
