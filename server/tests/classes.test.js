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

describe('GET /classes — Ghanaian grade-hierarchy ordering', () => {
  test('returns classes ordered by the grade hierarchy, not alphabetically', async () => {
    const school = await fixtures.createSchool(models);
    // Created deliberately out of pedagogical order.
    await fixtures.createClass(models, school._id, { name: 'JHS 1', gradeLevel: 'JHS 1', levelOrder: 11, stage: 'JHS' });
    await fixtures.createClass(models, school._id, { name: 'Basic 1', gradeLevel: 'Basic 1', levelOrder: 5, stage: 'Primary' });
    await fixtures.createClass(models, school._id, { name: 'KG 2', gradeLevel: 'KG 2', levelOrder: 4, stage: 'KG' });
    const { password } = await fixtures.createAdmin(models, school._id, { email: 'admin@classes-test.local' });
    const token = await fixtures.login(app, school.slug, 'admin@classes-test.local', password);

    const res = await request(app).get('/api/classes').set(fixtures.authHeader(token));
    expect(res.status).toBe(200);
    expect(res.body.data.map((c) => c.name)).toEqual(['KG 2', 'Basic 1', 'JHS 1']);
  });

  test('a class with no gradeLevel sorts after every ranked class', async () => {
    const school = await fixtures.createSchool(models);
    await fixtures.createClass(models, school._id, { name: 'Custom Group', gradeLevel: null, levelOrder: 999 });
    await fixtures.createClass(models, school._id, { name: 'Basic 3', gradeLevel: 'Basic 3', levelOrder: 7, stage: 'Primary' });
    const { password } = await fixtures.createAdmin(models, school._id, { email: 'admin2@classes-test.local' });
    const token = await fixtures.login(app, school.slug, 'admin2@classes-test.local', password);

    const res = await request(app).get('/api/classes').set(fixtures.authHeader(token));
    expect(res.body.data.map((c) => c.name)).toEqual(['Basic 3', 'Custom Group']);
  });
});

describe('POST /classes — gradeLevel derivation', () => {
  test('setting gradeLevel derives and overwrites stage, ignoring a contradictory stage in the same request', async () => {
    const school = await fixtures.createSchool(models);
    const { password } = await fixtures.createAdmin(models, school._id, { email: 'admin3@classes-test.local' });
    const token = await fixtures.login(app, school.slug, 'admin3@classes-test.local', password);

    const res = await request(app).post('/api/classes').set(fixtures.authHeader(token)).send({
      name: 'Basic 4', gradeLevel: 'Basic 4', stage: 'JHS',
    });
    expect(res.status).toBe(201);
    expect(res.body.data.stage).toBe('Primary');
    expect(res.body.data.levelOrder).toBe(8);
  });

  test('omitting gradeLevel leaves stage exactly as sent (backward compatible)', async () => {
    const school = await fixtures.createSchool(models);
    const { password } = await fixtures.createAdmin(models, school._id, { email: 'admin4@classes-test.local' });
    const token = await fixtures.login(app, school.slug, 'admin4@classes-test.local', password);

    const res = await request(app).post('/api/classes').set(fixtures.authHeader(token)).send({
      name: 'Custom Class', stage: 'Primary',
    });
    expect(res.status).toBe(201);
    expect(res.body.data.stage).toBe('Primary');
    expect(res.body.data.gradeLevel).toBeNull();
    expect(res.body.data.levelOrder).toBe(999);
  });

  test('rejects an invalid gradeLevel value', async () => {
    const school = await fixtures.createSchool(models);
    const { password } = await fixtures.createAdmin(models, school._id, { email: 'admin5@classes-test.local' });
    const token = await fixtures.login(app, school.slug, 'admin5@classes-test.local', password);

    const res = await request(app).post('/api/classes').set(fixtures.authHeader(token)).send({
      name: 'Bad Class', gradeLevel: 'Grade 12',
    });
    expect(res.status).toBe(400);
  });
});

describe('PUT /classes/:id — gradeLevel derivation and clearing', () => {
  test('setting gradeLevel on update derives stage and levelOrder', async () => {
    const school = await fixtures.createSchool(models);
    const classRow = await fixtures.createClass(models, school._id, { name: 'To Rank' });
    const { password } = await fixtures.createAdmin(models, school._id, { email: 'admin6@classes-test.local' });
    const token = await fixtures.login(app, school.slug, 'admin6@classes-test.local', password);

    const res = await request(app).put(`/api/classes/${classRow.id}`).set(fixtures.authHeader(token)).send({
      name: 'To Rank', gradeLevel: 'JHS 2',
    });
    expect(res.status).toBe(200);
    expect(res.body.data.stage).toBe('JHS');
    expect(res.body.data.levelOrder).toBe(12);
  });

  test('clearing gradeLevel resets levelOrder to the sentinel and leaves stage untouched', async () => {
    const school = await fixtures.createSchool(models);
    const classRow = await fixtures.createClass(models, school._id, {
      name: 'Basic 1', gradeLevel: 'Basic 1', levelOrder: 5, stage: 'Primary',
    });
    const { password } = await fixtures.createAdmin(models, school._id, { email: 'admin7@classes-test.local' });
    const token = await fixtures.login(app, school.slug, 'admin7@classes-test.local', password);

    const res = await request(app).put(`/api/classes/${classRow.id}`).set(fixtures.authHeader(token)).send({
      name: 'Basic 1', gradeLevel: '',
    });
    expect(res.status).toBe(200);
    expect(res.body.data.gradeLevel).toBeNull();
    expect(res.body.data.levelOrder).toBe(999);
    expect(res.body.data.stage).toBe('Primary');
  });

  test('not sending gradeLevel at all leaves the existing gradeLevel/levelOrder untouched', async () => {
    const school = await fixtures.createSchool(models);
    const classRow = await fixtures.createClass(models, school._id, {
      name: 'Basic 2', gradeLevel: 'Basic 2', levelOrder: 6, stage: 'Primary',
    });
    const { password } = await fixtures.createAdmin(models, school._id, { email: 'admin8@classes-test.local' });
    const token = await fixtures.login(app, school.slug, 'admin8@classes-test.local', password);

    const res = await request(app).put(`/api/classes/${classRow.id}`).set(fixtures.authHeader(token)).send({
      name: 'Basic 2', room: 'Room 5',
    });
    expect(res.status).toBe(200);
    expect(res.body.data.gradeLevel).toBe('Basic 2');
    expect(res.body.data.levelOrder).toBe(6);
    expect(res.body.data.room).toBe('Room 5');
  });
});

describe('tenant isolation', () => {
  test('a school\'s class ordering is unaffected by another school\'s classes', async () => {
    const otherSchool = await fixtures.createSchool(models);
    await fixtures.createClass(models, otherSchool._id, { name: 'Creche', gradeLevel: 'Creche', levelOrder: 0, stage: 'Creche' });

    const school = await fixtures.createSchool(models);
    await fixtures.createClass(models, school._id, { name: 'Basic 6', gradeLevel: 'Basic 6', levelOrder: 10, stage: 'Primary' });
    const { password } = await fixtures.createAdmin(models, school._id, { email: 'admin9@classes-test.local' });
    const token = await fixtures.login(app, school.slug, 'admin9@classes-test.local', password);

    const res = await request(app).get('/api/classes').set(fixtures.authHeader(token));
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].name).toBe('Basic 6');
  });
});

describe('showPositions — qualitative-assessment classes can suppress ranking', () => {
  test('defaults to true when omitted on create', async () => {
    const school = await fixtures.createSchool(models);
    const { password } = await fixtures.createAdmin(models, school._id, { email: 'admin11@classes-test.local' });
    const token = await fixtures.login(app, school.slug, 'admin11@classes-test.local', password);

    const res = await request(app).post('/api/classes').set(fixtures.authHeader(token)).send({ name: 'Basic 5' });
    expect(res.status).toBe(201);
    expect(res.body.data.showPositions).toBe(true);
  });

  test('can be set to false on create (e.g. a KG class)', async () => {
    const school = await fixtures.createSchool(models);
    const { password } = await fixtures.createAdmin(models, school._id, { email: 'admin12@classes-test.local' });
    const token = await fixtures.login(app, school.slug, 'admin12@classes-test.local', password);

    const res = await request(app).post('/api/classes').set(fixtures.authHeader(token)).send({
      name: 'KG 1', gradeLevel: 'KG 1', showPositions: false,
    });
    expect(res.status).toBe(201);
    expect(res.body.data.showPositions).toBe(false);
  });

  test('PUT /classes/:id can toggle showPositions; omitting it leaves the existing value untouched', async () => {
    const school = await fixtures.createSchool(models);
    const classRow = await fixtures.createClass(models, school._id, { name: 'Nursery 1', showPositions: true });
    const { password } = await fixtures.createAdmin(models, school._id, { email: 'admin13@classes-test.local' });
    const token = await fixtures.login(app, school.slug, 'admin13@classes-test.local', password);

    const toggled = await request(app).put(`/api/classes/${classRow.id}`).set(fixtures.authHeader(token)).send({ name: 'Nursery 1', showPositions: false });
    expect(toggled.status).toBe(200);
    expect(toggled.body.data.showPositions).toBe(false);

    const untouched = await request(app).put(`/api/classes/${classRow.id}`).set(fixtures.authHeader(token)).send({ name: 'Nursery 1', room: 'Room 2' });
    expect(untouched.status).toBe(200);
    expect(untouched.body.data.showPositions).toBe(false);
  });
});

describe('GET /classes/:id/my-access — Class Teacher vs Subject Specialist scoping', () => {
  test('the homeroom teacher gets isHomeroom: true, regardless of subject assignments', async () => {
    const school = await fixtures.createSchool(models);
    const { teacher, user, password } = await fixtures.createTeacher(models, school._id);
    const classRow = await fixtures.createClass(models, school._id, { classTeacherId: teacher.id });
    const token = await fixtures.login(app, school.slug, user.email, password);

    const res = await request(app).get(`/api/classes/${classRow.id}/my-access`).set(fixtures.authHeader(token));
    expect(res.status).toBe(200);
    expect(res.body.data.isHomeroom).toBe(true);
  });

  test('a subject-only teacher gets isHomeroom: false and just their own assigned subjectIds', async () => {
    const school = await fixtures.createSchool(models);
    const classRow = await fixtures.createClass(models, school._id);
    const subjectA = await fixtures.createSubject(models, school._id);
    const subjectB = await fixtures.createSubject(models, school._id);
    const { teacher, user, password } = await fixtures.createTeacher(models, school._id);
    await fixtures.assignTeacherToClass(models, school._id, { teacherId: teacher.id, subjectId: subjectA.id, classId: classRow.id });
    const token = await fixtures.login(app, school.slug, user.email, password);

    const res = await request(app).get(`/api/classes/${classRow.id}/my-access`).set(fixtures.authHeader(token));
    expect(res.status).toBe(200);
    expect(res.body.data.isHomeroom).toBe(false);
    expect(res.body.data.subjectIds).toEqual([subjectA.id]);
    expect(res.body.data.subjectIds).not.toContain(subjectB.id);
  });

  test('an admin gets isHomeroom: true implicitly', async () => {
    const school = await fixtures.createSchool(models);
    const classRow = await fixtures.createClass(models, school._id);
    const { password } = await fixtures.createAdmin(models, school._id, { email: 'admin10@classes-test.local' });
    const token = await fixtures.login(app, school.slug, 'admin10@classes-test.local', password);

    const res = await request(app).get(`/api/classes/${classRow.id}/my-access`).set(fixtures.authHeader(token));
    expect(res.status).toBe(200);
    expect(res.body.data.isHomeroom).toBe(true);
  });
});
