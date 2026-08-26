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

// Wires up a class + subject + term + teacher-assignment + one student, and
// returns everything a test needs to drive the results workflow end to end.
// The teacher is also made the class's homeroom teacher — the common case,
// and what every pre-existing test in this file assumes ("the teacher" has
// full authority over the class: attendance, submit, every subject) —
// tests for the subject-specialist-only boundary set up their own second
// teacher explicitly (see 'Class Teacher vs Subject Specialist access').
const setupClassroom = async (schoolId) => {
  const { teacher, user: teacherUser, password: teacherPassword } = await fixtures.createTeacher(models, schoolId);
  const classRow = await fixtures.createClass(models, schoolId, { classTeacherId: teacher.id });
  const subject = await fixtures.createSubject(models, schoolId);
  const term = await fixtures.createTerm(models, schoolId);
  await fixtures.assignSubjectToClass(models, schoolId, { classId: classRow.id, subjectId: subject.id, academicTermId: term.id });
  await fixtures.assignTeacherToClass(models, schoolId, { teacherId: teacher.id, subjectId: subject.id, classId: classRow.id });
  const { student } = await fixtures.createStudent(models, schoolId, { classId: classRow.id });
  return {
    classRow, subject, term, teacher, teacherUser, teacherPassword, student,
  };
};

describe('Results workflow state machine', () => {
  test('full happy path: enter scores -> submit -> approve -> lock -> publish', async () => {
    const school = await fixtures.createSchool(models);
    const { classRow, subject, term, teacherUser, teacherPassword, student } = await setupClassroom(school._id);
    const { password: adminPassword } = await fixtures.createAdmin(models, school._id, { email: 'admin@results-happy.local' });

    const teacherToken = await fixtures.login(app, school.slug, teacherUser.email, teacherPassword);
    const adminToken = await fixtures.login(app, school.slug, 'admin@results-happy.local', adminPassword);

    const record = await request(app).post('/api/results/bulk').set(fixtures.authHeader(teacherToken)).send({
      classId: classRow.id, subjectId: subject.id, academicTermId: term.id,
      records: [{ studentId: student.id, classScore: 45, examScore: 40 }],
    });
    expect(record.status).toBe(200);
    expect(record.body.data[0].totalScore).toBe(85);

    const sheets = await request(app).get('/api/result-sheets').query({ classId: classRow.id, academicTermId: term.id }).set(fixtures.authHeader(teacherToken));
    const sheet = sheets.body.data.find((s) => s.subjectId === subject.id);
    expect(sheet.status).toBe('Draft');

    const submitSheet = await request(app).post(`/api/result-sheets/${sheet.id}/submit`).set(fixtures.authHeader(teacherToken));
    expect(submitSheet.status).toBe(200);
    expect(submitSheet.body.data.status).toBe('Submitted');

    const approveSheet = await request(app).post(`/api/result-sheets/${sheet.id}/approve`).set(fixtures.authHeader(adminToken));
    expect(approveSheet.status).toBe(200);
    expect(approveSheet.body.data.status).toBe('Approved');

    const generate = await request(app).post('/api/terminal-reports/generate').set(fixtures.authHeader(adminToken)).send({ classId: classRow.id, academicTermId: term.id });
    expect(generate.status).toBe(200);

    const reports = await request(app).get('/api/terminal-reports').query({ classId: classRow.id, academicTermId: term.id }).set(fixtures.authHeader(adminToken));
    const report = reports.body.data[0];

    const submitReport = await request(app).post(`/api/terminal-reports/${report.id}/submit`).set(fixtures.authHeader(teacherToken)).send({ teacherSignatureName: 'Teacher' });
    expect(submitReport.status).toBe(200);

    const lockReport = await request(app).post(`/api/terminal-reports/${report.id}/lock`).set(fixtures.authHeader(adminToken)).send({ headteacherSignatureName: 'Head' });
    expect(lockReport.status).toBe(200);
    expect(lockReport.body.data.status).toBe('Locked');

    const publishReport = await request(app).post(`/api/terminal-reports/${report.id}/publish`).set(fixtures.authHeader(adminToken));
    expect(publishReport.status).toBe(200);
    expect(publishReport.body.data.status).toBe('Published');
  });

  test('a teacher cannot edit scores once the sheet is Submitted', async () => {
    const school = await fixtures.createSchool(models);
    const { classRow, subject, term, teacherUser, teacherPassword, student } = await setupClassroom(school._id);
    const teacherToken = await fixtures.login(app, school.slug, teacherUser.email, teacherPassword);

    await request(app).post('/api/results/bulk').set(fixtures.authHeader(teacherToken)).send({
      classId: classRow.id, subjectId: subject.id, academicTermId: term.id,
      records: [{ studentId: student.id, classScore: 30, examScore: 30 }],
    });
    const sheets = await request(app).get('/api/result-sheets').query({ classId: classRow.id, academicTermId: term.id }).set(fixtures.authHeader(teacherToken));
    const sheet = sheets.body.data.find((s) => s.subjectId === subject.id);
    await request(app).post(`/api/result-sheets/${sheet.id}/submit`).set(fixtures.authHeader(teacherToken));

    const secondEdit = await request(app).post('/api/results/bulk').set(fixtures.authHeader(teacherToken)).send({
      classId: classRow.id, subjectId: subject.id, academicTermId: term.id,
      records: [{ studentId: student.id, classScore: 50, examScore: 50 }],
    });
    expect(secondEdit.status).toBe(400);
    expect(secondEdit.body.code).toBe('RESULT_LOCKED');
  });

  test('a teacher cannot edit an Approved result directly — only an admin\'s amend endpoint can, and only with a reason', async () => {
    const school = await fixtures.createSchool(models);
    const { classRow, subject, term, teacherUser, teacherPassword, student } = await setupClassroom(school._id);
    const { password: adminPassword } = await fixtures.createAdmin(models, school._id, { email: 'admin@results-amend.local' });
    const teacherToken = await fixtures.login(app, school.slug, teacherUser.email, teacherPassword);
    const adminToken = await fixtures.login(app, school.slug, 'admin@results-amend.local', adminPassword);

    await request(app).post('/api/results/bulk').set(fixtures.authHeader(teacherToken)).send({
      classId: classRow.id, subjectId: subject.id, academicTermId: term.id,
      records: [{ studentId: student.id, classScore: 30, examScore: 30 }],
    });
    const sheets = await request(app).get('/api/result-sheets').query({ classId: classRow.id, academicTermId: term.id }).set(fixtures.authHeader(teacherToken));
    const sheet = sheets.body.data.find((s) => s.subjectId === subject.id);
    await request(app).post(`/api/result-sheets/${sheet.id}/submit`).set(fixtures.authHeader(teacherToken));
    await request(app).post(`/api/result-sheets/${sheet.id}/approve`).set(fixtures.authHeader(adminToken));

    const roster = await request(app).get('/api/results/roster').query({ classId: classRow.id, subjectId: subject.id, academicTermId: term.id }).set(fixtures.authHeader(adminToken));
    const resultId = roster.body.data[0].resultId;

    // Teacher role is not even authorized to call the amend route at all.
    const teacherAttempt = await request(app).post(`/api/results/${resultId}/amend`).set(fixtures.authHeader(teacherToken)).send({ classScore: 45, examScore: 45, reason: 'trying anyway' });
    expect(teacherAttempt.status).toBe(403);

    // Admin without a reason is rejected too — amendments must be explained.
    const noReason = await request(app).post(`/api/results/${resultId}/amend`).set(fixtures.authHeader(adminToken)).send({ classScore: 45, examScore: 45 });
    expect(noReason.status).toBe(400);

    const properAmend = await request(app).post(`/api/results/${resultId}/amend`).set(fixtures.authHeader(adminToken)).send({ classScore: 45, examScore: 45, reason: 'Corrected a grading error' });
    expect(properAmend.status).toBe(200);
    expect(properAmend.body.data.totalScore).toBe(90);
  });

  test('a rejected sheet carries the reason and can be resubmitted after correction', async () => {
    const school = await fixtures.createSchool(models);
    const { classRow, subject, term, teacherUser, teacherPassword, student } = await setupClassroom(school._id);
    const { password: adminPassword } = await fixtures.createAdmin(models, school._id, { email: 'admin@results-reject.local' });
    const teacherToken = await fixtures.login(app, school.slug, teacherUser.email, teacherPassword);
    const adminToken = await fixtures.login(app, school.slug, 'admin@results-reject.local', adminPassword);

    await request(app).post('/api/results/bulk').set(fixtures.authHeader(teacherToken)).send({
      classId: classRow.id, subjectId: subject.id, academicTermId: term.id,
      records: [{ studentId: student.id, classScore: 30, examScore: 30 }],
    });
    const sheets = await request(app).get('/api/result-sheets').query({ classId: classRow.id, academicTermId: term.id }).set(fixtures.authHeader(teacherToken));
    const sheet = sheets.body.data.find((s) => s.subjectId === subject.id);
    await request(app).post(`/api/result-sheets/${sheet.id}/submit`).set(fixtures.authHeader(teacherToken));

    const reject = await request(app).post(`/api/result-sheets/${sheet.id}/reject`).set(fixtures.authHeader(adminToken)).send({ rejectionReason: 'Please double-check Student A' });
    expect(reject.status).toBe(200);
    expect(reject.body.data.status).toBe('Rejected');
    expect(reject.body.data.rejectionReason).toBe('Please double-check Student A');

    const resubmit = await request(app).post(`/api/result-sheets/${sheet.id}/submit`).set(fixtures.authHeader(teacherToken));
    expect(resubmit.status).toBe(200);
    expect(resubmit.body.data.status).toBe('Submitted');
  });
});

describe('Class Teacher vs Subject Specialist access (score entry)', () => {
  // A class with TWO subjects and TWO teachers: the homeroom teacher is
  // only explicitly assigned to Subject A; a second, subject-only teacher
  // is assigned to Subject B and nothing else.
  const setupTwoTeacherClassroom = async (schoolId) => {
    const { teacher: homeroomTeacher, user: homeroomUser, password: homeroomPassword } = await fixtures.createTeacher(models, schoolId);
    const classRow = await fixtures.createClass(models, schoolId, { classTeacherId: homeroomTeacher.id });
    const subjectA = await fixtures.createSubject(models, schoolId, { name: 'Subject A' });
    const subjectB = await fixtures.createSubject(models, schoolId, { name: 'Subject B' });
    const term = await fixtures.createTerm(models, schoolId);
    await fixtures.assignSubjectToClass(models, schoolId, { classId: classRow.id, subjectId: subjectA.id, academicTermId: term.id });
    await fixtures.assignSubjectToClass(models, schoolId, { classId: classRow.id, subjectId: subjectB.id, academicTermId: term.id });
    await fixtures.assignTeacherToClass(models, schoolId, { teacherId: homeroomTeacher.id, subjectId: subjectA.id, classId: classRow.id });

    const { teacher: subjectTeacher, user: subjectUser, password: subjectPassword } = await fixtures.createTeacher(models, schoolId);
    await fixtures.assignTeacherToClass(models, schoolId, { teacherId: subjectTeacher.id, subjectId: subjectB.id, classId: classRow.id });

    const { student } = await fixtures.createStudent(models, schoolId, { classId: classRow.id });
    return {
      classRow, subjectA, subjectB, term, student, homeroomUser, homeroomPassword, subjectUser, subjectPassword,
    };
  };

  test('a subject specialist can enter scores for their own assigned subject', async () => {
    const school = await fixtures.createSchool(models);
    const {
      classRow, subjectB, term, student, subjectUser, subjectPassword,
    } = await setupTwoTeacherClassroom(school._id);
    const token = await fixtures.login(app, school.slug, subjectUser.email, subjectPassword);

    const res = await request(app).post('/api/results/bulk').set(fixtures.authHeader(token)).send({
      classId: classRow.id, subjectId: subjectB.id, academicTermId: term.id,
      records: [{ studentId: student.id, classScore: 30, examScore: 30 }],
    });
    expect(res.status).toBe(200);
  });

  test('a subject specialist cannot enter scores for a subject they are not assigned to teach, even in a class they teach', async () => {
    const school = await fixtures.createSchool(models);
    const {
      classRow, subjectA, term, student, subjectUser, subjectPassword,
    } = await setupTwoTeacherClassroom(school._id);
    const token = await fixtures.login(app, school.slug, subjectUser.email, subjectPassword);

    // subjectUser is assigned to Subject B, not Subject A.
    const res = await request(app).post('/api/results/bulk').set(fixtures.authHeader(token)).send({
      classId: classRow.id, subjectId: subjectA.id, academicTermId: term.id,
      records: [{ studentId: student.id, classScore: 30, examScore: 30 }],
    });
    expect(res.status).toBe(403);
  });

  test('a subject specialist cannot view the roster for a subject they are not assigned to teach', async () => {
    const school = await fixtures.createSchool(models);
    const {
      classRow, subjectA, term, subjectUser, subjectPassword,
    } = await setupTwoTeacherClassroom(school._id);
    const token = await fixtures.login(app, school.slug, subjectUser.email, subjectPassword);

    const res = await request(app).get('/api/results/roster').query({
      classId: classRow.id, subjectId: subjectA.id, academicTermId: term.id,
    }).set(fixtures.authHeader(token));
    expect(res.status).toBe(403);
  });

  test('the homeroom teacher gets Master Entry — can enter scores for a subject they have no explicit TeacherSubjectAssignment for', async () => {
    const school = await fixtures.createSchool(models);
    const {
      classRow, subjectB, term, student, homeroomUser, homeroomPassword,
    } = await setupTwoTeacherClassroom(school._id);
    const token = await fixtures.login(app, school.slug, homeroomUser.email, homeroomPassword);

    // homeroomUser is only explicitly assigned to Subject A, not Subject B.
    const res = await request(app).post('/api/results/bulk').set(fixtures.authHeader(token)).send({
      classId: classRow.id, subjectId: subjectB.id, academicTermId: term.id,
      records: [{ studentId: student.id, classScore: 35, examScore: 35 }],
    });
    expect(res.status).toBe(200);
  });
});
