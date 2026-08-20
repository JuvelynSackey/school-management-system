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

const cellFor = (cells, classId, subjectId) => cells.find((c) => c.classId === classId && c.subjectId === subjectId);

describe('Mark Entry Status Matrix', () => {
  test('reports not_started, draft (results with no sheet yet), and every explicit sheet status correctly', async () => {
    const school = await fixtures.createSchool(models);
    const classRow = await fixtures.createClass(models, school._id);
    const term = await fixtures.createTerm(models, school._id, { isCurrent: true });
    const notStartedSubject = await fixtures.createSubject(models, school._id);
    const draftSubject = await fixtures.createSubject(models, school._id);
    const submittedSubject = await fixtures.createSubject(models, school._id);
    const rejectedSubject = await fixtures.createSubject(models, school._id);
    const approvedSubject = await fixtures.createSubject(models, school._id);
    await Promise.all([notStartedSubject, draftSubject, submittedSubject, rejectedSubject, approvedSubject].map(
      (subject) => fixtures.assignSubjectToClass(models, school._id, { classId: classRow.id, subjectId: subject.id }),
    ));
    const { student } = await fixtures.createStudent(models, school._id, { classId: classRow.id });
    const { password } = await fixtures.createAdmin(models, school._id, { email: 'admin@matrix-test.local' });
    const token = await fixtures.login(app, school.slug, 'admin@matrix-test.local', password);

    const { Result, ResultSheet } = models;
    // draftSubject: a Result exists, but no ResultSheet document has been created yet.
    await runWithSchool(school._id, async () => Result.create({
      schoolId: school._id, studentId: student.id, subjectId: draftSubject.id, classId: classRow.id, academicTermId: term.id, classScore: 20, examScore: 20, totalScore: 40,
    }));
    const makeSheet = (subjectId, status) => runWithSchool(school._id, async () => ResultSheet.create({
      schoolId: school._id, classId: classRow.id, subjectId, academicTermId: term.id, status,
    }));
    await makeSheet(submittedSubject.id, 'Submitted');
    await makeSheet(rejectedSubject.id, 'Rejected');
    await makeSheet(approvedSubject.id, 'Approved');

    const res = await request(app).get('/api/result-sheets/matrix').query({ academicTermId: term.id }).set(fixtures.authHeader(token));
    expect(res.status).toBe(200);

    const { cells } = res.body.data;
    expect(cellFor(cells, classRow.id, notStartedSubject.id).status).toBe('not_started');
    expect(cellFor(cells, classRow.id, draftSubject.id).status).toBe('draft');
    expect(cellFor(cells, classRow.id, submittedSubject.id).status).toBe('submitted');
    expect(cellFor(cells, classRow.id, rejectedSubject.id).status).toBe('rejected');
    expect(cellFor(cells, classRow.id, approvedSubject.id).status).toBe('approved');
  });

  test('only includes subjects actually assigned to a class — not every subject in the school', async () => {
    const school = await fixtures.createSchool(models);
    const classRow = await fixtures.createClass(models, school._id);
    const term = await fixtures.createTerm(models, school._id, { isCurrent: true });
    const assignedSubject = await fixtures.createSubject(models, school._id);
    const unassignedSubject = await fixtures.createSubject(models, school._id);
    await fixtures.assignSubjectToClass(models, school._id, { classId: classRow.id, subjectId: assignedSubject.id });
    const { password } = await fixtures.createAdmin(models, school._id, { email: 'admin2@matrix-test.local' });
    const token = await fixtures.login(app, school.slug, 'admin2@matrix-test.local', password);

    const res = await request(app).get('/api/result-sheets/matrix').query({ academicTermId: term.id }).set(fixtures.authHeader(token));
    expect(cellFor(res.body.data.cells, classRow.id, assignedSubject.id)).toBeTruthy();
    expect(cellFor(res.body.data.cells, classRow.id, unassignedSubject.id)).toBeFalsy();
  });

  test('is read-only — viewing the matrix never creates a ResultSheet document as a side effect', async () => {
    const school = await fixtures.createSchool(models);
    const classRow = await fixtures.createClass(models, school._id);
    const term = await fixtures.createTerm(models, school._id, { isCurrent: true });
    const subject = await fixtures.createSubject(models, school._id);
    await fixtures.assignSubjectToClass(models, school._id, { classId: classRow.id, subjectId: subject.id });
    const { password } = await fixtures.createAdmin(models, school._id, { email: 'admin3@matrix-test.local' });
    const token = await fixtures.login(app, school.slug, 'admin3@matrix-test.local', password);

    await request(app).get('/api/result-sheets/matrix').query({ academicTermId: term.id }).set(fixtures.authHeader(token));

    const { ResultSheet } = models;
    const sheetCount = await runWithSchool(school._id, async () => ResultSheet.countDocuments({}));
    expect(sheetCount).toBe(0);
  });

  test('is admin-only — a teacher gets 403', async () => {
    const school = await fixtures.createSchool(models);
    await fixtures.createTerm(models, school._id, { isCurrent: true });
    const { user: teacherUser, password } = await fixtures.createTeacher(models, school._id);
    const token = await fixtures.login(app, school.slug, teacherUser.email, password);

    const res = await request(app).get('/api/result-sheets/matrix').set(fixtures.authHeader(token));
    expect(res.status).toBe(403);
  });

  test('with no academicTermId given, the school\'s current term is used automatically', async () => {
    const school = await fixtures.createSchool(models);
    await fixtures.createTerm(models, school._id, { isCurrent: true });
    const { password } = await fixtures.createAdmin(models, school._id, { email: 'admin4@matrix-test.local' });
    const token = await fixtures.login(app, school.slug, 'admin4@matrix-test.local', password);

    const res = await request(app).get('/api/result-sheets/matrix').set(fixtures.authHeader(token));
    expect(res.status).toBe(200);
  });
});
