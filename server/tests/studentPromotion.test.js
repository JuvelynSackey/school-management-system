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

const setup = async () => {
  const school = await fixtures.createSchool(models);
  const sourceClass = await fixtures.createClass(models, school._id, { name: 'Basic 5', section: 'A' });
  const destinationClass = await fixtures.createClass(models, school._id, { name: 'Basic 6', section: 'A' });
  const { password } = await fixtures.createAdmin(models, school._id, { email: 'admin@promo-test.local' });
  const token = await fixtures.login(app, school.slug, 'admin@promo-test.local', password);
  return {
    school, sourceClass, destinationClass, token,
  };
};

describe('POST /students/promote', () => {
  test('promotes, keeps a repeater, and graduates within one batch, applying each correctly', async () => {
    const {
      school, sourceClass, destinationClass, token,
    } = await setup();
    const { student: promoted } = await fixtures.createStudent(models, school._id, { classId: sourceClass.id });
    const { student: repeater } = await fixtures.createStudent(models, school._id, { classId: sourceClass.id });
    const { student: graduate, user: graduateUser } = await fixtures.createStudent(models, school._id, { classId: sourceClass.id });

    const res = await request(app).post('/api/students/promote').set(fixtures.authHeader(token)).send({
      sourceClassId: sourceClass.id,
      destinationClassId: destinationClass.id,
      promotions: [
        { studentId: promoted.id, action: 'promote' },
        { studentId: repeater.id, action: 'repeat' },
        { studentId: graduate.id, action: 'graduate' },
      ],
    });

    expect(res.status).toBe(200);
    expect(res.body.data.applied).toEqual({ promote: 1, repeat: 1, graduate: 1 });
    expect(res.body.data.skipped).toEqual([]);

    const { Student, User } = models;
    const promotedDoc = await runWithSchool(school._id, async () => Student.findById(promoted.id));
    expect(promotedDoc.classId.toString()).toBe(destinationClass.id);
    expect(promotedDoc.status).toBe('active');

    const repeaterDoc = await runWithSchool(school._id, async () => Student.findById(repeater.id));
    expect(repeaterDoc.classId.toString()).toBe(sourceClass.id);
    expect(repeaterDoc.status).toBe('active');

    const graduateDoc = await runWithSchool(school._id, async () => Student.findById(graduate.id));
    expect(graduateDoc.status).toBe('graduated');

    const graduateUserDoc = await runWithSchool(school._id, async () => User.findById(graduateUser.id));
    expect(graduateUserDoc.status).toBe('inactive');
  });

  test('never touches historical Result or Attendance documents\' own classId/academicTermId', async () => {
    const {
      school, sourceClass, destinationClass, token,
    } = await setup();
    const subject = await fixtures.createSubject(models, school._id);
    const term = await fixtures.createTerm(models, school._id);
    const { student } = await fixtures.createStudent(models, school._id, { classId: sourceClass.id });

    const { Result, Attendance } = models;
    const result = await runWithSchool(school._id, async () => Result.create({
      schoolId: school._id, studentId: student.id, subjectId: subject.id, classId: sourceClass.id, academicTermId: term.id, classScore: 40, examScore: 40, totalScore: 80,
    }));
    const attendance = await runWithSchool(school._id, async () => Attendance.create({
      schoolId: school._id, studentId: student.id, classId: sourceClass.id, academicTermId: term.id, status: 'Present', attendanceDate: new Date(2025, 0, 1),
    }));

    await request(app).post('/api/students/promote').set(fixtures.authHeader(token)).send({
      sourceClassId: sourceClass.id,
      destinationClassId: destinationClass.id,
      promotions: [{ studentId: student.id, action: 'promote' }],
    });

    const resultAfter = await runWithSchool(school._id, async () => Result.findById(result.id));
    const attendanceAfter = await runWithSchool(school._id, async () => Attendance.findById(attendance.id));
    expect(resultAfter.classId.toString()).toBe(sourceClass.id);
    expect(attendanceAfter.classId.toString()).toBe(sourceClass.id);
  });

  test('skips (does not error on) a student who is not actually in sourceClassId', async () => {
    const {
      school, sourceClass, destinationClass, token,
    } = await setup();
    const otherClass = await fixtures.createClass(models, school._id, { name: 'Basic 4' });
    const { student } = await fixtures.createStudent(models, school._id, { classId: otherClass.id });

    const res = await request(app).post('/api/students/promote').set(fixtures.authHeader(token)).send({
      sourceClassId: sourceClass.id,
      destinationClassId: destinationClass.id,
      promotions: [{ studentId: student.id, action: 'promote' }],
    });

    expect(res.status).toBe(200);
    expect(res.body.data.applied).toEqual({ promote: 0, repeat: 0, graduate: 0 });
    expect(res.body.data.skipped).toEqual([student.id]);

    const { Student } = models;
    const unchanged = await runWithSchool(school._id, async () => Student.findById(student.id));
    expect(unchanged.classId.toString()).toBe(otherClass.id);
  });

  test('skips a student who is not currently active (e.g. already archived)', async () => {
    const { school, sourceClass, token } = await setup();
    const { student } = await fixtures.createStudent(models, school._id, { classId: sourceClass.id, overrides: { status: 'archived' } });

    const res = await request(app).post('/api/students/promote').set(fixtures.authHeader(token)).send({
      sourceClassId: sourceClass.id,
      promotions: [{ studentId: student.id, action: 'repeat' }],
    });

    expect(res.status).toBe(200);
    expect(res.body.data.skipped).toEqual([student.id]);
  });

  test('rejects when a "promote" action is present but destinationClassId is missing', async () => {
    const { school, sourceClass, token } = await setup();
    const { student } = await fixtures.createStudent(models, school._id, { classId: sourceClass.id });

    const res = await request(app).post('/api/students/promote').set(fixtures.authHeader(token)).send({
      sourceClassId: sourceClass.id,
      promotions: [{ studentId: student.id, action: 'promote' }],
    });
    expect(res.status).toBe(400);
  });

  test('a batch of only "repeat" actions does not require destinationClassId', async () => {
    const { school, sourceClass, token } = await setup();
    const { student } = await fixtures.createStudent(models, school._id, { classId: sourceClass.id });

    const res = await request(app).post('/api/students/promote').set(fixtures.authHeader(token)).send({
      sourceClassId: sourceClass.id,
      promotions: [{ studentId: student.id, action: 'repeat' }],
    });
    expect(res.status).toBe(200);
    expect(res.body.data.applied.repeat).toBe(1);
  });

  test('404s for an unknown sourceClassId', async () => {
    const { school, token } = await setup();
    const { student } = await fixtures.createStudent(models, school._id);

    const res = await request(app).post('/api/students/promote').set(fixtures.authHeader(token)).send({
      sourceClassId: new models.mongoose.Types.ObjectId().toString(),
      promotions: [{ studentId: student.id, action: 'repeat' }],
    });
    expect(res.status).toBe(404);
  });

  test('a teacher cannot promote students — admin only', async () => {
    const { school, sourceClass } = await setup();
    const { student } = await fixtures.createStudent(models, school._id, { classId: sourceClass.id });
    const { user, password } = await fixtures.createTeacher(models, school._id);
    const token = await fixtures.login(app, school.slug, user.email, password);

    const res = await request(app).post('/api/students/promote').set(fixtures.authHeader(token)).send({
      sourceClassId: sourceClass.id,
      promotions: [{ studentId: student.id, action: 'repeat' }],
    });
    expect(res.status).toBe(403);
  });

  test('records a single audit log entry summarizing the batch', async () => {
    const {
      school, sourceClass, destinationClass, token,
    } = await setup();
    const { student } = await fixtures.createStudent(models, school._id, { classId: sourceClass.id });

    await request(app).post('/api/students/promote').set(fixtures.authHeader(token)).send({
      sourceClassId: sourceClass.id,
      destinationClassId: destinationClass.id,
      promotions: [{ studentId: student.id, action: 'promote' }],
    });

    const { AuditLog } = models;
    const logs = await runWithSchool(school._id, async () => AuditLog.find({ action: 'student.promote' }));
    expect(logs.length).toBe(1);
    expect(logs[0].description).toContain('Basic 5');
    expect(logs[0].description).toContain('Basic 6');
  });
});
