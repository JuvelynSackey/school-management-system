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

describe('Multi-tenant isolation', () => {
  test('School A cannot fetch a student that belongs to School B', async () => {
    const schoolA = await fixtures.createSchool(models, { name: 'School A' });
    const schoolB = await fixtures.createSchool(models, { name: 'School B' });

    const { password: adminAPassword } = await fixtures.createAdmin(models, schoolA._id, { email: 'admin@school-a.local' });
    const { student: studentB } = await fixtures.createStudent(models, schoolB._id);

    const tokenA = await fixtures.login(app, schoolA.slug, 'admin@school-a.local', adminAPassword);

    const res = await request(app).get(`/api/students/${studentB.id}`).set(fixtures.authHeader(tokenA));

    // The tenant-scope plugin makes this genuinely not exist from School A's
    // point of view, not merely "forbidden" — a 404 here is the correct
    // signature of the query itself finding nothing, which is a stronger
    // guarantee than an authorization check that could have a bug in it.
    expect(res.status).toBe(404);
  });

  test('School A cannot fetch School B\'s results roster by guessing IDs', async () => {
    const schoolA = await fixtures.createSchool(models, { name: 'Roster School A' });
    const schoolB = await fixtures.createSchool(models, { name: 'Roster School B' });
    const { password: adminAPassword } = await fixtures.createAdmin(models, schoolA._id, { email: 'admin@roster-a.local' });

    const classB = await fixtures.createClass(models, schoolB._id);
    const subjectB = await fixtures.createSubject(models, schoolB._id);
    const termB = await fixtures.createTerm(models, schoolB._id);

    const tokenA = await fixtures.login(app, schoolA.slug, 'admin@roster-a.local', adminAPassword);

    const res = await request(app)
      .get('/api/results/roster')
      .query({ classId: classB.id, subjectId: subjectB.id, academicTermId: termB.id })
      .set(fixtures.authHeader(tokenA));

    // The class lookup inside recordBulk/getRoster is itself tenant-scoped —
    // School B's class simply doesn't exist from School A's authenticated
    // context, so the roster comes back empty rather than leaking School B's
    // student list.
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });

  test('a client-supplied schoolId in the request body is ignored — the record is created under the authenticated tenant, not the injected one', async () => {
    const schoolA = await fixtures.createSchool(models, { name: 'Inject School A' });
    const schoolB = await fixtures.createSchool(models, { name: 'Inject School B' });
    const { password: adminAPassword } = await fixtures.createAdmin(models, schoolA._id, { email: 'admin@inject-a.local' });
    const tokenA = await fixtures.login(app, schoolA.slug, 'admin@inject-a.local', adminAPassword);

    const res = await request(app)
      .post('/api/students')
      .set(fixtures.authHeader(tokenA))
      .send({
        email: 'injected-student@inject-a.local',
        admissionNo: `INJ-${Date.now()}`,
        firstName: 'Injected',
        lastName: 'Student',
        schoolId: schoolB._id.toString(), // attempted spoof
      });

    expect(res.status).toBe(201);

    const { Student } = models;
    const { runWithSchool } = require('../src/middleware/tenantContext');
    const created = await runWithSchool(schoolA._id, async () => Student.findById(res.body.data.id));
    expect(created).not.toBeNull();
    expect(created.schoolId.toString()).toBe(schoolA._id.toString());

    const foundUnderB = await runWithSchool(schoolB._id, async () => Student.findById(res.body.data.id));
    expect(foundUnderB).toBeNull();
  });

  test('a Mongoose query run with no tenant context throws rather than returning unscoped data', async () => {
    const { Student } = models;
    await expect(Student.find({})).rejects.toThrow(/Tenant scope missing/);
  });

  test('a save with no tenant context is rejected rather than silently stamping an undefined schoolId', async () => {
    const { Class } = models;
    await expect(Class.create({ name: 'No Context Class' })).rejects.toThrow(/Tenant scope missing/);
  });

  test('an explicit schoolId in the query filter is honored without needing ambient context (the internal escape hatch used by Super-Admin cross-tenant reads)', async () => {
    const school = await fixtures.createSchool(models, { name: 'Explicit Filter School' });
    await fixtures.createClass(models, school._id, { name: 'Explicit Class' });

    const { Class } = models;
    const rows = await Class.find({ schoolId: school._id });
    expect(rows.length).toBe(1);
    expect(rows[0].name).toBe('Explicit Class');
  });
});
