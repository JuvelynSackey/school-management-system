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

// "Offline" itself is a client-side (browser) concept — the server side of
// the story, which is what actually matters for correctness, is just: two
// sequential requests, with the sheet's state changing in between. That's
// exactly what a teacher's queued write replaying against a since-approved
// sheet looks like from the server's point of view.
describe('Offline sync conflict handling', () => {
  test('a queued write that replays after the sheet was approved is rejected with RESULT_LOCKED, and does not overwrite the approved score', async () => {
    const school = await fixtures.createSchool(models);
    const classRow = await fixtures.createClass(models, school._id);
    const subject = await fixtures.createSubject(models, school._id);
    const term = await fixtures.createTerm(models, school._id);
    const { teacher, user: teacherUser, password: teacherPassword } = await fixtures.createTeacher(models, school._id);
    await fixtures.assignSubjectToClass(models, school._id, { classId: classRow.id, subjectId: subject.id, academicTermId: term.id });
    await fixtures.assignTeacherToClass(models, school._id, { teacherId: teacher.id, subjectId: subject.id, classId: classRow.id });
    const { student } = await fixtures.createStudent(models, school._id, { classId: classRow.id });
    const { password: adminPassword } = await fixtures.createAdmin(models, school._id, { email: 'admin@offline-test.local' });

    const teacherToken = await fixtures.login(app, school.slug, teacherUser.email, teacherPassword);
    const adminToken = await fixtures.login(app, school.slug, 'admin@offline-test.local', adminPassword);

    // The teacher's real (online) score, later approved.
    await request(app).post('/api/results/bulk').set(fixtures.authHeader(teacherToken)).send({
      classId: classRow.id, subjectId: subject.id, academicTermId: term.id,
      records: [{ studentId: student.id, classScore: 30, examScore: 30 }],
    });
    const sheets = await request(app).get('/api/result-sheets').query({ classId: classRow.id, academicTermId: term.id }).set(fixtures.authHeader(teacherToken));
    const sheet = sheets.body.data.find((s) => s.subjectId === subject.id);
    await request(app).post(`/api/result-sheets/${sheet.id}/submit`).set(fixtures.authHeader(teacherToken));
    await request(app).post(`/api/result-sheets/${sheet.id}/approve`).set(fixtures.authHeader(adminToken));

    // This is the payload the client's offline queue would have captured
    // BEFORE the approval happened, replayed AFTER — the server has no way
    // to know it's "from offline," it's just a bulk write against an
    // already-approved sheet, which is exactly the scenario RESULT_LOCKED
    // exists for.
    const queuedReplay = await request(app).post('/api/results/bulk').set(fixtures.authHeader(teacherToken)).send({
      classId: classRow.id, subjectId: subject.id, academicTermId: term.id,
      records: [{ studentId: student.id, classScore: 49, examScore: 48 }],
    });

    expect(queuedReplay.status).toBe(400);
    expect(queuedReplay.body.code).toBe('RESULT_LOCKED');

    // The actual guarantee that matters: the approved score is untouched.
    const rosterAfter = await request(app).get('/api/results/roster').query({ classId: classRow.id, subjectId: subject.id, academicTermId: term.id }).set(fixtures.authHeader(adminToken));
    expect(rosterAfter.body.data[0].classScore).toBe(30);
    expect(rosterAfter.body.data[0].examScore).toBe(30);
  });

  test('a queued write against a student whose terminal report is already Locked is also rejected with RESULT_LOCKED', async () => {
    const school = await fixtures.createSchool(models);
    const classRow = await fixtures.createClass(models, school._id);
    const term = await fixtures.createTerm(models, school._id);
    const subject = await fixtures.createSubject(models, school._id);
    const { teacher, user: teacherUser, password: teacherPassword } = await fixtures.createTeacher(models, school._id);
    await fixtures.assignSubjectToClass(models, school._id, { classId: classRow.id, subjectId: subject.id, academicTermId: term.id });
    await fixtures.assignTeacherToClass(models, school._id, { teacherId: teacher.id, subjectId: subject.id, classId: classRow.id });
    const { student } = await fixtures.createStudent(models, school._id, { classId: classRow.id });

    const { TerminalReport } = models;
    const { runWithSchool } = require('../src/middleware/tenantContext');
    await runWithSchool(school._id, () => TerminalReport.create({
      schoolId: school._id, studentId: student.id, classId: classRow.id, academicTermId: term.id, status: 'Locked',
    }));

    const teacherToken = await fixtures.login(app, school.slug, teacherUser.email, teacherPassword);
    const res = await request(app).post('/api/results/bulk').set(fixtures.authHeader(teacherToken)).send({
      classId: classRow.id, subjectId: subject.id, academicTermId: term.id,
      records: [{ studentId: student.id, classScore: 40, examScore: 40 }],
    });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('RESULT_LOCKED');
  });

  test('the report-conflict escalation endpoint records an audit entry regardless of whether a real conflict happened first', async () => {
    const school = await fixtures.createSchool(models);
    const classRow = await fixtures.createClass(models, school._id);
    const subject = await fixtures.createSubject(models, school._id);
    const term = await fixtures.createTerm(models, school._id);
    const { password } = await fixtures.createAdmin(models, school._id, { email: 'admin@offline-escalate.local' });
    const token = await fixtures.login(app, school.slug, 'admin@offline-escalate.local', password);

    const res = await request(app).post('/api/results/report-conflict').set(fixtures.authHeader(token)).send({
      classId: classRow.id, subjectId: subject.id, academicTermId: term.id, message: 'Test escalation',
    });
    expect(res.status).toBe(200);

    const { AuditLog } = models;
    const { runWithSchool } = require('../src/middleware/tenantContext');
    const logs = await runWithSchool(school._id, async () => AuditLog.find({ action: 'result.conflictReported' }));
    expect(logs.length).toBe(1);
  });
});
