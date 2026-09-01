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

describe('Student & guardian background fields (Ghanaian admission form)', () => {
  test('POST /students persists nationality, religion, hometown/region, primary language, and guardian occupation/WhatsApp', async () => {
    const school = await fixtures.createSchool(models);
    const classRow = await fixtures.createClass(models, school._id);
    const { password } = await fixtures.createAdmin(models, school._id, { email: 'admin@demographics-test.local' });
    const token = await fixtures.login(app, school.slug, 'admin@demographics-test.local', password);

    const res = await request(app).post('/api/students').set(fixtures.authHeader(token)).send({
      admissionNo: 'DEMO-0001',
      firstName: 'Ama',
      lastName: 'Mensah',
      classId: classRow.id,
      religion: 'Christian',
      hometownRegion: 'Cape Coast / Central Region',
      primaryLanguage: 'Fante',
      guardians: [{
        phone: '0501112221',
        fullName: 'Mrs Mensah',
        contactPriority: 'primary',
        occupation: 'Trader',
        whatsappNumber: '0501112221',
      }],
    });

    expect(res.status).toBe(201);
    expect(res.body.data.nationality).toBe('Ghanaian'); // default, not sent
    expect(res.body.data.religion).toBe('Christian');
    expect(res.body.data.hometownRegion).toBe('Cape Coast / Central Region');
    expect(res.body.data.primaryLanguage).toBe('Fante');

    const guardian = res.body.data.guardians[0];
    expect(guardian.occupation).toBe('Trader');
    expect(guardian.whatsappNumber).toBe('0501112221');
  });

  test('POST /students without nationality defaults to Ghanaian; without religion/hometown/language leaves them null', async () => {
    const school = await fixtures.createSchool(models);
    const { password } = await fixtures.createAdmin(models, school._id, { email: 'admin2@demographics-test.local' });
    const token = await fixtures.login(app, school.slug, 'admin2@demographics-test.local', password);

    const res = await request(app).post('/api/students').set(fixtures.authHeader(token)).send({
      admissionNo: 'DEMO-0002', firstName: 'Kojo', lastName: 'Boateng',
    });

    expect(res.status).toBe(201);
    expect(res.body.data.nationality).toBe('Ghanaian');
    expect(res.body.data.religion).toBeNull();
    expect(res.body.data.hometownRegion).toBeNull();
    expect(res.body.data.primaryLanguage).toBeNull();
  });

  test('PUT /students/:id updates background fields; omitting them leaves existing values untouched', async () => {
    const school = await fixtures.createSchool(models);
    const classRow = await fixtures.createClass(models, school._id);
    const { student } = await fixtures.createStudent(models, school._id, { classId: classRow.id });
    const { password } = await fixtures.createAdmin(models, school._id, { email: 'admin3@demographics-test.local' });
    const token = await fixtures.login(app, school.slug, 'admin3@demographics-test.local', password);

    const updateRes = await request(app).put(`/api/students/${student.id}`).set(fixtures.authHeader(token)).send({
      nationality: 'Nigerian', religion: 'Muslim', hometownRegion: 'Kumasi / Ashanti Region', primaryLanguage: 'Twi',
    });
    expect(updateRes.status).toBe(200);
    expect(updateRes.body.data.nationality).toBe('Nigerian');
    expect(updateRes.body.data.religion).toBe('Muslim');
    expect(updateRes.body.data.primaryLanguage).toBe('Twi');

    const untouchedRes = await request(app).put(`/api/students/${student.id}`).set(fixtures.authHeader(token)).send({
      firstName: 'Renamed',
    });
    expect(untouchedRes.status).toBe(200);
    expect(untouchedRes.body.data.nationality).toBe('Nigerian');
    expect(untouchedRes.body.data.religion).toBe('Muslim');
    expect(untouchedRes.body.data.hometownRegion).toBe('Kumasi / Ashanti Region');
    expect(untouchedRes.body.data.primaryLanguage).toBe('Twi');
  });

  test('POST /admissions persists background fields, and enrolling carries them (plus guardian occupation/WhatsApp) onto the created student', async () => {
    const school = await fixtures.createSchool(models);
    const classRow = await fixtures.createClass(models, school._id);
    const { password } = await fixtures.createAdmin(models, school._id, { email: 'admin4@demographics-test.local' });
    const token = await fixtures.login(app, school.slug, 'admin4@demographics-test.local', password);

    const createRes = await request(app).post('/api/admissions').set(fixtures.authHeader(token)).send({
      firstName: 'Yaw',
      lastName: 'Owusu',
      religion: 'Traditionalist',
      hometownRegion: 'Tamale / Northern Region',
      primaryLanguage: 'Dagbani',
      desiredClassId: classRow.id,
      guardians: [{
        phone: '0501112223', fullName: 'Mr Owusu', contactPriority: 'primary', occupation: 'Farmer', whatsappNumber: '0501112223',
      }],
    });
    expect(createRes.status).toBe(201);
    expect(createRes.body.data.religion).toBe('Traditionalist');
    expect(createRes.body.data.hometownRegion).toBe('Tamale / Northern Region');

    const admissionId = createRes.body.data.id;
    await request(app).post(`/api/admissions/${admissionId}/approve`).set(fixtures.authHeader(token));

    const enrollRes = await request(app).post(`/api/admissions/${admissionId}/enroll`).set(fixtures.authHeader(token)).send({
      admissionNo: 'DEMO-0003',
    });
    expect(enrollRes.status).toBe(201);

    const student = await models.Student.findById(enrollRes.body.data.studentId).setOptions({ skipTenantScope: true });
    expect(student.religion).toBe('Traditionalist');
    expect(student.hometownRegion).toBe('Tamale / Northern Region');
    expect(student.primaryLanguage).toBe('Dagbani');
    expect(student.nationality).toBe('Ghanaian');

    const guardian = await models.Guardian.findOne({ phone: '0501112223' }).setOptions({ skipTenantScope: true });
    expect(guardian.occupation).toBe('Farmer');
    expect(guardian.whatsappNumber).toBe('0501112223');
  });
});
