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

describe('GET /guardians/list', () => {
  test('admin sees every guardian, with linked students and portal login status', async () => {
    const school = await fixtures.createSchool(models);
    const classRow = await fixtures.createClass(models, school._id);
    const { student } = await fixtures.createStudent(models, school._id, { classId: classRow.id });
    const { guardian } = await fixtures.createParentWithChild(models, school._id, student.id);

    const { password } = await fixtures.createAdmin(models, school._id, { email: 'admin@guardians-test.local' });
    const token = await fixtures.login(app, school.slug, 'admin@guardians-test.local', password);

    const res = await request(app).get('/api/guardians/list').set(fixtures.authHeader(token));

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].id).toBe(guardian.id);
    expect(res.body.data[0].hasLogin).toBe(true);
    expect(res.body.data[0].loginStatus).toBe('active');
    expect(res.body.data[0].students).toEqual([
      expect.objectContaining({ studentId: student.id, contactPriority: 'primary', isPickupAuthorized: true }),
    ]);
  });

  test('a guardian with no portal login reports hasLogin: false', async () => {
    const school = await fixtures.createSchool(models);
    const classRow = await fixtures.createClass(models, school._id);
    const { student } = await fixtures.createStudent(models, school._id, { classId: classRow.id });
    const { Guardian, StudentGuardian } = models;
    const { runWithSchool } = require('../src/middleware/tenantContext');
    const guardian = await runWithSchool(school._id, () => Guardian.create({
      schoolId: school._id, fullName: 'No Login Guardian', phone: '0501234999',
    }));
    await runWithSchool(school._id, () => StudentGuardian.create({ schoolId: school._id, studentId: student.id, guardianId: guardian.id }));

    const { password } = await fixtures.createAdmin(models, school._id, { email: 'admin2@guardians-test.local' });
    const token = await fixtures.login(app, school.slug, 'admin2@guardians-test.local', password);

    const res = await request(app).get('/api/guardians/list').set(fixtures.authHeader(token));
    expect(res.body.data[0].hasLogin).toBe(false);
    expect(res.body.data[0].loginStatus).toBeNull();
  });

  test('a teacher only sees guardians of students in their own classes', async () => {
    const school = await fixtures.createSchool(models);
    const myClass = await fixtures.createClass(models, school._id);
    const otherClass = await fixtures.createClass(models, school._id);
    const { student: myStudent } = await fixtures.createStudent(models, school._id, { classId: myClass.id });
    const { student: otherStudent } = await fixtures.createStudent(models, school._id, { classId: otherClass.id });
    await fixtures.createParentWithChild(models, school._id, myStudent.id);
    await fixtures.createParentWithChild(models, school._id, otherStudent.id);

    const { teacher, password } = await fixtures.createTeacher(models, school._id, { email: 'teacher@guardians-test.local' });
    await fixtures.assignTeacherToClass(models, school._id, {
      teacherId: teacher.id, subjectId: (await fixtures.createSubject(models, school._id)).id, classId: myClass.id,
    });
    const token = await fixtures.login(app, school.slug, 'teacher@guardians-test.local', password);

    const res = await request(app).get('/api/guardians/list').set(fixtures.authHeader(token));
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].students[0].studentId).toBe(myStudent.id);
  });
});

describe('POST /guardians/:id/login — Phone + Guardian PIN', () => {
  const createGuardianWithoutLogin = async (schoolId, studentId, overrides = {}) => {
    const { Guardian, StudentGuardian } = models;
    const { runWithSchool } = require('../src/middleware/tenantContext');
    const guardian = await runWithSchool(schoolId, () => Guardian.create({
      schoolId, fullName: 'Ama Guardian', phone: '0501111222', ...overrides,
    }));
    await runWithSchool(schoolId, () => StudentGuardian.create({ schoolId, studentId, guardianId: guardian.id }));
    return guardian;
  };

  test('default (no body) creates a phone + PIN login using the phone already on file', async () => {
    const school = await fixtures.createSchool(models);
    const classRow = await fixtures.createClass(models, school._id);
    const { student } = await fixtures.createStudent(models, school._id, { classId: classRow.id });
    const guardian = await createGuardianWithoutLogin(school._id, student.id);

    const { password } = await fixtures.createAdmin(models, school._id, { email: 'admin3@guardians-test.local' });
    const token = await fixtures.login(app, school.slug, 'admin3@guardians-test.local', password);

    const res = await request(app).post(`/api/guardians/${guardian.id}/login`).set(fixtures.authHeader(token)).send({});
    expect(res.status).toBe(201);
    expect(res.body.data.pin).toMatch(/^\d{4}$/);

    const user = await models.User.findOne({ phone: guardian.phone }).setOptions({ skipTenantScope: true });
    expect(user.role).toBe('parent');

    const loginRes = await request(app).post('/api/auth/login').send({
      schoolCode: school.slug, identifier: guardian.phone, password: res.body.data.pin,
    });
    expect(loginRes.status).toBe(200);
    expect(loginRes.body.data.user.role).toBe('parent');
  });

  test('an explicit email + password still works as an alternative', async () => {
    const school = await fixtures.createSchool(models);
    const classRow = await fixtures.createClass(models, school._id);
    const { student } = await fixtures.createStudent(models, school._id, { classId: classRow.id });
    const guardian = await createGuardianWithoutLogin(school._id, student.id, { phone: '0501111333' });

    const { password } = await fixtures.createAdmin(models, school._id, { email: 'admin4@guardians-test.local' });
    const token = await fixtures.login(app, school.slug, 'admin4@guardians-test.local', password);

    const res = await request(app).post(`/api/guardians/${guardian.id}/login`).set(fixtures.authHeader(token)).send({
      email: 'ama-guardian@guardians-test.local', password: 'GuardianPass@123',
    });
    expect(res.status).toBe(201);
    expect(res.body.data.pin).toBeNull();

    const loginRes = await request(app).post('/api/auth/login').send({
      schoolCode: school.slug, identifier: 'ama-guardian@guardians-test.local', password: 'GuardianPass@123',
    });
    expect(loginRes.status).toBe(200);
  });

  test('refuses to create a second login for a guardian who already has one', async () => {
    const school = await fixtures.createSchool(models);
    const classRow = await fixtures.createClass(models, school._id);
    const { student } = await fixtures.createStudent(models, school._id, { classId: classRow.id });
    const { guardian } = await fixtures.createParentWithChild(models, school._id, student.id);

    const { password } = await fixtures.createAdmin(models, school._id, { email: 'admin5@guardians-test.local' });
    const token = await fixtures.login(app, school.slug, 'admin5@guardians-test.local', password);

    const res = await request(app).post(`/api/guardians/${guardian.id}/login`).set(fixtures.authHeader(token)).send({});
    expect(res.status).toBe(400);
  });

  test('refuses when the phone is already in use by another account', async () => {
    const school = await fixtures.createSchool(models);
    const classRow = await fixtures.createClass(models, school._id);
    const { student } = await fixtures.createStudent(models, school._id, { classId: classRow.id });
    const guardian = await createGuardianWithoutLogin(school._id, student.id, { phone: '0501111444' });
    await fixtures.createTeacher(models, school._id, { phone: '0501111444' });

    const { password } = await fixtures.createAdmin(models, school._id, { email: 'admin6@guardians-test.local' });
    const token = await fixtures.login(app, school.slug, 'admin6@guardians-test.local', password);

    const res = await request(app).post(`/api/guardians/${guardian.id}/login`).set(fixtures.authHeader(token)).send({});
    expect(res.status).toBe(400);
  });
});

describe('Guardian portal login auto-provisioning at student enrollment', () => {
  test('a brand-new guardian gets an auto-provisioned phone + PIN login, returned in provisionedLogins', async () => {
    const school = await fixtures.createSchool(models);
    const { password } = await fixtures.createAdmin(models, school._id, { email: 'admin7@guardians-test.local' });
    const token = await fixtures.login(app, school.slug, 'admin7@guardians-test.local', password);

    const res = await request(app).post('/api/students').set(fixtures.authHeader(token)).send({
      admissionNo: 'ACC-GUARD-0001',
      firstName: 'Ama',
      lastName: 'Student',
      guardians: [{ phone: '0509998888', fullName: 'Mrs Mensah', contactPriority: 'primary' }],
    });
    expect(res.status).toBe(201);
    expect(res.body.data.provisionedLogins).toHaveLength(1);
    expect(res.body.data.provisionedLogins[0]).toEqual(expect.objectContaining({ phone: '0509998888', fullName: 'Mrs Mensah' }));
    expect(res.body.data.provisionedLogins[0].pin).toMatch(/^\d{4}$/);

    const loginRes = await request(app).post('/api/auth/login').send({
      schoolCode: school.slug, identifier: '0509998888', password: res.body.data.provisionedLogins[0].pin,
    });
    expect(loginRes.status).toBe(200);
    expect(loginRes.body.data.user.role).toBe('parent');
  });

  test('a second child enrolled with the same guardian phone does not create a duplicate login', async () => {
    const school = await fixtures.createSchool(models);
    const { password } = await fixtures.createAdmin(models, school._id, { email: 'admin8@guardians-test.local' });
    const token = await fixtures.login(app, school.slug, 'admin8@guardians-test.local', password);

    const first = await request(app).post('/api/students').set(fixtures.authHeader(token)).send({
      admissionNo: 'ACC-GUARD-0002',
      firstName: 'Kofi',
      lastName: 'Student',
      guardians: [{ phone: '0509998899', fullName: 'Mr Osei', contactPriority: 'primary' }],
    });
    expect(first.body.data.provisionedLogins).toHaveLength(1);

    const second = await request(app).post('/api/students').set(fixtures.authHeader(token)).send({
      admissionNo: 'ACC-GUARD-0003',
      firstName: 'Yaw',
      lastName: 'Student',
      guardians: [{ phone: '0509998899', fullName: 'Mr Osei', contactPriority: 'primary' }],
    });
    expect(second.status).toBe(201);
    expect(second.body.data.provisionedLogins).toEqual([]);

    const guardian = await models.Guardian.findOne({ phone: '0509998899' }).setOptions({ skipTenantScope: true });
    const links = await models.StudentGuardian.find({ guardianId: guardian.id }).setOptions({ skipTenantScope: true });
    expect(links).toHaveLength(2);
  });

  test('a phone collision with an existing account skips auto-provisioning but does not fail enrollment', async () => {
    const school = await fixtures.createSchool(models);
    await fixtures.createTeacher(models, school._id, { phone: '0509998877' });
    const { password } = await fixtures.createAdmin(models, school._id, { email: 'admin9@guardians-test.local' });
    const token = await fixtures.login(app, school.slug, 'admin9@guardians-test.local', password);

    const res = await request(app).post('/api/students').set(fixtures.authHeader(token)).send({
      admissionNo: 'ACC-GUARD-0004',
      firstName: 'Efua',
      lastName: 'Student',
      guardians: [{ phone: '0509998877', fullName: 'Collision Guardian', contactPriority: 'primary' }],
    });
    expect(res.status).toBe(201);
    expect(res.body.data.provisionedLogins).toEqual([]);

    const guardian = await models.Guardian.findOne({ phone: '0509998877' }).setOptions({ skipTenantScope: true });
    expect(guardian.userId).toBeUndefined();
  });
});
