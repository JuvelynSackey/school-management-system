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

const createFee = async (schoolId, fields) => {
  const { Fee } = models;
  return runWithSchool(schoolId, () => Fee.create({ schoolId, ...fields }));
};

const createPayment = async (schoolId, fields) => {
  const { Payment } = models;
  return runWithSchool(schoolId, () => Payment.create({ schoolId, ...fields }));
};

const createAttendance = async (schoolId, fields) => {
  const { Attendance } = models;
  return runWithSchool(schoolId, () => Attendance.create({ schoolId, ...fields }));
};

describe('GET /reports/finance-summary', () => {
  test('aggregates assigned/collected/outstanding, by category, by class, and by payment method', async () => {
    const school = await fixtures.createSchool(models);
    const classRow = await fixtures.createClass(models, school._id);
    const term = await fixtures.createTerm(models, school._id);
    const { student } = await fixtures.createStudent(models, school._id, { classId: classRow.id });

    const tuitionFee = await createFee(school._id, {
      studentId: student.id, academicTermId: term.id, feeType: 'Term 1 Tuition', category: 'Tuition', amountDue: 500,
    });
    await createFee(school._id, {
      studentId: student.id, academicTermId: term.id, feeType: 'Feeding', category: 'Feeding', amountDue: 100,
    });
    await createPayment(school._id, {
      feeId: tuitionFee.id, amountPaid: 300, paymentDate: '2026-01-10', paymentMethod: 'Mobile Money',
    });

    const { password } = await fixtures.createAdmin(models, school._id, { email: 'admin@finance-test.local' });
    const token = await fixtures.login(app, school.slug, 'admin@finance-test.local', password);

    const res = await request(app).get('/api/reports/finance-summary')
      .query({ academicTermId: term.id })
      .set(fixtures.authHeader(token));

    expect(res.status).toBe(200);
    expect(res.body.data.totalAssigned).toBe(600);
    expect(res.body.data.totalCollected).toBe(300);
    expect(res.body.data.totalOutstanding).toBe(300);
    expect(res.body.data.byCategory).toEqual(expect.arrayContaining([
      { category: 'Tuition', assigned: 500, collected: 300 },
      { category: 'Feeding', assigned: 100, collected: 0 },
    ]));
    expect(res.body.data.byClass[0].arrears).toBe(300);
    expect(res.body.data.byMethod).toEqual([{ method: 'Mobile Money', total: 300, count: 1 }]);
  });

  test('returns a CSV export with Section/Label columns', async () => {
    const school = await fixtures.createSchool(models);
    const { password } = await fixtures.createAdmin(models, school._id, { email: 'admin2@finance-test.local' });
    const token = await fixtures.login(app, school.slug, 'admin2@finance-test.local', password);

    const res = await request(app).get('/api/reports/finance-summary')
      .query({ format: 'csv' })
      .set(fixtures.authHeader(token));

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/csv');
    expect(res.text).toContain('Section,Label,Assigned,Collected,Balance / Total,Count');
    expect(res.text).toContain('Overview,Total Assigned');
  });
});

describe('GET /reports/finance-summary-pdf', () => {
  test('returns a PDF', async () => {
    const school = await fixtures.createSchool(models);
    const { password } = await fixtures.createAdmin(models, school._id, { email: 'admin3@finance-test.local' });
    const token = await fixtures.login(app, school.slug, 'admin3@finance-test.local', password);

    const res = await request(app).get('/api/reports/finance-summary-pdf').set(fixtures.authHeader(token));

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toBe('application/pdf');
    expect(res.body.length).toBeGreaterThan(0);
  });
});

describe('GET /reports/attendance-summary', () => {
  test('computes overall %, monthly trend, and flags students below 75% attendance', async () => {
    const school = await fixtures.createSchool(models);
    const classRow = await fixtures.createClass(models, school._id);
    const term = await fixtures.createTerm(models, school._id);
    const { student: chronic } = await fixtures.createStudent(models, school._id, { classId: classRow.id });
    const { student: fine } = await fixtures.createStudent(models, school._id, { classId: classRow.id });

    // Chronic: 1 present out of 5 recorded days (20%) — below the 75% threshold, above the 5-record minimum.
    const chronicDates = ['2026-01-05', '2026-01-06', '2026-01-07', '2026-01-08', '2026-01-09'];
    await Promise.all(chronicDates.map((d, i) => createAttendance(school._id, {
      studentId: chronic.id, classId: classRow.id, academicTermId: term.id, attendanceDate: d, status: i === 0 ? 'Present' : 'Absent',
    })));

    // Fine: 5 present out of 5 (100%).
    const fineDates = ['2026-01-05', '2026-01-06', '2026-01-07', '2026-01-08', '2026-01-09'];
    await Promise.all(fineDates.map((d) => createAttendance(school._id, {
      studentId: fine.id, classId: classRow.id, academicTermId: term.id, attendanceDate: d, status: 'Present',
    })));

    const { password } = await fixtures.createAdmin(models, school._id, { email: 'admin@attendance-test.local' });
    const token = await fixtures.login(app, school.slug, 'admin@attendance-test.local', password);

    const res = await request(app).get('/api/reports/attendance-summary')
      .query({ classId: classRow.id, academicTermId: term.id })
      .set(fixtures.authHeader(token));

    expect(res.status).toBe(200);
    expect(res.body.data.totalRecords).toBe(10);
    expect(res.body.data.overallPercent).toBe(60);
    expect(res.body.data.monthlyTrend).toEqual([{ month: '2026-01', present: 6, total: 10, percent: 60 }]);
    expect(res.body.data.chronicAbsentees).toHaveLength(1);
    expect(res.body.data.chronicAbsentees[0].studentId).toBe(chronic.id);
    expect(res.body.data.chronicAbsentees[0].percent).toBe(20);
  });

  test('does not flag a student with fewer than 5 recorded days, even at 0%', async () => {
    const school = await fixtures.createSchool(models);
    const classRow = await fixtures.createClass(models, school._id);
    const term = await fixtures.createTerm(models, school._id);
    const { student } = await fixtures.createStudent(models, school._id, { classId: classRow.id });

    await createAttendance(school._id, {
      studentId: student.id, classId: classRow.id, academicTermId: term.id, attendanceDate: '2026-01-05', status: 'Absent',
    });

    const { password } = await fixtures.createAdmin(models, school._id, { email: 'admin2@attendance-test.local' });
    const token = await fixtures.login(app, school.slug, 'admin2@attendance-test.local', password);

    const res = await request(app).get('/api/reports/attendance-summary')
      .query({ classId: classRow.id, academicTermId: term.id })
      .set(fixtures.authHeader(token));

    expect(res.body.data.chronicAbsentees).toHaveLength(0);
  });
});

describe('GET /reports/attendance-summary-pdf', () => {
  test('returns a PDF', async () => {
    const school = await fixtures.createSchool(models);
    const { password } = await fixtures.createAdmin(models, school._id, { email: 'admin3@attendance-test.local' });
    const token = await fixtures.login(app, school.slug, 'admin3@attendance-test.local', password);

    const res = await request(app).get('/api/reports/attendance-summary-pdf').set(fixtures.authHeader(token));

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toBe('application/pdf');
    expect(res.body.length).toBeGreaterThan(0);
  });
});
