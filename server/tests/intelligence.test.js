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

const createResult = async (schoolId, fields) => {
  const { Result } = models;
  return runWithSchool(schoolId, async () => Result.create({ schoolId, ...fields }));
};

const createAttendance = async (schoolId, { studentId, classId, academicTermId, status, dayOffset }) => {
  const { Attendance } = models;
  return runWithSchool(schoolId, async () => Attendance.create({
    schoolId, studentId, classId, academicTermId, status, attendanceDate: new Date(2026, 0, 1 + dayOffset).toISOString().slice(0, 10),
  }));
};

describe('GET /intelligence/summary', () => {
  test('counts at-risk and improving students, and reports the term attendance average', async () => {
    const school = await fixtures.createSchool(models);
    const classRow = await fixtures.createClass(models, school._id);
    const subject = await fixtures.createSubject(models, school._id);
    const priorTerm = await fixtures.createTerm(models, school._id, { termNumber: 1, isCurrent: false, startDate: new Date('2026-01-10') });
    const currentTerm = await fixtures.createTerm(models, school._id, { termNumber: 2, isCurrent: true, startDate: new Date('2026-05-10') });

    // Declining student — flagged at-risk (academic_decline).
    const { student: declining } = await fixtures.createStudent(models, school._id, { classId: classRow.id });
    await createResult(school._id, {
      studentId: declining.id, subjectId: subject.id, classId: classRow.id, academicTermId: priorTerm.id, classScore: 45, examScore: 45, totalScore: 90,
    });
    await createResult(school._id, {
      studentId: declining.id, subjectId: subject.id, classId: classRow.id, academicTermId: currentTerm.id, classScore: 25, examScore: 25, totalScore: 50,
    });

    // Improving student.
    const { student: improving } = await fixtures.createStudent(models, school._id, { classId: classRow.id });
    await createResult(school._id, {
      studentId: improving.id, subjectId: subject.id, classId: classRow.id, academicTermId: priorTerm.id, classScore: 20, examScore: 20, totalScore: 40,
    });
    await createResult(school._id, {
      studentId: improving.id, subjectId: subject.id, classId: classRow.id, academicTermId: currentTerm.id, classScore: 45, examScore: 45, totalScore: 90,
    });

    await createAttendance(school._id, {
      studentId: declining.id, classId: classRow.id, academicTermId: currentTerm.id, status: 'Present', dayOffset: 0,
    });
    await createAttendance(school._id, {
      studentId: improving.id, classId: classRow.id, academicTermId: currentTerm.id, status: 'Absent', dayOffset: 0,
    });

    const { password } = await fixtures.createAdmin(models, school._id, { email: 'admin@intelligence-test.local' });
    const token = await fixtures.login(app, school.slug, 'admin@intelligence-test.local', password);

    const res = await request(app).get('/api/intelligence/summary')
      .query({ academicTermId: currentTerm.id })
      .set(fixtures.authHeader(token));

    expect(res.status).toBe(200);
    expect(res.body.data.atRiskCount).toBe(1);
    expect(res.body.data.improvingCount).toBe(1);
    expect(res.body.data.termAttendanceAveragePercent).toBe(50);
    expect(res.body.data.topClass.classId).toBe(classRow.id);
  });

  test('flags a subject where under half the class is passing', async () => {
    const school = await fixtures.createSchool(models);
    const classRow = await fixtures.createClass(models, school._id);
    const weakSubject = await fixtures.createSubject(models, school._id, { name: 'Weak Subject' });
    const term = await fixtures.createTerm(models, school._id);
    const { student: s1 } = await fixtures.createStudent(models, school._id, { classId: classRow.id });
    const { student: s2 } = await fixtures.createStudent(models, school._id, { classId: classRow.id });

    await createResult(school._id, {
      studentId: s1.id, subjectId: weakSubject.id, classId: classRow.id, academicTermId: term.id, classScore: 10, examScore: 10, totalScore: 20,
    });
    await createResult(school._id, {
      studentId: s2.id, subjectId: weakSubject.id, classId: classRow.id, academicTermId: term.id, classScore: 15, examScore: 15, totalScore: 30,
    });

    const { password } = await fixtures.createAdmin(models, school._id, { email: 'admin2@intelligence-test.local' });
    const token = await fixtures.login(app, school.slug, 'admin2@intelligence-test.local', password);

    const res = await request(app).get('/api/intelligence/summary')
      .query({ academicTermId: term.id })
      .set(fixtures.authHeader(token));

    expect(res.body.data.subjectAlerts).toEqual([
      expect.objectContaining({ subjectName: 'Weak Subject', passRate: 0 }),
    ]);
  });

  test('defaults to the current term when none is specified', async () => {
    const school = await fixtures.createSchool(models);
    await fixtures.createTerm(models, school._id, { isCurrent: true });
    const { password } = await fixtures.createAdmin(models, school._id, { email: 'admin3@intelligence-test.local' });
    const token = await fixtures.login(app, school.slug, 'admin3@intelligence-test.local', password);

    const res = await request(app).get('/api/intelligence/summary').set(fixtures.authHeader(token));
    expect(res.status).toBe(200);
  });

  test('is admin-only', async () => {
    const school = await fixtures.createSchool(models);
    const { password } = await fixtures.createTeacher(models, school._id, { email: 'teacher@intelligence-test.local' });
    const token = await fixtures.login(app, school.slug, 'teacher@intelligence-test.local', password);

    const res = await request(app).get('/api/intelligence/summary').set(fixtures.authHeader(token));
    expect(res.status).toBe(403);
  });
});
