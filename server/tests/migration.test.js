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

const setup = async () => {
  const school = await fixtures.createSchool(models);
  const classRow = await fixtures.createClass(models, school._id, { name: 'Basic 5' });
  const { password } = await fixtures.createAdmin(models, school._id, { email: 'admin@migration-test.local' });
  const token = await fixtures.login(app, school.slug, 'admin@migration-test.local', password);
  return { school, classRow, token };
};

const attachCsv = (req, csvBody) => req.attach('file', Buffer.from(csvBody), 'import.csv');

describe('POST /migration/students — legacy column aliasing & data cleansing', () => {
  test('recognizes aliased legacy headers (DOB, Parent Phone, Class Enrolled) instead of canonical names', async () => {
    const { token } = await setup();
    const csv = 'recordType,First Name,Last Name,DOB,Class Enrolled,Parent Name,Parent Phone\n'
      + 'STUDENT,Kwame,Mensah,2014-05-12,Basic 5,Ebenezer Mensah,0244123456';

    const res = await attachCsv(request(app).post('/api/migration/students').set(fixtures.authHeader(token)), csv);
    expect(res.status).toBe(201);
    expect(res.body.data.createdCount).toBe(1);
    const created = res.body.data.created[0];
    expect(created.name).toBe('Kwame Mensah');

    const student = await models.Student.findById(created.studentId).setOptions({ skipTenantScope: true });
    expect(student.dateOfBirth).toBe('2014-05-12');
    expect(student.classId).toBeTruthy();
  });

  test('normalizes a +233-format guardian phone to local 0XXXXXXXXX format', async () => {
    const { token } = await setup();
    const csv = 'recordType,firstName,lastName,guardianFullName,guardianPhone\n'
      + 'STUDENT,Ama,Osei,Francis Osei,+233243987654';

    const res = await attachCsv(request(app).post('/api/migration/students').set(fixtures.authHeader(token)), csv);
    expect(res.status).toBe(201);
    const guardian = await models.Guardian.findOne({}).setOptions({ skipTenantScope: true });
    expect(guardian.phone).toBe('0243987654');
  });

  test('fuzzy-matches a loosely-spelled region ("ashanti reg") to the canonical enum value', async () => {
    const { token } = await setup();
    const csv = 'recordType,firstName,lastName,hometownRegion\n'
      + 'STUDENT,Kweku,Annan,Kumasi / ashanti reg';

    const res = await attachCsv(request(app).post('/api/migration/students').set(fixtures.authHeader(token)), csv);
    expect(res.status).toBe(201);
    const created = res.body.data.created[0];
    const student = await models.Student.findById(created.studentId).setOptions({ skipTenantScope: true });
    expect(student.hometown).toBe('Kumasi');
    expect(student.region).toBe('Ashanti Region');
  });

  test('a region that cannot be matched produces a warning and leaves region blank', async () => {
    const { token } = await setup();
    const csv = 'recordType,firstName,lastName,hometownRegion\n'
      + 'STUDENT,Yaa,Asante,Ejisu / Nowhereland';

    const res = await attachCsv(request(app).post('/api/migration/students').set(fixtures.authHeader(token)), csv);
    expect(res.status).toBe(201);
    const created = res.body.data.created[0];
    expect(created.warnings.some((w) => w.includes('Nowhereland'))).toBe(true);
  });

  test('preserves a legacy admission number supplied in the CSV instead of auto-generating one', async () => {
    const { token } = await setup();
    const csv = 'recordType,firstName,lastName,admissionNo\n'
      + 'STUDENT,Akosua,Appiah,GPS-2022-001';

    const res = await attachCsv(request(app).post('/api/migration/students').set(fixtures.authHeader(token)), csv);
    expect(res.status).toBe(201);
    expect(res.body.data.created[0].admissionNo).toBe('GPS-2022-001');
  });

  test('auto-generates an admission number when the CSV does not supply one', async () => {
    const { token } = await setup();
    const csv = 'recordType,firstName,lastName\nSTUDENT,Kojo,Boateng';

    const res = await attachCsv(request(app).post('/api/migration/students').set(fixtures.authHeader(token)), csv);
    expect(res.status).toBe(201);
    expect(res.body.data.created[0].admissionNo).toMatch(/^ADM-\d{4}$/);
  });

  test('still imports STAFF rows with an explicit password', async () => {
    const { token } = await setup();
    const csv = 'recordType,fullName,email,staffId,password\n'
      + 'STAFF,Emmanuel Quaye,e.quaye@migration-test.local,STF-01,SharedPass2026!';

    const res = await attachCsv(request(app).post('/api/migration/students').set(fixtures.authHeader(token)), csv);
    expect(res.status).toBe(201);
    expect(res.body.data.created[0].tempPassword).toBe('SharedPass2026!');
  });

  test('a teacher (non-admin) cannot import', async () => {
    const { school } = await setup();
    const { user, password } = await fixtures.createTeacher(models, school._id);
    const token = await fixtures.login(app, school.slug, user.email, password);

    const csv = 'recordType,firstName,lastName\nSTUDENT,Ama,Osei';
    const res = await attachCsv(request(app).post('/api/migration/students').set(fixtures.authHeader(token)), csv);
    expect(res.status).toBe(403);
  });
});

describe('POST /migration/credentials-csv', () => {
  test('exports a CSV of the credentials from a students/staff import result', async () => {
    const { token } = await setup();
    const res = await request(app).post('/api/migration/credentials-csv').set(fixtures.authHeader(token)).send({
      created: [
        { recordType: 'STUDENT', name: 'Kwame Mensah', admissionNo: 'ADM-0001', tempPassword: '1234', provisionedLogins: [{ guardianId: 'g1', fullName: 'Ebenezer Mensah', phone: '0244123456', pin: '5678' }] },
      ],
    });
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/csv');
    expect(res.text).toContain('Kwame Mensah');
    expect(res.text).toContain('1234');
    expect(res.text).toContain('Ebenezer Mensah');
    expect(res.text).toContain('5678');
  });

  test('rejects an empty created array', async () => {
    const { token } = await setup();
    const res = await request(app).post('/api/migration/credentials-csv').set(fixtures.authHeader(token)).send({ created: [] });
    expect(res.status).toBe(400);
  });
});

describe('POST /migration/scores — historical score backfill', () => {
  const setupWithSubjectAndTerm = async () => {
    const ctx = await setup();
    const subject = await fixtures.createSubject(models, ctx.school._id, { name: 'Mathematics' });
    const { student } = await fixtures.createStudent(models, ctx.school._id, { classId: ctx.classRow.id, overrides: { admissionNo: 'ADM-HIST-01' } });
    return { ...ctx, subject, student };
  };

  test('imports a score, computes grade/totalScore, tags isMigrated, and auto-approves a ResultSheet', async () => {
    const {
      token, classRow, subject, student, school,
    } = await setupWithSubjectAndTerm();
    const csv = 'studentAdmissionNo,subject,academicYear,termNumber,classScore,examScore\n'
      + `${student.admissionNo},Mathematics,2022/2023,1,45,40`;

    const res = await attachCsv(request(app).post('/api/migration/scores').set(fixtures.authHeader(token)), csv);
    expect(res.status).toBe(201);
    expect(res.body.data.createdCount).toBe(1);
    const created = res.body.data.created[0];
    expect(created.totalScore).toBe(85);
    expect(created.grade).toBe('A1');

    const result = await runWithSchool(school._id, async () => models.Result.findOne({ studentId: student.id, subjectId: subject.id }));
    expect(result.isMigrated).toBe(true);
    expect(result.migratedAt).toBeTruthy();
    expect(result.classId.toString()).toBe(classRow.id);

    const sheet = await runWithSchool(school._id, async () => models.ResultSheet.findOne({ classId: classRow.id, subjectId: subject.id }));
    expect(sheet.status).toBe('Approved');
  });

  test('auto-creates the AcademicTerm when it does not already exist', async () => {
    const { token, subject, student, school } = await setupWithSubjectAndTerm();
    const csv = 'studentAdmissionNo,subject,academicYear,termNumber,classScore,examScore\n'
      + `${student.admissionNo},Mathematics,2019/2020,2,30,35`;

    const res = await attachCsv(request(app).post('/api/migration/scores').set(fixtures.authHeader(token)), csv);
    expect(res.status).toBe(201);

    const term = await runWithSchool(school._id, async () => models.AcademicTerm.findOne({ academicYear: '2019/2020', termNumber: 2 }));
    expect(term).toBeTruthy();
    expect(term.isCurrent).toBe(false);
    void subject;
  });

  test('recognizes aliased score headers (Admission No, CA, Exam)', async () => {
    const { token, student } = await setupWithSubjectAndTerm();
    const csv = 'Admission No,Subject Name,Academic Year,Term,CA,Exam\n'
      + `${student.admissionNo},Mathematics,2021/2022,1,20,25`;

    const res = await attachCsv(request(app).post('/api/migration/scores').set(fixtures.authHeader(token)), csv);
    expect(res.status).toBe(201);
    expect(res.body.data.createdCount).toBe(1);
  });

  test('rejects a score above the school\'s configured maximum', async () => {
    const { token, student } = await setupWithSubjectAndTerm();
    const csv = 'studentAdmissionNo,subject,academicYear,termNumber,classScore,examScore\n'
      + `${student.admissionNo},Mathematics,2022/2023,1,999,40`;

    const res = await attachCsv(request(app).post('/api/migration/scores').set(fixtures.authHeader(token)), csv);
    expect(res.status).toBe(201);
    expect(res.body.data.failedCount).toBe(1);
    expect(res.body.data.failed[0].reason).toContain('maximums');
  });

  test('fails a row referencing an unknown student admission number, without aborting the batch', async () => {
    const { token, student } = await setupWithSubjectAndTerm();
    const csv = 'studentAdmissionNo,subject,academicYear,termNumber,classScore,examScore\n'
      + 'NO-SUCH-ADM,Mathematics,2022/2023,1,40,40\n'
      + `${student.admissionNo},Mathematics,2022/2023,1,40,40`;

    const res = await attachCsv(request(app).post('/api/migration/scores').set(fixtures.authHeader(token)), csv);
    expect(res.status).toBe(201);
    expect(res.body.data.createdCount).toBe(1);
    expect(res.body.data.failedCount).toBe(1);
    expect(res.body.data.failed[0].reason).toContain('NO-SUCH-ADM');
  });

  test('subjectPosition is computed across multiple imported students in the same class/subject/term', async () => {
    const {
      token, classRow, school,
    } = await setupWithSubjectAndTerm();
    await fixtures.createSubject(models, school._id, { name: 'English' }); // decoy, unused
    const { student: second } = await fixtures.createStudent(models, school._id, { classId: classRow.id, overrides: { admissionNo: 'ADM-HIST-02' } });
    const csv = 'studentAdmissionNo,subject,academicYear,termNumber,classScore,examScore\n'
      + 'ADM-HIST-01,Mathematics,2022/2023,1,45,40\n'
      + `${second.admissionNo},Mathematics,2022/2023,1,30,30`;

    const res = await attachCsv(request(app).post('/api/migration/scores').set(fixtures.authHeader(token)), csv);
    expect(res.status).toBe(201);
    expect(res.body.data.createdCount).toBe(2);

    const results = await runWithSchool(school._id, async () => models.Result.find({}).sort({ totalScore: -1 }));
    expect(results[0].subjectPosition).toBe(1);
    expect(results[1].subjectPosition).toBe(2);
  });
});
