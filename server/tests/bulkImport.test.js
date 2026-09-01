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

const CSV_HEADER = 'recordType,fullName,firstName,lastName,otherNames,email,phone,gender,dateOfBirth,nationality,religion,hometownRegion,primaryLanguage,residentialAddress,className,guardianFullName,guardianPhone,guardianWhatsApp,guardianRelationship,guardianOccupation,secondaryGuardianFullName,secondaryGuardianPhone,secondaryGuardianWhatsApp,secondaryGuardianRelationship,secondaryGuardianOccupation,staffId,qualification,isHomeroomTeacher,homeroomClass,assignedSubjects,password';

// Rows built by joining against the exact header order above (not hand-typed
// commas) so a missing/extra field is a loud test failure, not a silent
// column-shift -- exactly the class of bug a real admin's CSV can also hit.
const HEADER_FIELDS = CSV_HEADER.split(',');
const csvRow = (fields) => HEADER_FIELDS.map((h) => fields[h] ?? '').join(',');

const setup = async () => {
  const school = await fixtures.createSchool(models);
  const classRow = await fixtures.createClass(models, school._id, { name: 'Basic 5' });
  const { password } = await fixtures.createAdmin(models, school._id, { email: 'admin@bulkimport-test.local' });
  const token = await fixtures.login(app, school.slug, 'admin@bulkimport-test.local', password);
  return { school, classRow, token };
};

const postCsv = (token, ...rows) => request(app)
  .post('/api/bulk-import/csv')
  .set(fixtures.authHeader(token))
  .attach('file', Buffer.from([CSV_HEADER, ...rows].join('\n')), 'import.csv');

describe('POST /bulk-import/csv', () => {
  test('imports a STUDENT row: resolves class, parses hometown/region, auto-provisions guardian logins', async () => {
    const { token } = await setup();
    const row = csvRow({
      recordType: 'STUDENT', firstName: 'Kwame', lastName: 'Mensah', otherNames: 'Kofi', gender: 'Male', dateOfBirth: '2014-05-12',
      nationality: 'Ghanaian', religion: 'Christianity', hometownRegion: 'Cape Coast / Central Region', primaryLanguage: 'Fante',
      residentialAddress: '14 Cantonments Road Accra', className: 'Basic 5',
      guardianFullName: 'Ebenezer Mensah', guardianPhone: '0244123456', guardianWhatsApp: '0244123456', guardianRelationship: 'Father', guardianOccupation: 'Civil Servant',
      secondaryGuardianFullName: 'Grace Mensah', secondaryGuardianPhone: '0208123456', secondaryGuardianWhatsApp: '0208123456', secondaryGuardianRelationship: 'Mother', secondaryGuardianOccupation: 'Trader',
    });

    const res = await postCsv(token, row);
    expect(res.status).toBe(201);
    expect(res.body.data.createdCount).toBe(1);
    expect(res.body.data.failedCount).toBe(0);

    const created = res.body.data.created[0];
    expect(created.recordType).toBe('STUDENT');
    expect(created.name).toBe('Kwame Kofi Mensah');
    expect(created.provisionedLogins).toHaveLength(2); // primary + secondary guardian both new

    const student = await models.Student.findById(created.studentId).setOptions({ skipTenantScope: true });
    expect(student.hometown).toBe('Cape Coast');
    expect(student.region).toBe('Central Region');
    expect(student.classId).toBeTruthy();
  });

  test('imports a STAFF row with an explicit shared password and homeroom assignment', async () => {
    const { classRow, token } = await setup();
    const row = csvRow({
      recordType: 'STAFF', fullName: 'Emmanuel Quaye', email: 'e.quaye@grangeschool-test.local', phone: '0244001122', gender: 'Male',
      staffId: 'GIS-STF-01', qualification: 'B.Ed. Basic Education', isHomeroomTeacher: 'true', homeroomClass: classRow.name,
      assignedSubjects: 'Mathematics | Integrated Science', password: 'Grange2026!',
    });

    const res = await postCsv(token, row);
    expect(res.status).toBe(201);
    expect(res.body.data.createdCount).toBe(1);

    const created = res.body.data.created[0];
    expect(created.recordType).toBe('STAFF');
    expect(created.name).toBe('Emmanuel Quaye');
    expect(created.tempPassword).toBe('Grange2026!');
    expect(created.warnings.some((w) => w.includes('not auto-assigned'))).toBe(true);

    const school = await models.School.findOne({}).setOptions({ skipTenantScope: true });
    const loginRes = await request(app).post('/api/auth/login').send({
      schoolCode: school.slug, identifier: 'e.quaye@grangeschool-test.local', password: 'Grange2026!',
    });
    expect(loginRes.status).toBe(200);

    const updatedClass = await runWithSchool(school._id, async () => models.Class.findById(classRow.id));
    expect(updatedClass.classTeacherId.toString()).toBe(created.teacherId);
  });

  test('a STAFF row with isHomeroomTeacher: false and no homeroomClass creates the teacher without one', async () => {
    const { token } = await setup();
    const row = csvRow({
      recordType: 'STAFF', fullName: 'Kwesi Frimpong', email: 'k.frimpong@grangeschool-test.local', phone: '0277005566', gender: 'Male',
      staffId: 'GIS-STF-03', qualification: 'B.Sc. Information Technology', isHomeroomTeacher: 'false',
      assignedSubjects: 'ICT | Computing', password: 'Grange2026!',
    });

    const res = await postCsv(token, row);
    expect(res.status).toBe(201);
    expect(res.body.data.createdCount).toBe(1);
    expect(res.body.data.created[0].warnings.some((w) => w.includes('not auto-assigned'))).toBe(true);
  });

  test('an unresolvable className produces a warning but still creates the student, unassigned', async () => {
    const { token } = await setup();
    const row = csvRow({
      recordType: 'STUDENT', firstName: 'Ama', lastName: 'Osei', gender: 'Female', dateOfBirth: '2016-11-20',
      nationality: 'Ghanaian', hometownRegion: 'Kumasi / Ashanti Region', className: 'Nonexistent Class',
      guardianFullName: 'Francis Osei', guardianPhone: '0243987654', guardianWhatsApp: '0243987654', guardianRelationship: 'Father',
    });

    const res = await postCsv(token, row);
    expect(res.status).toBe(201);
    expect(res.body.data.createdCount).toBe(1);
    const created = res.body.data.created[0];
    expect(created.warnings.some((w) => w.includes('Nonexistent Class'))).toBe(true);

    const student = await models.Student.findById(created.studentId).setOptions({ skipTenantScope: true });
    expect(student.classId).toBeNull();
  });

  test('an invalid region string produces a warning and leaves region blank, but keeps hometown', async () => {
    const { token } = await setup();
    const row = csvRow({
      recordType: 'STUDENT', firstName: 'Yaa', lastName: 'Asante', gender: 'Female', dateOfBirth: '2010-01-15',
      hometownRegion: 'Ejisu / Not A Real Region', className: 'Basic 5',
      guardianFullName: 'Kwadwo Asante', guardianPhone: '0244556677', guardianWhatsApp: '0244556677', guardianRelationship: 'Father',
    });

    const res = await postCsv(token, row);
    expect(res.status).toBe(201);
    const created = res.body.data.created[0];
    expect(created.warnings.some((w) => w.includes('official regions'))).toBe(true);

    const student = await models.Student.findById(created.studentId).setOptions({ skipTenantScope: true });
    expect(student.hometown).toBe('Ejisu');
    expect(student.region).toBeNull();
  });

  test('an unknown recordType fails that row without aborting the rest of the batch', async () => {
    const { token } = await setup();
    const badRow = csvRow({ recordType: 'BOGUS', fullName: 'Bad Row' });
    const goodRow = csvRow({
      recordType: 'STUDENT', firstName: 'Ama', lastName: 'Osei', gender: 'Female', dateOfBirth: '2016-11-20', className: 'Basic 5',
      guardianFullName: 'Francis Osei', guardianPhone: '0243987654', guardianWhatsApp: '0243987654', guardianRelationship: 'Father',
    });

    const res = await postCsv(token, badRow, goodRow);
    expect(res.status).toBe(201);
    expect(res.body.data.totalRows).toBe(2);
    expect(res.body.data.createdCount).toBe(1);
    expect(res.body.data.failedCount).toBe(1);
    expect(res.body.data.failed[0].reason).toContain('Unknown recordType');
  });

  test('a duplicate staffId/email fails only that row, not the whole batch', async () => {
    const { school, token } = await setup();
    await fixtures.createTeacher(models, school._id, { email: 'dupe@grangeschool-test.local' });

    const dupeRow = csvRow({
      recordType: 'STAFF', fullName: 'Duplicate Teacher', email: 'dupe@grangeschool-test.local', phone: '0200000000', gender: 'Male',
      staffId: 'GIS-DUPE', qualification: 'B.Ed.', isHomeroomTeacher: 'false', password: 'Grange2026!',
    });
    const goodRow = csvRow({
      recordType: 'STAFF', fullName: 'Dorcas Addo', email: 'd.addo@grangeschool-test.local', phone: '0208003344', gender: 'Female',
      staffId: 'GIS-STF-02', qualification: 'B.A. English Language', isHomeroomTeacher: 'false',
      assignedSubjects: 'English Language', password: 'Grange2026!',
    });

    const res = await postCsv(token, dupeRow, goodRow);
    expect(res.status).toBe(201);
    expect(res.body.data.createdCount).toBe(1);
    expect(res.body.data.failedCount).toBe(1);
    expect(res.body.data.created[0].name).toBe('Dorcas Addo');
  });

  test('a teacher (non-admin) cannot import', async () => {
    const { school } = await setup();
    const { user, password } = await fixtures.createTeacher(models, school._id);
    const token = await fixtures.login(app, school.slug, user.email, password);

    const row = csvRow({ recordType: 'STUDENT', firstName: 'Ama', lastName: 'Osei', gender: 'Female' });
    const res = await postCsv(token, row);
    expect(res.status).toBe(403);
  });

  test('rejects a non-CSV file', async () => {
    const { token } = await setup();
    const res = await request(app)
      .post('/api/bulk-import/csv')
      .set(fixtures.authHeader(token))
      .attach('file', Buffer.from('not a csv'), 'import.txt');
    expect(res.status).toBe(400);
  });
});
