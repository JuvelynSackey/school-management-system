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

const setup = async () => {
  const school = await fixtures.createSchool(models);
  const classRow = await fixtures.createClass(models, school._id, { name: 'Basic 6', section: 'A' });
  const subject = await fixtures.createSubject(models, school._id, { name: 'Mathematics' });
  const term = await fixtures.createTerm(models, school._id);
  const { password } = await fixtures.createAdmin(models, school._id, { email: 'admin@exam-test.local' });
  const token = await fixtures.login(app, school.slug, 'admin@exam-test.local', password);
  return {
    school, classRow, subject, term, token,
  };
};

const validPayload = (o) => ({
  academicTermId: o.term.id, classId: o.classRow.id, subjectId: o.subject.id, examDate: '2026-11-10', startTime: '09:00', endTime: '10:30', room: 'Hall A',
});

describe('Exam Schedule', () => {
  test('an admin creates an exam schedule entry', async () => {
    const ctx = await setup();
    const res = await request(app).post('/api/exam-schedules').set(fixtures.authHeader(ctx.token)).send(validPayload(ctx));
    expect(res.status).toBe(201);
    expect(res.body.data.examDate).toBe('2026-11-10');
    expect(res.body.data.class.name).toBe('Basic 6');
    expect(res.body.data.subject.name).toBe('Mathematics');
  });

  test('rejects a start time that is not before the end time', async () => {
    const ctx = await setup();
    const res = await request(app).post('/api/exam-schedules').set(fixtures.authHeader(ctx.token))
      .send({ ...validPayload(ctx), startTime: '10:30', endTime: '09:00' });
    expect(res.status).toBe(400);
  });

  test('rejects a second exam for the same class/subject/term', async () => {
    const ctx = await setup();
    await request(app).post('/api/exam-schedules').set(fixtures.authHeader(ctx.token)).send(validPayload(ctx));
    const res = await request(app).post('/api/exam-schedules').set(fixtures.authHeader(ctx.token)).send(validPayload(ctx));
    expect(res.status).toBe(400);
  });

  test('404s for an unknown class', async () => {
    const ctx = await setup();
    const res = await request(app).post('/api/exam-schedules').set(fixtures.authHeader(ctx.token))
      .send({ ...validPayload(ctx), classId: new models.mongoose.Types.ObjectId().toString() });
    expect(res.status).toBe(404);
  });

  test('a teacher only sees exam schedules for classes they are assigned to', async () => {
    const ctx = await setup();
    const otherClass = await fixtures.createClass(models, ctx.school._id, { name: 'Basic 5' });
    await request(app).post('/api/exam-schedules').set(fixtures.authHeader(ctx.token)).send(validPayload(ctx));
    await request(app).post('/api/exam-schedules').set(fixtures.authHeader(ctx.token))
      .send({ ...validPayload(ctx), classId: otherClass.id });

    const { teacher, user, password } = await fixtures.createTeacher(models, ctx.school._id);
    await fixtures.assignSubjectToClass(models, ctx.school._id, { classId: ctx.classRow.id, subjectId: ctx.subject.id, academicTermId: ctx.term.id });
    await fixtures.assignTeacherToClass(models, ctx.school._id, { teacherId: teacher.id, subjectId: ctx.subject.id, classId: ctx.classRow.id });
    const teacherToken = await fixtures.login(app, ctx.school.slug, user.email, password);

    const res = await request(app).get('/api/exam-schedules').set(fixtures.authHeader(teacherToken));
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].classId).toBe(ctx.classRow.id);
  });

  test('a student only sees exam schedules for their own class', async () => {
    const ctx = await setup();
    const otherClass = await fixtures.createClass(models, ctx.school._id, { name: 'Basic 5' });
    await request(app).post('/api/exam-schedules').set(fixtures.authHeader(ctx.token)).send(validPayload(ctx));
    await request(app).post('/api/exam-schedules').set(fixtures.authHeader(ctx.token))
      .send({ ...validPayload(ctx), classId: otherClass.id });

    const { user: studentUser, password } = await fixtures.createStudent(models, ctx.school._id, { classId: ctx.classRow.id });
    const studentToken = await fixtures.login(app, ctx.school.slug, studentUser.email, password);

    const res = await request(app).get('/api/exam-schedules').set(fixtures.authHeader(studentToken));
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].classId).toBe(ctx.classRow.id);
  });

  test('a parent sees exam schedules for their linked child\'s class only', async () => {
    const ctx = await setup();
    const otherClass = await fixtures.createClass(models, ctx.school._id, { name: 'Basic 5' });
    await request(app).post('/api/exam-schedules').set(fixtures.authHeader(ctx.token)).send(validPayload(ctx));
    await request(app).post('/api/exam-schedules').set(fixtures.authHeader(ctx.token))
      .send({ ...validPayload(ctx), classId: otherClass.id });

    const { student: child } = await fixtures.createStudent(models, ctx.school._id, { classId: ctx.classRow.id });
    const { user: parentUser, password } = await fixtures.createParentWithChild(models, ctx.school._id, child.id);
    const parentToken = await fixtures.login(app, ctx.school.slug, parentUser.email, password);

    const res = await request(app).get('/api/exam-schedules').set(fixtures.authHeader(parentToken));
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].classId).toBe(ctx.classRow.id);
  });

  test('a teacher cannot create, update, or delete exam schedules', async () => {
    const ctx = await setup();
    const { user, password } = await fixtures.createTeacher(models, ctx.school._id);
    const teacherToken = await fixtures.login(app, ctx.school.slug, user.email, password);

    const res = await request(app).post('/api/exam-schedules').set(fixtures.authHeader(teacherToken)).send(validPayload(ctx));
    expect(res.status).toBe(403);
  });

  test('updates an exam schedule entry', async () => {
    const ctx = await setup();
    const created = await request(app).post('/api/exam-schedules').set(fixtures.authHeader(ctx.token)).send(validPayload(ctx));

    const res = await request(app).put(`/api/exam-schedules/${created.body.data.id}`).set(fixtures.authHeader(ctx.token))
      .send({ room: 'Hall B', startTime: '11:00', endTime: '12:30' });
    expect(res.status).toBe(200);
    expect(res.body.data.room).toBe('Hall B');
    expect(res.body.data.startTime).toBe('11:00');
  });

  test('deletes an exam schedule entry', async () => {
    const ctx = await setup();
    const created = await request(app).post('/api/exam-schedules').set(fixtures.authHeader(ctx.token)).send(validPayload(ctx));

    const del = await request(app).delete(`/api/exam-schedules/${created.body.data.id}`).set(fixtures.authHeader(ctx.token));
    expect(del.status).toBe(200);

    const list = await request(app).get('/api/exam-schedules').set(fixtures.authHeader(ctx.token));
    expect(list.body.data.length).toBe(0);
  });
});
