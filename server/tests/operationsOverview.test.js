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

const setup = async (emailSuffix) => {
  const school = await fixtures.createSchool(models);
  const { password } = await fixtures.createAdmin(models, school._id, { email: `admin-${emailSuffix}@ops-overview-test.local` });
  const token = await fixtures.login(app, school.slug, `admin-${emailSuffix}@ops-overview-test.local`, password);
  return { school, token };
};

const getReport = (token) => request(app).get('/api/analytics/operations-overview').set(fixtures.authHeader(token));
const findPillar = (res, key) => res.body.data.pillars.find((p) => p.key === key);
const today = () => new Date().toISOString().slice(0, 10);

describe('GET /analytics/operations-overview', () => {
  test('is admin-only', async () => {
    const { school } = await setup('role');
    const { user: teacherUser, password } = await fixtures.createTeacher(models, school._id, { email: 'teacher@ops-overview-test.local' });
    const token = await fixtures.login(app, school.slug, teacherUser.email, password);
    const res = await getReport(token);
    expect(res.status).toBe(403);
  });

  test('a school with no current term reports null academic/finance rates and zero pending approvals, not an error', async () => {
    const { token } = await setup('no-term');
    const res = await getReport(token);
    expect(res.status).toBe(200);
    expect(res.body.data.hasCurrentTerm).toBe(false);
    expect(findPillar(res, 'academics').rate).toBeNull();
    expect(findPillar(res, 'finance').rate).toBeNull();
    expect(res.body.data.pendingApprovals).toBe(0);
  });

  test('academic completion counts approved result sheets against expected (class, subject) assignment pairs', async () => {
    const { school, token } = await setup('academic');
    const term = await fixtures.createTerm(models, school._id, { isCurrent: true });
    const classA = await fixtures.createClass(models, school._id);
    const classB = await fixtures.createClass(models, school._id);
    const subject = await fixtures.createSubject(models, school._id);
    const { teacher } = await fixtures.createTeacher(models, school._id, { email: 'academic-t@ops-overview-test.local' });
    await fixtures.assignTeacherToClass(models, school._id, { teacherId: teacher.id, subjectId: subject.id, classId: classA.id });
    await fixtures.assignTeacherToClass(models, school._id, { teacherId: teacher.id, subjectId: subject.id, classId: classB.id });

    const { ResultSheet } = models;
    await runWithSchool(school._id, () => ResultSheet.create({
      schoolId: school._id, classId: classA.id, subjectId: subject.id, academicTermId: term.id, status: 'Approved',
    }));
    await runWithSchool(school._id, () => ResultSheet.create({
      schoolId: school._id, classId: classB.id, subjectId: subject.id, academicTermId: term.id, status: 'Submitted',
    }));

    const res = await getReport(token);
    const academics = findPillar(res, 'academics');
    expect(academics.rate).toBe(50);
    expect(res.body.data.pendingApprovals).toBe(1);
  });

  test('attendance pillar only counts this calendar month\'s records, and treats Present/Late as attended', async () => {
    const { school, token } = await setup('attendance');
    const classRow = await fixtures.createClass(models, school._id);
    const { student: s1 } = await fixtures.createStudent(models, school._id, { classId: classRow.id });
    const { student: s2 } = await fixtures.createStudent(models, school._id, { classId: classRow.id });
    const { student: s3 } = await fixtures.createStudent(models, school._id, { classId: classRow.id });
    const { Attendance } = models;
    await runWithSchool(school._id, () => Attendance.create({
      schoolId: school._id, studentId: s1.id, classId: classRow.id, attendanceDate: today(), status: 'Present',
    }));
    await runWithSchool(school._id, () => Attendance.create({
      schoolId: school._id, studentId: s2.id, classId: classRow.id, attendanceDate: today(), status: 'Late',
    }));
    await runWithSchool(school._id, () => Attendance.create({
      schoolId: school._id, studentId: s3.id, classId: classRow.id, attendanceDate: today(), status: 'Absent',
    }));
    // Outside this month -- must not affect the rate either way.
    await runWithSchool(school._id, () => Attendance.create({
      schoolId: school._id, studentId: s1.id, classId: classRow.id, attendanceDate: '2019-01-15', status: 'Absent',
    }));

    const res = await getReport(token);
    const attendance = findPillar(res, 'attendance');
    expect(attendance.rate).toBe(66.7);
  });

  test('finance pillar reflects actual payments recorded against fees for the current term', async () => {
    const { school, token } = await setup('finance');
    const term = await fixtures.createTerm(models, school._id, { isCurrent: true });
    const classRow = await fixtures.createClass(models, school._id);
    const { student } = await fixtures.createStudent(models, school._id, { classId: classRow.id });
    const { Fee, Payment } = models;
    const fee = await runWithSchool(school._id, () => Fee.create({
      schoolId: school._id, studentId: student.id, academicTermId: term.id, feeType: 'Tuition', category: 'Tuition', amountDue: 1000,
    }));
    await runWithSchool(school._id, () => Payment.create({
      schoolId: school._id, feeId: fee.id, amountPaid: 400, paymentDate: today(), paymentMethod: 'Cash',
    }));

    const res = await getReport(token);
    const finance = findPillar(res, 'finance');
    expect(finance.rate).toBe(40);
  });

  test('an unassigned teacher lowers the Operations pillar but not Data Quality', async () => {
    const { school, token } = await setup('operations');
    await fixtures.createTeacher(models, school._id, { email: 'idle@ops-overview-test.local' });

    const res = await getReport(token);
    const operations = findPillar(res, 'operations');
    const dataQuality = findPillar(res, 'dataQuality');
    expect(operations.rate).toBeLessThan(100);
    expect(dataQuality.rate).toBe(100);
  });

  test('a student missing a date of birth lowers the Data Quality pillar but not Operations', async () => {
    const { school, token } = await setup('dq');
    const { teacher } = await fixtures.createTeacher(models, school._id, { email: 'homeroom@ops-overview-test.local' });
    const subject = await fixtures.createSubject(models, school._id);
    const classRow = await fixtures.createClass(models, school._id, { classTeacherId: teacher.id });
    await fixtures.assignSubjectToClass(models, school._id, { classId: classRow.id, subjectId: subject.id });
    await fixtures.createStudent(models, school._id, { classId: classRow.id, overrides: { dateOfBirth: null } });

    const res = await getReport(token);
    const operations = findPillar(res, 'operations');
    const dataQuality = findPillar(res, 'dataQuality');
    expect(dataQuality.rate).toBeLessThan(100);
    expect(operations.rate).toBe(100);
  });

  test('overallScore averages only the pillars that have data, not the null ones', async () => {
    const { token } = await setup('overall');
    // No term, no attendance, no students/teachers -- academics and finance
    // stay null; attendance/operations/dataQuality all read as 100/null-safe.
    const res = await getReport(token);
    expect(res.body.data.overallScore).not.toBeNull();
    expect(findPillar(res, 'academics').rate).toBeNull();
  });

  test('never leaks another school\'s pending approvals into this school\'s report', async () => {
    const { school: schoolA, token: tokenA } = await setup('tenant-a');
    const { school: schoolB } = await setup('tenant-b');
    await fixtures.createTerm(models, schoolA._id, { isCurrent: true });
    const termB = await fixtures.createTerm(models, schoolB._id, { isCurrent: true });
    const classB = await fixtures.createClass(models, schoolB._id);
    const subjectB = await fixtures.createSubject(models, schoolB._id);
    const { ResultSheet } = models;
    await runWithSchool(schoolB._id, () => ResultSheet.create({
      schoolId: schoolB._id, classId: classB.id, subjectId: subjectB.id, academicTermId: termB.id, status: 'Submitted',
    }));

    const res = await getReport(tokenA);
    expect(res.body.data.pendingApprovals).toBe(0);
  });
});
