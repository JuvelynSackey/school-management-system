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

// A class with one subject already scored, submitted, and Approved, so a
// Draft TerminalReport is ready to submit -- plus a homeroom teacher and a
// separate subject-only teacher to test the write boundary from both sides.
const setupReadyToSubmit = async (schoolId, classOverrides = {}) => {
  const { teacher: homeroomTeacher, user: homeroomUser, password: homeroomPassword } = await fixtures.createTeacher(models, schoolId);
  const classRow = await fixtures.createClass(models, schoolId, { classTeacherId: homeroomTeacher.id, ...classOverrides });
  const subject = await fixtures.createSubject(models, schoolId);
  const term = await fixtures.createTerm(models, schoolId, { isCurrent: true });
  await fixtures.assignSubjectToClass(models, schoolId, { classId: classRow.id, subjectId: subject.id, academicTermId: term.id });
  await fixtures.assignTeacherToClass(models, schoolId, { teacherId: homeroomTeacher.id, subjectId: subject.id, classId: classRow.id });

  const { teacher: subjectTeacher, user: subjectUser, password: subjectPassword } = await fixtures.createTeacher(models, schoolId);
  await fixtures.assignTeacherToClass(models, schoolId, { teacherId: subjectTeacher.id, subjectId: subject.id, classId: classRow.id });

  const { student } = await fixtures.createStudent(models, schoolId, { classId: classRow.id });

  return {
    classRow, subject, term, student, homeroomUser, homeroomPassword, subjectUser, subjectPassword,
  };
};

// Drives scores -> submit sheet -> approve -> generate report, using the
// homeroom teacher (who also holds the one subject assignment) so this
// setup helper itself doesn't depend on the access rule under test.
const bringReportToDraft = async (schoolId, school, { classRow, subject, term, student, homeroomUser, homeroomPassword }) => {
  const homeroomToken = await fixtures.login(app, school.slug, homeroomUser.email, homeroomPassword);
  await request(app).post('/api/results/bulk').set(fixtures.authHeader(homeroomToken)).send({
    classId: classRow.id, subjectId: subject.id, academicTermId: term.id,
    records: [{ studentId: student.id, classScore: 40, examScore: 40 }],
  });
  const sheets = await request(app).get('/api/result-sheets').query({ classId: classRow.id, academicTermId: term.id }).set(fixtures.authHeader(homeroomToken));
  const sheet = sheets.body.data.find((s) => s.subjectId === subject.id);
  await request(app).post(`/api/result-sheets/${sheet.id}/submit`).set(fixtures.authHeader(homeroomToken));

  const adminEmail = `admin2-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@termreports-test.local`;
  const { password: adminPassword } = await fixtures.createAdmin(models, schoolId, { email: adminEmail });
  const adminToken = await fixtures.login(app, school.slug, adminEmail, adminPassword);
  await request(app).post(`/api/result-sheets/${sheet.id}/approve`).set(fixtures.authHeader(adminToken));
  await request(app).post('/api/terminal-reports/generate').set(fixtures.authHeader(adminToken)).send({ classId: classRow.id, academicTermId: term.id });
  const reports = await request(app).get('/api/terminal-reports').query({ classId: classRow.id, academicTermId: term.id }).set(fixtures.authHeader(adminToken));
  return reports.body.data[0];
};

describe('Terminal report submit — homeroom-teacher-only for remarks/personal-attribute ratings', () => {
  test('the homeroom teacher can submit remarks and personal attribute ratings', async () => {
    const school = await fixtures.createSchool(models);
    const setup = await setupReadyToSubmit(school._id);
    const report = await bringReportToDraft(school._id, school, setup);
    const homeroomToken = await fixtures.login(app, school.slug, setup.homeroomUser.email, setup.homeroomPassword);

    const res = await request(app).post(`/api/terminal-reports/${report.id}/submit`).set(fixtures.authHeader(homeroomToken)).send({
      teacherRemark: 'Good progress this term.', teacherSignatureName: 'Homeroom Teacher',
    });
    expect(res.status).toBe(200);
    expect(res.body.data.teacherRemark).toBe('Good progress this term.');
  });

  test('a subject-only teacher (not the homeroom teacher) cannot submit remarks even for a class they teach a subject in', async () => {
    const school = await fixtures.createSchool(models);
    const setup = await setupReadyToSubmit(school._id);
    const report = await bringReportToDraft(school._id, school, setup);
    const subjectToken = await fixtures.login(app, school.slug, setup.subjectUser.email, setup.subjectPassword);

    const res = await request(app).post(`/api/terminal-reports/${report.id}/submit`).set(fixtures.authHeader(subjectToken)).send({
      teacherRemark: 'Should not be allowed.', teacherSignatureName: 'Subject Teacher',
    });
    expect(res.status).toBe(403);
  });

  test('an admin can always submit remarks', async () => {
    const school = await fixtures.createSchool(models);
    const setup = await setupReadyToSubmit(school._id);
    const report = await bringReportToDraft(school._id, school, setup);
    const { password } = await fixtures.createAdmin(models, school._id, { email: 'admin3@termreports-test.local' });
    const token = await fixtures.login(app, school.slug, 'admin3@termreports-test.local', password);

    const res = await request(app).post(`/api/terminal-reports/${report.id}/submit`).set(fixtures.authHeader(token)).send({
      teacherRemark: 'Admin override.', teacherSignatureName: 'Admin',
    });
    expect(res.status).toBe(200);
  });
});

describe('Class.showPositions — qualitative (no ranking) classes suppress class position', () => {
  test('a class with showPositions: false returns classPosition: null from GET /terminal-reports', async () => {
    const school = await fixtures.createSchool(models);
    const setup = await setupReadyToSubmit(school._id, { showPositions: false });
    const report = await bringReportToDraft(school._id, school, setup);

    expect(report.classPosition).toBeNull();
  });

  test('a class with showPositions left at its true default still returns a real classPosition', async () => {
    const school = await fixtures.createSchool(models);
    const setup = await setupReadyToSubmit(school._id);
    const report = await bringReportToDraft(school._id, school, setup);

    expect(report.classPosition).toBe(1);
  });
});
