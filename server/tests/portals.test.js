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

describe('Parent portal isolation', () => {
  test('a parent can fetch their own child, but not another student', async () => {
    const school = await fixtures.createSchool(models);
    const { student: ownChild } = await fixtures.createStudent(models, school._id);
    const { student: otherChild } = await fixtures.createStudent(models, school._id);
    const { user: parentUser, password } = await fixtures.createParentWithChild(models, school._id, ownChild.id);

    const token = await fixtures.login(app, school.slug, parentUser.email, password);

    const ownRes = await request(app).get(`/api/students/${ownChild.id}`).set(fixtures.authHeader(token));
    expect(ownRes.status).toBe(200);

    const otherRes = await request(app).get(`/api/students/${otherChild.id}`).set(fixtures.authHeader(token));
    expect(otherRes.status).toBe(403);
  });

  test('a parent only sees their own children\'s results, never another student\'s', async () => {
    const school = await fixtures.createSchool(models);
    const classRow = await fixtures.createClass(models, school._id);
    const { student: ownChild } = await fixtures.createStudent(models, school._id, { classId: classRow.id });
    const { student: otherChild } = await fixtures.createStudent(models, school._id, { classId: classRow.id });
    const { user: parentUser, password } = await fixtures.createParentWithChild(models, school._id, ownChild.id);
    const token = await fixtures.login(app, school.slug, parentUser.email, password);

    const ownRes = await request(app).get(`/api/results/student/${ownChild.id}`).set(fixtures.authHeader(token));
    expect(ownRes.status).toBe(200);

    const otherRes = await request(app).get(`/api/results/student/${otherChild.id}`).set(fixtures.authHeader(token));
    expect(otherRes.status).toBe(403);
  });

  test('a parent cannot see fee records for a child that isn\'t theirs', async () => {
    const school = await fixtures.createSchool(models);
    const { student: ownChild } = await fixtures.createStudent(models, school._id);
    const { student: otherChild } = await fixtures.createStudent(models, school._id);
    const { user: parentUser, password } = await fixtures.createParentWithChild(models, school._id, ownChild.id);
    const token = await fixtures.login(app, school.slug, parentUser.email, password);

    const res = await request(app).get('/api/fees').query({ studentId: otherChild.id }).set(fixtures.authHeader(token));
    // fees.controller.js's list action deliberately rejects a studentId
    // outside the parent's linked children with 400 ("must be one of your
    // linked children") rather than 403 — either way it's a denial, and a
    // 200 leaking otherChild's data is what actually matters here.
    if (res.status === 200) {
      const leaked = (res.body.data || []).some((f) => f.studentId === otherChild.id);
      expect(leaked).toBe(false);
    } else {
      expect([400, 403]).toContain(res.status);
    }
  });

  test('a parent cannot access a published report card belonging to a different student', async () => {
    const school = await fixtures.createSchool(models);
    const classRow = await fixtures.createClass(models, school._id);
    const term = await fixtures.createTerm(models, school._id);
    const { student: ownChild } = await fixtures.createStudent(models, school._id, { classId: classRow.id });
    const { student: otherChild } = await fixtures.createStudent(models, school._id, { classId: classRow.id });
    const { user: parentUser, password } = await fixtures.createParentWithChild(models, school._id, ownChild.id);

    const { TerminalReport } = models;
    const { runWithSchool } = require('../src/middleware/tenantContext');
    const otherReport = await runWithSchool(school._id, () => TerminalReport.create({
      schoolId: school._id, studentId: otherChild.id, classId: classRow.id, academicTermId: term.id, status: 'Published',
    }));

    const token = await fixtures.login(app, school.slug, parentUser.email, password);
    const res = await request(app).get(`/api/terminal-reports/${otherReport.id}/pdf`).set(fixtures.authHeader(token));
    expect(res.status).toBe(403);
  });
});

describe('Student portal self-only access', () => {
  test('a student sees only their own results via /results/me', async () => {
    const school = await fixtures.createSchool(models);
    const classRow = await fixtures.createClass(models, school._id);
    const subject = await fixtures.createSubject(models, school._id);
    const term = await fixtures.createTerm(models, school._id);
    await fixtures.assignSubjectToClass(models, school._id, { classId: classRow.id, subjectId: subject.id, academicTermId: term.id });
    const { user: studentUser, student, password } = await fixtures.createStudent(models, school._id, { classId: classRow.id });

    const { Result, ResultSheet } = models;
    const { runWithSchool } = require('../src/middleware/tenantContext');
    await runWithSchool(school._id, () => ResultSheet.create({
      schoolId: school._id, classId: classRow.id, subjectId: subject.id, academicTermId: term.id, status: 'Approved',
    }));
    await runWithSchool(school._id, () => Result.create({
      schoolId: school._id, studentId: student.id, subjectId: subject.id, classId: classRow.id, academicTermId: term.id, classScore: 40, examScore: 35,
    }));

    const token = await fixtures.login(app, school.slug, studentUser.email, password);
    const res = await request(app).get('/api/results/me').set(fixtures.authHeader(token));
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].studentId).toBe(student.id);
  });

  test('a student cannot fetch another student\'s result history by ID', async () => {
    const school = await fixtures.createSchool(models);
    const { user: studentAUser, password: passwordA } = await fixtures.createStudent(models, school._id);
    const { student: studentB } = await fixtures.createStudent(models, school._id);

    const token = await fixtures.login(app, school.slug, studentAUser.email, passwordA);
    const res = await request(app).get(`/api/results/student/${studentB.id}`).set(fixtures.authHeader(token));
    expect(res.status).toBe(403);
  });

  test('a student only ever sees Approved scores, never a subject still in Draft/Submitted', async () => {
    const school = await fixtures.createSchool(models);
    const classRow = await fixtures.createClass(models, school._id);
    const subject = await fixtures.createSubject(models, school._id);
    const term = await fixtures.createTerm(models, school._id);
    const { user: studentUser, student, password } = await fixtures.createStudent(models, school._id, { classId: classRow.id });

    const { Result, ResultSheet } = models;
    const { runWithSchool } = require('../src/middleware/tenantContext');
    await runWithSchool(school._id, () => ResultSheet.create({
      schoolId: school._id, classId: classRow.id, subjectId: subject.id, academicTermId: term.id, status: 'Submitted',
    }));
    await runWithSchool(school._id, () => Result.create({
      schoolId: school._id, studentId: student.id, subjectId: subject.id, classId: classRow.id, academicTermId: term.id, classScore: 40, examScore: 35,
    }));

    const token = await fixtures.login(app, school.slug, studentUser.email, password);
    const res = await request(app).get('/api/results/me').set(fixtures.authHeader(token));
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(0);
  });
});
