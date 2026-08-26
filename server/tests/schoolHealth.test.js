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

describe('GET /intelligence/health-score', () => {
  test('computes a weighted score from all four components when every one has data', async () => {
    const school = await fixtures.createSchool(models);
    const classRow = await fixtures.createClass(models, school._id);
    const subject = await fixtures.createSubject(models, school._id);
    const term = await fixtures.createTerm(models, school._id);
    const { student } = await fixtures.createStudent(models, school._id, { classId: classRow.id });

    const { Result, Fee, Payment, TerminalReport, Attendance } = models;
    await runWithSchool(school._id, () => Result.create({
      schoolId: school._id, studentId: student.id, subjectId: subject.id, classId: classRow.id, academicTermId: term.id, classScore: 40, examScore: 40,
    }));
    // Academic average: 80/100 = 80%.

    await runWithSchool(school._id, () => Attendance.create({
      schoolId: school._id, studentId: student.id, classId: classRow.id, academicTermId: term.id, attendanceDate: '2026-01-05', status: 'Present',
    }));
    // Attendance: 1/1 = 100%.

    const fee = await runWithSchool(school._id, () => Fee.create({
      schoolId: school._id, studentId: student.id, academicTermId: term.id, feeType: 'Tuition', category: 'Tuition', amountDue: 100,
    }));
    await runWithSchool(school._id, () => Payment.create({
      schoolId: school._id, feeId: fee.id, amountPaid: 50, paymentDate: '2026-01-05', paymentMethod: 'Cash',
    }));
    // Fee collection: 50/100 = 50%.

    await runWithSchool(school._id, () => TerminalReport.create({
      schoolId: school._id, studentId: student.id, classId: classRow.id, academicTermId: term.id, status: 'Locked',
    }));
    // Report approval: 1/1 = 100%.

    const { password } = await fixtures.createAdmin(models, school._id, { email: 'admin@health-test.local' });
    const token = await fixtures.login(app, school.slug, 'admin@health-test.local', password);

    const res = await request(app).get('/api/intelligence/health-score').query({ academicTermId: term.id }).set(fixtures.authHeader(token));

    expect(res.status).toBe(200);
    expect(res.body.data.components).toEqual({
      academic: 80, attendance: 100, feeCollection: 50, reportApproval: 100,
    });
    // 0.4*80 + 0.3*100 + 0.15*50 + 0.15*100 = 32 + 30 + 7.5 + 15 = 84.5
    expect(res.body.data.score).toBe(84.5);
  });

  test('redistributes weight among available components when one has no data yet', async () => {
    const school = await fixtures.createSchool(models);
    const classRow = await fixtures.createClass(models, school._id);
    const subject = await fixtures.createSubject(models, school._id);
    const term = await fixtures.createTerm(models, school._id);
    const { student } = await fixtures.createStudent(models, school._id, { classId: classRow.id });

    const { Result, Attendance } = models;
    await runWithSchool(school._id, () => Result.create({
      schoolId: school._id, studentId: student.id, subjectId: subject.id, classId: classRow.id, academicTermId: term.id, classScore: 40, examScore: 40,
    }));
    await runWithSchool(school._id, () => Attendance.create({
      schoolId: school._id, studentId: student.id, classId: classRow.id, academicTermId: term.id, attendanceDate: '2026-01-05', status: 'Present',
    }));
    // No fees, no terminal reports recorded at all this term.

    const { password } = await fixtures.createAdmin(models, school._id, { email: 'admin2@health-test.local' });
    const token = await fixtures.login(app, school.slug, 'admin2@health-test.local', password);

    const res = await request(app).get('/api/intelligence/health-score').query({ academicTermId: term.id }).set(fixtures.authHeader(token));

    expect(res.status).toBe(200);
    expect(res.body.data.components.feeCollection).toBeNull();
    expect(res.body.data.components.reportApproval).toBeNull();
    // Only academic (80) and attendance (100) count, reweighted 0.4:0.3 -> 4/7:3/7.
    // (0.4*80 + 0.3*100) / 0.7 = (32+30)/0.7 = 88.57...
    expect(res.body.data.score).toBeCloseTo(88.6, 1);
  });

  test('a school with nothing recorded at all gets score: null, not 0', async () => {
    const school = await fixtures.createSchool(models);
    const term = await fixtures.createTerm(models, school._id);
    const { password } = await fixtures.createAdmin(models, school._id, { email: 'admin3@health-test.local' });
    const token = await fixtures.login(app, school.slug, 'admin3@health-test.local', password);

    const res = await request(app).get('/api/intelligence/health-score').query({ academicTermId: term.id }).set(fixtures.authHeader(token));
    expect(res.status).toBe(200);
    expect(res.body.data.score).toBeNull();
  });

  test('is tenant-isolated — another school\'s results never affect this one\'s academic component', async () => {
    const otherSchool = await fixtures.createSchool(models);
    const otherClass = await fixtures.createClass(models, otherSchool._id);
    const otherSubject = await fixtures.createSubject(models, otherSchool._id);
    const otherTerm = await fixtures.createTerm(models, otherSchool._id);
    const { student: otherStudent } = await fixtures.createStudent(models, otherSchool._id, { classId: otherClass.id });
    const { Result } = models;
    await runWithSchool(otherSchool._id, () => Result.create({
      schoolId: otherSchool._id, studentId: otherStudent.id, subjectId: otherSubject.id, classId: otherClass.id, academicTermId: otherTerm.id, classScore: 50, examScore: 50,
    }));

    const school = await fixtures.createSchool(models);
    const term = await fixtures.createTerm(models, school._id);
    const { password } = await fixtures.createAdmin(models, school._id, { email: 'admin4@health-test.local' });
    const token = await fixtures.login(app, school.slug, 'admin4@health-test.local', password);

    const res = await request(app).get('/api/intelligence/health-score').query({ academicTermId: term.id }).set(fixtures.authHeader(token));
    expect(res.body.data.score).toBeNull();
    expect(res.body.data.components.academic).toBeNull();
  });
});
