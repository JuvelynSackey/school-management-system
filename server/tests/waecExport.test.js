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

const setCandidateFields = async (schoolId, studentId, fields) => {
  const { Student } = models;
  return runWithSchool(schoolId, async () => Student.findByIdAndUpdate(studentId, fields));
};

describe('WAEC/BECE candidate export — preview', () => {
  test('reports ready:true when every candidate has all mandatory fields', async () => {
    const school = await fixtures.createSchool(models);
    const classRow = await fixtures.createClass(models, school._id);
    const { student } = await fixtures.createStudent(models, school._id, { classId: classRow.id });
    await setCandidateFields(school._id, student.id, {
      dateOfBirth: '2009-05-01', waecIndexNumber: '4012345678', photoUrl: 'https://example.com/p.jpg', gender: 'Female',
    });
    const { password } = await fixtures.createAdmin(models, school._id, { email: 'admin@waec-test.local' });
    const token = await fixtures.login(app, school.slug, 'admin@waec-test.local', password);

    const res = await request(app).get('/api/students/waec-preview').query({ classId: classRow.id }).set(fixtures.authHeader(token));
    expect(res.status).toBe(200);
    expect(res.body.data.ready).toBe(true);
    expect(res.body.data.candidateCount).toBe(1);
    expect(res.body.data.issues).toEqual([]);
  });

  test('lists exactly which fields are missing, per candidate', async () => {
    const school = await fixtures.createSchool(models);
    const classRow = await fixtures.createClass(models, school._id);
    const { student } = await fixtures.createStudent(models, school._id, { classId: classRow.id });
    // dateOfBirth and gender set; waecIndexNumber and photoUrl left null.
    await setCandidateFields(school._id, student.id, { dateOfBirth: '2009-05-01', gender: 'Male' });
    const { password } = await fixtures.createAdmin(models, school._id, { email: 'admin2@waec-test.local' });
    const token = await fixtures.login(app, school.slug, 'admin2@waec-test.local', password);

    const res = await request(app).get('/api/students/waec-preview').query({ classId: classRow.id }).set(fixtures.authHeader(token));
    expect(res.body.data.ready).toBe(false);
    expect(res.body.data.issues).toHaveLength(1);
    expect(res.body.data.issues[0].missingFields.sort()).toEqual(['Photo', 'WAEC/BECE Index Number']);
  });

  test('a classId from a different school is not found, not another tenant\'s candidates', async () => {
    const schoolA = await fixtures.createSchool(models);
    const schoolB = await fixtures.createSchool(models);
    const classInB = await fixtures.createClass(models, schoolB._id);
    const { password } = await fixtures.createAdmin(models, schoolA._id, { email: 'admin3@waec-test.local' });
    const token = await fixtures.login(app, schoolA.slug, 'admin3@waec-test.local', password);

    const res = await request(app).get('/api/students/waec-preview').query({ classId: classInB.id }).set(fixtures.authHeader(token));
    expect(res.status).toBe(400);
  });
});

describe('WAEC/BECE candidate export — download', () => {
  test('generates a correct CSV, including subject codes shared across the class, and is audit-logged', async () => {
    const school = await fixtures.createSchool(models);
    const classRow = await fixtures.createClass(models, school._id);
    const subjectA = await fixtures.createSubject(models, school._id, { code: 'MATH' });
    const subjectB = await fixtures.createSubject(models, school._id, { code: 'ENG' });
    await fixtures.assignSubjectToClass(models, school._id, { classId: classRow.id, subjectId: subjectA.id });
    await fixtures.assignSubjectToClass(models, school._id, { classId: classRow.id, subjectId: subjectB.id });
    const { student } = await fixtures.createStudent(models, school._id, {
      classId: classRow.id, overrides: { firstName: 'Ama', lastName: 'Boateng' },
    });
    await setCandidateFields(school._id, student.id, {
      dateOfBirth: '2009-05-01', waecIndexNumber: '4012345678', photoUrl: 'https://example.com/p.jpg', gender: 'Female',
    });
    const { password } = await fixtures.createAdmin(models, school._id, { email: 'admin4@waec-test.local' });
    const token = await fixtures.login(app, school.slug, 'admin4@waec-test.local', password);

    const res = await request(app).get('/api/students/waec-export').query({ classId: classRow.id }).set(fixtures.authHeader(token));
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/^text\/csv/);

    const lines = res.text.trim().split('\n');
    expect(lines[0]).toBe('INDEX_NUMBER,SURNAME,FIRST_NAME,OTHER_NAMES,GENDER,DATE_OF_BIRTH,BECE_SUBJECT_CODES');
    expect(lines[1]).toBe('4012345678,Boateng,Ama,,Female,2009-05-01,MATH;ENG');

    const { AuditLog } = models;
    const logs = await runWithSchool(school._id, async () => AuditLog.find({ action: 'waec.exported' }));
    expect(logs.length).toBe(1);
  });

  test('is blocked (400) when any candidate is missing required data — never a partial/broken file', async () => {
    const school = await fixtures.createSchool(models);
    const classRow = await fixtures.createClass(models, school._id);
    await fixtures.createStudent(models, school._id, { classId: classRow.id }); // no WAEC fields set
    const { password } = await fixtures.createAdmin(models, school._id, { email: 'admin5@waec-test.local' });
    const token = await fixtures.login(app, school.slug, 'admin5@waec-test.local', password);

    const res = await request(app).get('/api/students/waec-export').query({ classId: classRow.id }).set(fixtures.authHeader(token));
    expect(res.status).toBe(400);
  });

  test('is blocked (400) for a class with no active students', async () => {
    const school = await fixtures.createSchool(models);
    const classRow = await fixtures.createClass(models, school._id);
    const { password } = await fixtures.createAdmin(models, school._id, { email: 'admin6@waec-test.local' });
    const token = await fixtures.login(app, school.slug, 'admin6@waec-test.local', password);

    const res = await request(app).get('/api/students/waec-export').query({ classId: classRow.id }).set(fixtures.authHeader(token));
    expect(res.status).toBe(400);
  });

  test('is admin-only — a teacher gets 403', async () => {
    const school = await fixtures.createSchool(models);
    const classRow = await fixtures.createClass(models, school._id);
    const { user: teacherUser, password } = await fixtures.createTeacher(models, school._id);
    const token = await fixtures.login(app, school.slug, teacherUser.email, password);

    const res = await request(app).get('/api/students/waec-export').query({ classId: classRow.id }).set(fixtures.authHeader(token));
    expect(res.status).toBe(403);
  });
});
