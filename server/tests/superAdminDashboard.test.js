const bcrypt = require('bcryptjs');
const request = require('supertest');
const { startTestServer, stopTestServer, clearTestDb } = require('./testServer');
const { runWithSchool } = require('../src/middleware/tenantContext');

let app;
let models;
let fixtures;
let SuperAdmin;

beforeAll(async () => {
  app = await startTestServer();
  // eslint-disable-next-line global-require
  models = require('../src/models');
  // eslint-disable-next-line global-require
  fixtures = require('./fixtures');
  // eslint-disable-next-line global-require
  SuperAdmin = require('../src/superAdmin/superAdmin.model');
});
afterAll(stopTestServer);
afterEach(clearTestDb);

const superAdminToken = async () => {
  const password = 'Original#Pass1';
  const passwordHash = await bcrypt.hash(password, 10);
  const superAdmin = await SuperAdmin.create({
    email: 'platform@jesmanage.local', passwordHash, fullName: 'Platform Administrator', status: 'active',
  });
  const res = await request(app).post('/api/super-admin/auth/login').send({ email: superAdmin.email, password });
  return res.body.data.token;
};

describe('Super Admin dashboard — platform-wide analytics', () => {
  test('reports zeroed platform metrics with no schools registered', async () => {
    const token = await superAdminToken();
    const res = await request(app).get('/api/super-admin/dashboard').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.totalActiveStudents).toBe(0);
    expect(res.body.data.totalActiveTeachers).toBe(0);
    expect(res.body.data.totalTerminalReports).toBe(0);
    expect(res.body.data.resultCompletionPercent).toBeNull();
    expect(res.body.data.storage.dataSizeBytes).toBeGreaterThanOrEqual(0);
  });

  test('sums active students and teachers across every school', async () => {
    const schoolA = await fixtures.createSchool(models);
    const classA = await fixtures.createClass(models, schoolA._id);
    await fixtures.createStudent(models, schoolA._id, { classId: classA.id });
    await fixtures.createTeacher(models, schoolA._id);

    const schoolB = await fixtures.createSchool(models);
    const classB = await fixtures.createClass(models, schoolB._id);
    await fixtures.createStudent(models, schoolB._id, { classId: classB.id });
    await fixtures.createStudent(models, schoolB._id, { classId: classB.id });

    const token = await superAdminToken();
    const res = await request(app).get('/api/super-admin/dashboard').set('Authorization', `Bearer ${token}`);

    expect(res.body.data.totalActiveStudents).toBe(3);
    expect(res.body.data.totalActiveTeachers).toBe(1);
  });

  test('computes global result-completion percent from locked vs total terminal reports for schools\' current terms', async () => {
    const { TerminalReport } = models;

    const school = await fixtures.createSchool(models);
    const term = await fixtures.createTerm(models, school._id);
    const classRow = await fixtures.createClass(models, school._id);
    const { student: s1 } = await fixtures.createStudent(models, school._id, { classId: classRow.id });
    const { student: s2 } = await fixtures.createStudent(models, school._id, { classId: classRow.id });

    await runWithSchool(school._id, () => TerminalReport.create({
      schoolId: school._id, studentId: s1.id, classId: classRow.id, academicTermId: term.id, status: 'Locked',
    }));
    await runWithSchool(school._id, () => TerminalReport.create({
      schoolId: school._id, studentId: s2.id, classId: classRow.id, academicTermId: term.id, status: 'Draft',
    }));

    const token = await superAdminToken();
    const res = await request(app).get('/api/super-admin/dashboard').set('Authorization', `Bearer ${token}`);

    expect(res.body.data.totalTerminalReports).toBe(2);
    expect(res.body.data.resultCompletionPercent).toBe(50);
  });

  test('a suspended school\'s terminal reports do not count toward the active-schools completion percent', async () => {
    const { TerminalReport } = models;

    const school = await fixtures.createSchool(models);
    await models.School.updateOne({ _id: school._id }, { $set: { status: 'suspended' } });
    const term = await fixtures.createTerm(models, school._id);
    const classRow = await fixtures.createClass(models, school._id);
    const { student } = await fixtures.createStudent(models, school._id, { classId: classRow.id });
    await runWithSchool(school._id, () => TerminalReport.create({
      schoolId: school._id, studentId: student.id, classId: classRow.id, academicTermId: term.id, status: 'Locked',
    }));

    const token = await superAdminToken();
    const res = await request(app).get('/api/super-admin/dashboard').set('Authorization', `Bearer ${token}`);

    expect(res.body.data.resultCompletionPercent).toBeNull();
    expect(res.body.data.totalTerminalReports).toBe(1);
  });

  test('requires super-admin authentication', async () => {
    const res = await request(app).get('/api/super-admin/dashboard');
    expect(res.status).toBe(401);
  });
});
