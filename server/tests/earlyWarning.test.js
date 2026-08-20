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

// dayOffset lets each call land on a distinct attendanceDate — Attendance
// is unique on {schoolId, studentId, attendanceDate}.
const createAttendance = async (schoolId, { studentId, classId, academicTermId, status, dayOffset }) => {
  const { Attendance } = models;
  return runWithSchool(schoolId, async () => Attendance.create({
    schoolId, studentId, classId, academicTermId, status, attendanceDate: new Date(2025, 0, 1 + dayOffset),
  }));
};

const markAttendance = async (schoolId, studentId, classId, academicTermId, statuses) => Promise.all(
  statuses.map((status, i) => createAttendance(schoolId, {
    studentId, classId, academicTermId, status, dayOffset: i,
  })),
);

describe('Early-Warning Intelligence', () => {
  test('flags low attendance, but not a student with good attendance', async () => {
    const school = await fixtures.createSchool(models);
    const classRow = await fixtures.createClass(models, school._id);
    const term = await fixtures.createTerm(models, school._id, { isCurrent: true });
    const { student: strugglingStudent } = await fixtures.createStudent(models, school._id, { classId: classRow.id });
    const { student: fineStudent } = await fixtures.createStudent(models, school._id, { classId: classRow.id });
    const { password } = await fixtures.createAdmin(models, school._id, { email: 'admin@warning-test.local' });
    const token = await fixtures.login(app, school.slug, 'admin@warning-test.local', password);

    // 3/8 attended = 37.5% — below the 75% threshold, and 8 >= the minimum record count.
    await markAttendance(school._id, strugglingStudent.id, classRow.id, term.id, ['Present', 'Present', 'Present', 'Absent', 'Absent', 'Absent', 'Absent', 'Absent']);
    // 7/8 attended = 87.5% — comfortably above threshold.
    await markAttendance(school._id, fineStudent.id, classRow.id, term.id, ['Present', 'Present', 'Present', 'Present', 'Present', 'Present', 'Present', 'Absent']);

    const res = await request(app).get('/api/early-warning/at-risk-students').query({ academicTermId: term.id }).set(fixtures.authHeader(token));
    expect(res.status).toBe(200);

    const ids = res.body.data.students.map((s) => s.studentId);
    expect(ids).toContain(strugglingStudent.id);
    expect(ids).not.toContain(fineStudent.id);
    const flagged = res.body.data.students.find((s) => s.studentId === strugglingStudent.id);
    expect(flagged.academicFlags.map((f) => f.type)).toEqual(['low_attendance']);
  });

  test('too few attendance records is not enough signal to flag, even if every one is an absence', async () => {
    const school = await fixtures.createSchool(models);
    const classRow = await fixtures.createClass(models, school._id);
    const term = await fixtures.createTerm(models, school._id, { isCurrent: true });
    const { student } = await fixtures.createStudent(models, school._id, { classId: classRow.id });
    const { password } = await fixtures.createAdmin(models, school._id, { email: 'admin2@warning-test.local' });
    const token = await fixtures.login(app, school.slug, 'admin2@warning-test.local', password);

    await markAttendance(school._id, student.id, classRow.id, term.id, ['Absent', 'Absent', 'Absent']);

    const res = await request(app).get('/api/early-warning/at-risk-students').query({ academicTermId: term.id }).set(fixtures.authHeader(token));
    expect(res.body.data.students.map((s) => s.studentId)).not.toContain(student.id);
  });

  test('flags a downward multi-term trend, reusing the same trend engine as Performance Insights', async () => {
    const school = await fixtures.createSchool(models);
    const classRow = await fixtures.createClass(models, school._id);
    const subject = await fixtures.createSubject(models, school._id);
    const priorTerm = await fixtures.createTerm(models, school._id, { termNumber: 1, isCurrent: false, startDate: new Date('2025-01-10') });
    const currentTerm = await fixtures.createTerm(models, school._id, { termNumber: 2, isCurrent: true, startDate: new Date('2025-05-10') });
    const { student } = await fixtures.createStudent(models, school._id, { classId: classRow.id });
    const { password } = await fixtures.createAdmin(models, school._id, { email: 'admin3@warning-test.local' });
    const token = await fixtures.login(app, school.slug, 'admin3@warning-test.local', password);

    await createResult(school._id, {
      studentId: student.id, subjectId: subject.id, classId: classRow.id, academicTermId: priorTerm.id, classScore: 45, examScore: 45, totalScore: 90,
    });
    await createResult(school._id, {
      studentId: student.id, subjectId: subject.id, classId: classRow.id, academicTermId: currentTerm.id, classScore: 25, examScore: 25, totalScore: 50,
    });

    const res = await request(app).get('/api/early-warning/at-risk-students').query({ academicTermId: currentTerm.id }).set(fixtures.authHeader(token));
    const flagged = res.body.data.students.find((s) => s.studentId === student.id);
    expect(flagged.academicFlags.map((f) => f.type)).toContain('academic_decline');
  });

  test('flags failing 2+ subjects this term, but not just 1', async () => {
    const school = await fixtures.createSchool(models);
    const classRow = await fixtures.createClass(models, school._id);
    const subjectA = await fixtures.createSubject(models, school._id);
    const subjectB = await fixtures.createSubject(models, school._id);
    const subjectC = await fixtures.createSubject(models, school._id);
    const term = await fixtures.createTerm(models, school._id, { isCurrent: true });
    const { student: twoFailing } = await fixtures.createStudent(models, school._id, { classId: classRow.id });
    const { student: oneFailing } = await fixtures.createStudent(models, school._id, { classId: classRow.id });
    const { password } = await fixtures.createAdmin(models, school._id, { email: 'admin4@warning-test.local' });
    const token = await fixtures.login(app, school.slug, 'admin4@warning-test.local', password);

    await createResult(school._id, { studentId: twoFailing.id, subjectId: subjectA.id, classId: classRow.id, academicTermId: term.id, classScore: 10, examScore: 10, totalScore: 20 });
    await createResult(school._id, { studentId: twoFailing.id, subjectId: subjectB.id, classId: classRow.id, academicTermId: term.id, classScore: 15, examScore: 15, totalScore: 30 });

    await createResult(school._id, { studentId: oneFailing.id, subjectId: subjectA.id, classId: classRow.id, academicTermId: term.id, classScore: 10, examScore: 10, totalScore: 20 });
    await createResult(school._id, { studentId: oneFailing.id, subjectId: subjectC.id, classId: classRow.id, academicTermId: term.id, classScore: 40, examScore: 40, totalScore: 80 });

    const res = await request(app).get('/api/early-warning/at-risk-students').query({ academicTermId: term.id }).set(fixtures.authHeader(token));
    const ids = res.body.data.students.map((s) => s.studentId);
    expect(ids).toContain(twoFailing.id);
    expect(ids).not.toContain(oneFailing.id);
  });

  test('a fee balance alone never flags a student — only attaches as context on an already-flagged one', async () => {
    const school = await fixtures.createSchool(models);
    const classRow = await fixtures.createClass(models, school._id);
    const term = await fixtures.createTerm(models, school._id, { isCurrent: true });
    const { student: debtOnlyStudent } = await fixtures.createStudent(models, school._id, { classId: classRow.id });
    const { student: flaggedWithDebt } = await fixtures.createStudent(models, school._id, { classId: classRow.id });
    const { password } = await fixtures.createAdmin(models, school._id, { email: 'admin5@warning-test.local' });
    const token = await fixtures.login(app, school.slug, 'admin5@warning-test.local', password);

    const { Fee } = models;
    // Both students owe money — but only flaggedWithDebt also has a real academic flag.
    await runWithSchool(school._id, async () => Fee.create({
      schoolId: school._id, studentId: debtOnlyStudent.id, academicTermId: term.id, feeType: 'Tuition', category: 'Tuition', amountDue: 500,
    }));
    await runWithSchool(school._id, async () => Fee.create({
      schoolId: school._id, studentId: flaggedWithDebt.id, academicTermId: term.id, feeType: 'Tuition', category: 'Tuition', amountDue: 500,
    }));
    await markAttendance(school._id, flaggedWithDebt.id, classRow.id, term.id, ['Absent', 'Absent', 'Absent', 'Absent', 'Absent', 'Absent', 'Present', 'Present']);

    const res = await request(app).get('/api/early-warning/at-risk-students').query({ academicTermId: term.id }).set(fixtures.authHeader(token));
    const ids = res.body.data.students.map((s) => s.studentId);

    expect(ids).not.toContain(debtOnlyStudent.id);
    expect(ids).toContain(flaggedWithDebt.id);
    const flagged = res.body.data.students.find((s) => s.studentId === flaggedWithDebt.id);
    expect(flagged.outstandingBalance).toBe(500);
  });

  test('a teacher sees only at-risk students in their own assigned classes, never school-wide', async () => {
    const school = await fixtures.createSchool(models);
    const myClass = await fixtures.createClass(models, school._id);
    const otherClass = await fixtures.createClass(models, school._id);
    const term = await fixtures.createTerm(models, school._id, { isCurrent: true });
    const subject = await fixtures.createSubject(models, school._id);
    const { teacher, user: teacherUser, password: teacherPassword } = await fixtures.createTeacher(models, school._id);
    await fixtures.assignSubjectToClass(models, school._id, { classId: myClass.id, subjectId: subject.id, academicTermId: term.id });
    await fixtures.assignTeacherToClass(models, school._id, { teacherId: teacher.id, subjectId: subject.id, classId: myClass.id });

    const { student: myStudent } = await fixtures.createStudent(models, school._id, { classId: myClass.id });
    const { student: otherStudent } = await fixtures.createStudent(models, school._id, { classId: otherClass.id });
    await markAttendance(school._id, myStudent.id, myClass.id, term.id, ['Absent', 'Absent', 'Absent', 'Absent', 'Absent', 'Absent', 'Present', 'Present']);
    await markAttendance(school._id, otherStudent.id, otherClass.id, term.id, ['Absent', 'Absent', 'Absent', 'Absent', 'Absent', 'Absent', 'Present', 'Present']);

    const teacherToken = await fixtures.login(app, school.slug, teacherUser.email, teacherPassword);
    const res = await request(app).get('/api/early-warning/at-risk-students').query({ academicTermId: term.id }).set(fixtures.authHeader(teacherToken));

    const ids = res.body.data.students.map((s) => s.studentId);
    expect(ids).toContain(myStudent.id);
    expect(ids).not.toContain(otherStudent.id);
  });

  describe('with a Gemini key present (network call mocked)', () => {
    const originalKey = process.env.GEMINI_API_KEY;
    const originalFetch = global.fetch;

    beforeEach(() => {
      process.env.GEMINI_API_KEY = 'test-fake-key';
      global.fetch = jest.fn(async () => ({
        ok: true,
        json: async () => ({ candidates: [{ content: { parts: [{ text: 'A few students may benefit from a quiet check-in this term.' }] } }] }),
      }));
    });

    afterEach(() => {
      process.env.GEMINI_API_KEY = originalKey;
      global.fetch = originalFetch;
    });

    test('adds a synthesis when students are flagged, sending first names and fee PRESENCE only — never a surname or exact amount', async () => {
      const school = await fixtures.createSchool(models);
      const classRow = await fixtures.createClass(models, school._id);
      const term = await fixtures.createTerm(models, school._id, { isCurrent: true });
      const { student } = await fixtures.createStudent(models, school._id, {
        classId: classRow.id, overrides: { firstName: 'Kojo', lastName: 'DoNotLeakThisSurname' },
      });
      const { password } = await fixtures.createAdmin(models, school._id, { email: 'admin6@warning-test.local' });
      const token = await fixtures.login(app, school.slug, 'admin6@warning-test.local', password);

      const { Fee } = models;
      await runWithSchool(school._id, async () => Fee.create({
        schoolId: school._id, studentId: student.id, academicTermId: term.id, feeType: 'Tuition', category: 'Tuition', amountDue: 1234,
      }));
      await markAttendance(school._id, student.id, classRow.id, term.id, ['Absent', 'Absent', 'Absent', 'Absent', 'Absent', 'Absent', 'Present', 'Present']);

      const res = await request(app).get('/api/early-warning/at-risk-students').query({ academicTermId: term.id }).set(fixtures.authHeader(token));
      expect(res.body.data.aiSynthesis).toBe('A few students may benefit from a quiet check-in this term.');

      const promptSent = JSON.parse(global.fetch.mock.calls[0][1].body).contents[0].parts[0].text;
      expect(promptSent).toContain('Kojo');
      expect(promptSent).not.toContain('DoNotLeakThisSurname');
      expect(promptSent).not.toContain('1234');
    });

    test('no flagged students means no synthesis, and the AI is never called', async () => {
      const school = await fixtures.createSchool(models);
      const classRow = await fixtures.createClass(models, school._id);
      const term = await fixtures.createTerm(models, school._id, { isCurrent: true });
      await fixtures.createStudent(models, school._id, { classId: classRow.id }); // enrolled, but nothing to flag
      const { password } = await fixtures.createAdmin(models, school._id, { email: 'admin7@warning-test.local' });
      const token = await fixtures.login(app, school.slug, 'admin7@warning-test.local', password);

      const res = await request(app).get('/api/early-warning/at-risk-students').query({ academicTermId: term.id }).set(fixtures.authHeader(token));
      expect(res.status).toBe(200);
      expect(res.body.data.students).toEqual([]);
      expect(res.body.data.aiSynthesis).toBeNull();
      expect(global.fetch).not.toHaveBeenCalled();
    });

    test('with no academicTermId given, the school\'s current term is used automatically', async () => {
      const school = await fixtures.createSchool(models);
      await fixtures.createTerm(models, school._id, { isCurrent: true });
      const { password } = await fixtures.createAdmin(models, school._id, { email: 'admin8@warning-test.local' });
      const token = await fixtures.login(app, school.slug, 'admin8@warning-test.local', password);

      const res = await request(app).get('/api/early-warning/at-risk-students').set(fixtures.authHeader(token));
      expect(res.status).toBe(200);
    });
  });
});
