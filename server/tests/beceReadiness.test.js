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
  const { password } = await fixtures.createAdmin(models, school._id, { email: `admin-${emailSuffix}@bece-test.local` });
  const token = await fixtures.login(app, school.slug, `admin-${emailSuffix}@bece-test.local`, password);
  return { school, token };
};

const getReport = (token) => request(app).get('/api/analytics/bece-readiness').set(fixtures.authHeader(token));

describe('GET /analytics/bece-readiness', () => {
  test('is admin-only', async () => {
    const { school } = await setup('role');
    const { user: teacherUser, password } = await fixtures.createTeacher(models, school._id, { email: 'teacher@bece-test.local' });
    const token = await fixtures.login(app, school.slug, teacherUser.email, password);
    const res = await getReport(token);
    expect(res.status).toBe(403);
  });

  test('a school with no JHS 3 class reports a null readyPercent, not a divide-by-zero error', async () => {
    const { school, token } = await setup('no-jhs3');
    await fixtures.createClass(models, school._id, { name: 'Basic 6' });
    const res = await getReport(token);
    expect(res.status).toBe(200);
    expect(res.body.data.classes).toEqual([]);
    expect(res.body.data.candidateTotal).toBe(0);
    expect(res.body.data.readyPercent).toBeNull();
  });

  test('a fully-compliant candidate is counted ready and never appears in the candidates list', async () => {
    const { school, token } = await setup('ready');
    const jhs3 = await fixtures.createClass(models, school._id, { name: 'JHS 3', gradeLevel: 'JHS 3', levelOrder: 13 });
    const subject = await fixtures.createSubject(models, school._id);
    await fixtures.assignSubjectToClass(models, school._id, { classId: jhs3.id, subjectId: subject.id });
    const { student } = await fixtures.createStudent(models, school._id, {
      classId: jhs3.id,
      overrides: {
        gender: 'Female', dateOfBirth: '2010-01-01', waecIndexNumber: '4012345001', photoUrl: 'https://cdn.example/photo.jpg', hometown: 'Kumasi', region: 'Ashanti Region',
      },
    });
    await fixtures.createParentWithChild(models, school._id, student.id);

    const res = await getReport(token);
    expect(res.status).toBe(200);
    expect(res.body.data.candidateTotal).toBe(1);
    expect(res.body.data.readyCount).toBe(1);
    expect(res.body.data.readyPercent).toBe(100);
    expect(res.body.data.candidates).toEqual([]);
    res.body.data.criteria.forEach((c) => expect(c.passCount).toBe(c.total));
  });

  test('flags a candidate missing date of birth, gender, index number, and photo', async () => {
    const { school, token } = await setup('mandatory');
    const jhs3 = await fixtures.createClass(models, school._id, { name: 'JHS 3', gradeLevel: 'JHS 3', levelOrder: 13 });
    const subject = await fixtures.createSubject(models, school._id);
    await fixtures.assignSubjectToClass(models, school._id, { classId: jhs3.id, subjectId: subject.id });
    const { student } = await fixtures.createStudent(models, school._id, {
      classId: jhs3.id,
      overrides: {
        gender: null, dateOfBirth: null, photoUrl: null, hometown: 'Kumasi', region: 'Ashanti Region',
      },
    });
    await fixtures.createParentWithChild(models, school._id, student.id);

    const res = await getReport(token);
    const candidate = res.body.data.candidates.find((c) => c.studentId === student.id);
    expect(candidate.missing).toEqual(expect.arrayContaining(['Date of Birth', 'Gender', 'WAEC/BECE Index Number', 'Photo']));
    expect(res.body.data.readyCount).toBe(0);
  });

  test('flags a candidate missing hometown/region even when everything else is complete', async () => {
    const { school, token } = await setup('demographics');
    const jhs3 = await fixtures.createClass(models, school._id, { name: 'JHS 3', gradeLevel: 'JHS 3', levelOrder: 13 });
    const subject = await fixtures.createSubject(models, school._id);
    await fixtures.assignSubjectToClass(models, school._id, { classId: jhs3.id, subjectId: subject.id });
    const { student } = await fixtures.createStudent(models, school._id, {
      classId: jhs3.id,
      overrides: {
        gender: 'Male', dateOfBirth: '2010-01-01', waecIndexNumber: '4012345002', photoUrl: 'https://cdn.example/p.jpg', hometown: null, region: null,
      },
    });
    await fixtures.createParentWithChild(models, school._id, student.id);

    const res = await getReport(token);
    const candidate = res.body.data.candidates.find((c) => c.studentId === student.id);
    expect(candidate.missing).toContain('Hometown/Region');
    const demographicsCriterion = res.body.data.criteria.find((c) => c.key === 'demographics');
    expect(demographicsCriterion.passCount).toBe(0);
  });

  test('flags a candidate with no linked guardian, and separately one with an invalid guardian phone', async () => {
    const { school, token } = await setup('guardian');
    const jhs3 = await fixtures.createClass(models, school._id, { name: 'JHS 3', gradeLevel: 'JHS 3', levelOrder: 13 });
    const subject = await fixtures.createSubject(models, school._id);
    await fixtures.assignSubjectToClass(models, school._id, { classId: jhs3.id, subjectId: subject.id });

    const { student: noGuardian } = await fixtures.createStudent(models, school._id, {
      classId: jhs3.id,
      overrides: {
        gender: 'Male', dateOfBirth: '2010-01-01', waecIndexNumber: '4012345003', photoUrl: 'https://cdn.example/p.jpg', hometown: 'Tamale', region: 'Northern Region',
      },
    });

    const { student: badPhone } = await fixtures.createStudent(models, school._id, {
      classId: jhs3.id,
      overrides: {
        gender: 'Female', dateOfBirth: '2010-01-01', waecIndexNumber: '4012345004', photoUrl: 'https://cdn.example/p2.jpg', hometown: 'Tamale', region: 'Northern Region',
      },
    });
    const { Guardian, StudentGuardian } = models;
    const guardian = await runWithSchool(school._id, () => Guardian.create({ schoolId: school._id, fullName: 'Bad Phone Guardian', phone: '12345' }));
    await runWithSchool(school._id, () => StudentGuardian.create({ schoolId: school._id, studentId: badPhone.id, guardianId: guardian.id }));

    const res = await getReport(token);
    const noGuardianRow = res.body.data.candidates.find((c) => c.studentId === noGuardian.id);
    const badPhoneRow = res.body.data.candidates.find((c) => c.studentId === badPhone.id);
    expect(noGuardianRow.missing).toContain('Linked Guardian');
    expect(badPhoneRow.missing).toContain('Valid Guardian Phone Number');
  });

  test('flags every candidate in a JHS 3 class with no subjects assigned, and reflects it in the subjects_configured criterion', async () => {
    const { school, token } = await setup('subjects');
    const jhs3 = await fixtures.createClass(models, school._id, { name: 'JHS 3', gradeLevel: 'JHS 3', levelOrder: 13 });
    const { student } = await fixtures.createStudent(models, school._id, {
      classId: jhs3.id,
      overrides: {
        gender: 'Male', dateOfBirth: '2010-01-01', waecIndexNumber: '4012345005', photoUrl: 'https://cdn.example/p.jpg', hometown: 'Ho', region: 'Volta Region',
      },
    });
    await fixtures.createParentWithChild(models, school._id, student.id);

    const res = await getReport(token);
    const candidate = res.body.data.candidates.find((c) => c.studentId === student.id);
    expect(candidate.missing).toContain('Class Has No Subjects Assigned');
    const subjectsCriterion = res.body.data.criteria.find((c) => c.key === 'subjects_configured');
    expect(subjectsCriterion).toEqual({
      key: 'subjects_configured', label: 'Class Has Subjects Assigned', passCount: 0, total: 1,
    });
  });

  test('never leaks another school\'s JHS 3 candidates into this school\'s report', async () => {
    const { school: schoolA, token: tokenA } = await setup('tenant-a');
    const { school: schoolB } = await setup('tenant-b');
    const jhs3A = await fixtures.createClass(models, schoolA._id, { name: 'JHS 3', gradeLevel: 'JHS 3', levelOrder: 13 });
    const jhs3B = await fixtures.createClass(models, schoolB._id, { name: 'JHS 3', gradeLevel: 'JHS 3', levelOrder: 13 });
    await fixtures.createStudent(models, schoolA._id, { classId: jhs3A.id });
    await fixtures.createStudent(models, schoolB._id, { classId: jhs3B.id });

    const res = await getReport(tokenA);
    expect(res.body.data.candidateTotal).toBe(1);
  });
});
