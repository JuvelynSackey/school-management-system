const request = require('supertest');
const fs = require('fs');
const path = require('path');
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

// A minimal, genuinely valid 1x1 transparent PNG — small enough to keep in
// the test file, real enough that multer's mimetype sniffing accepts it.
const TINY_PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64');

describe('Student photo upload', () => {
  test('an admin can upload a photo, and it is served back as a working absolute URL', async () => {
    const school = await fixtures.createSchool(models);
    const classRow = await fixtures.createClass(models, school._id);
    const { student } = await fixtures.createStudent(models, school._id, { classId: classRow.id });
    const { password } = await fixtures.createAdmin(models, school._id, { email: 'admin@photo-test.local' });
    const token = await fixtures.login(app, school.slug, 'admin@photo-test.local', password);

    const res = await request(app)
      .post(`/api/students/${student.id}/photo`)
      .set(fixtures.authHeader(token))
      .attach('photo', TINY_PNG, 'headshot.png');

    expect(res.status).toBe(200);
    expect(res.body.data.photoUrl).toMatch(/\/uploads\/student-photos\/.+\.png$/);

    const filename = res.body.data.photoUrl.split('/uploads/student-photos/')[1];
    const onDisk = path.join(__dirname, '../uploads/student-photos', filename);
    expect(fs.existsSync(onDisk)).toBe(true);
    fs.unlinkSync(onDisk); // test cleanup — this file is outside Mongo, clearTestDb() doesn't touch it
  });

  test('rejects a non-image file', async () => {
    const school = await fixtures.createSchool(models);
    const classRow = await fixtures.createClass(models, school._id);
    const { student } = await fixtures.createStudent(models, school._id, { classId: classRow.id });
    const { password } = await fixtures.createAdmin(models, school._id, { email: 'admin2@photo-test.local' });
    const token = await fixtures.login(app, school.slug, 'admin2@photo-test.local', password);

    const res = await request(app)
      .post(`/api/students/${student.id}/photo`)
      .set(fixtures.authHeader(token))
      .attach('photo', Buffer.from('not an image'), 'notes.txt');

    expect(res.status).toBe(400);
  });

  test('re-uploading deletes the previous photo file rather than leaving it orphaned', async () => {
    const school = await fixtures.createSchool(models);
    const classRow = await fixtures.createClass(models, school._id);
    const { student } = await fixtures.createStudent(models, school._id, { classId: classRow.id });
    const { password } = await fixtures.createAdmin(models, school._id, { email: 'admin3@photo-test.local' });
    const token = await fixtures.login(app, school.slug, 'admin3@photo-test.local', password);

    const first = await request(app).post(`/api/students/${student.id}/photo`).set(fixtures.authHeader(token)).attach('photo', TINY_PNG, 'a.png');
    const firstFilename = first.body.data.photoUrl.split('/uploads/student-photos/')[1];
    const firstPath = path.join(__dirname, '../uploads/student-photos', firstFilename);
    expect(fs.existsSync(firstPath)).toBe(true);

    const second = await request(app).post(`/api/students/${student.id}/photo`).set(fixtures.authHeader(token)).attach('photo', TINY_PNG, 'b.png');
    const secondFilename = second.body.data.photoUrl.split('/uploads/student-photos/')[1];
    const secondPath = path.join(__dirname, '../uploads/student-photos', secondFilename);

    expect(fs.existsSync(firstPath)).toBe(false); // deleted on re-upload
    expect(fs.existsSync(secondPath)).toBe(true);
    fs.unlinkSync(secondPath);
  });

  test('a student from another school (or a nonexistent one) returns 404, not another tenant\'s data', async () => {
    const schoolA = await fixtures.createSchool(models);
    const schoolB = await fixtures.createSchool(models);
    const classB = await fixtures.createClass(models, schoolB._id);
    const { student: studentInB } = await fixtures.createStudent(models, schoolB._id, { classId: classB.id });
    const { password } = await fixtures.createAdmin(models, schoolA._id, { email: 'admin4@photo-test.local' });
    const token = await fixtures.login(app, schoolA.slug, 'admin4@photo-test.local', password);

    const res = await request(app).post(`/api/students/${studentInB.id}/photo`).set(fixtures.authHeader(token)).attach('photo', TINY_PNG, 'a.png');
    expect(res.status).toBe(404);
  });

  test('a teacher cannot upload a student photo', async () => {
    const school = await fixtures.createSchool(models);
    const classRow = await fixtures.createClass(models, school._id);
    const { student } = await fixtures.createStudent(models, school._id, { classId: classRow.id });
    const { user: teacherUser, password } = await fixtures.createTeacher(models, school._id);
    const token = await fixtures.login(app, school.slug, teacherUser.email, password);

    const res = await request(app).post(`/api/students/${student.id}/photo`).set(fixtures.authHeader(token)).attach('photo', TINY_PNG, 'a.png');
    expect(res.status).toBe(403);
  });
});

describe('WAEC/BECE index number', () => {
  test('an admin can set a student\'s index number via the normal update endpoint', async () => {
    const school = await fixtures.createSchool(models);
    const classRow = await fixtures.createClass(models, school._id);
    const { student } = await fixtures.createStudent(models, school._id, { classId: classRow.id });
    const { password } = await fixtures.createAdmin(models, school._id, { email: 'admin5@photo-test.local' });
    const token = await fixtures.login(app, school.slug, 'admin5@photo-test.local', password);

    const res = await request(app).put(`/api/students/${student.id}`).set(fixtures.authHeader(token)).send({ waecIndexNumber: '4012345678' });
    expect(res.status).toBe(200);
    expect(res.body.data.waecIndexNumber).toBe('4012345678');
  });

  test('two students cannot share the same index number, within the same school', async () => {
    const school = await fixtures.createSchool(models);
    const classRow = await fixtures.createClass(models, school._id);
    const { student: studentA } = await fixtures.createStudent(models, school._id, { classId: classRow.id });
    const { student: studentB } = await fixtures.createStudent(models, school._id, { classId: classRow.id });
    const { password } = await fixtures.createAdmin(models, school._id, { email: 'admin6@photo-test.local' });
    const token = await fixtures.login(app, school.slug, 'admin6@photo-test.local', password);

    await request(app).put(`/api/students/${studentA.id}`).set(fixtures.authHeader(token)).send({ waecIndexNumber: '4099999999' });
    const res = await request(app).put(`/api/students/${studentB.id}`).set(fixtures.authHeader(token)).send({ waecIndexNumber: '4099999999' });
    expect(res.status).toBe(400);
  });

  test('the same index number is allowed again in a DIFFERENT school', async () => {
    const schoolA = await fixtures.createSchool(models);
    const schoolB = await fixtures.createSchool(models);
    const classA = await fixtures.createClass(models, schoolA._id);
    const classB = await fixtures.createClass(models, schoolB._id);
    const { student: studentA } = await fixtures.createStudent(models, schoolA._id, { classId: classA.id });
    const { student: studentB } = await fixtures.createStudent(models, schoolB._id, { classId: classB.id });
    const { password: passwordA } = await fixtures.createAdmin(models, schoolA._id, { email: 'admin7@photo-test.local' });
    const { password: passwordB } = await fixtures.createAdmin(models, schoolB._id, { email: 'admin8@photo-test.local' });
    const tokenA = await fixtures.login(app, schoolA.slug, 'admin7@photo-test.local', passwordA);
    const tokenB = await fixtures.login(app, schoolB.slug, 'admin8@photo-test.local', passwordB);

    const resA = await request(app).put(`/api/students/${studentA.id}`).set(fixtures.authHeader(tokenA)).send({ waecIndexNumber: '4055555555' });
    const resB = await request(app).put(`/api/students/${studentB.id}`).set(fixtures.authHeader(tokenB)).send({ waecIndexNumber: '4055555555' });
    expect(resA.status).toBe(200);
    expect(resB.status).toBe(200);
  });
});
