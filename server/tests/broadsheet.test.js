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

describe('GET /reports/broadsheet-pdf', () => {
  test('returns a PDF for a class/subject/term with results', async () => {
    const school = await fixtures.createSchool(models);
    const classRow = await fixtures.createClass(models, school._id);
    const subject = await fixtures.createSubject(models, school._id);
    const term = await fixtures.createTerm(models, school._id);
    const { student } = await fixtures.createStudent(models, school._id, { classId: classRow.id });
    await createResult(school._id, {
      studentId: student.id, subjectId: subject.id, classId: classRow.id, academicTermId: term.id, classScore: 40, examScore: 40, totalScore: 80, grade: 'A1', subjectPosition: 1,
    });
    const { password } = await fixtures.createAdmin(models, school._id, { email: 'admin@broadsheet-test.local' });
    const token = await fixtures.login(app, school.slug, 'admin@broadsheet-test.local', password);

    const res = await request(app).get('/api/reports/broadsheet-pdf')
      .query({ classId: classRow.id, subjectId: subject.id, academicTermId: term.id })
      .set(fixtures.authHeader(token));

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toBe('application/pdf');
    expect(res.body.length).toBeGreaterThan(0);
  });

  test('still returns a PDF (not an error) when no results exist yet for the selection', async () => {
    const school = await fixtures.createSchool(models);
    const classRow = await fixtures.createClass(models, school._id);
    const subject = await fixtures.createSubject(models, school._id);
    const term = await fixtures.createTerm(models, school._id);
    const { password } = await fixtures.createAdmin(models, school._id, { email: 'admin2@broadsheet-test.local' });
    const token = await fixtures.login(app, school.slug, 'admin2@broadsheet-test.local', password);

    const res = await request(app).get('/api/reports/broadsheet-pdf')
      .query({ classId: classRow.id, subjectId: subject.id, academicTermId: term.id })
      .set(fixtures.authHeader(token));

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toBe('application/pdf');
  });

  test('rejects a request missing a required query param', async () => {
    const school = await fixtures.createSchool(models);
    const classRow = await fixtures.createClass(models, school._id);
    const { password } = await fixtures.createAdmin(models, school._id, { email: 'admin3@broadsheet-test.local' });
    const token = await fixtures.login(app, school.slug, 'admin3@broadsheet-test.local', password);

    const res = await request(app).get('/api/reports/broadsheet-pdf')
      .query({ classId: classRow.id })
      .set(fixtures.authHeader(token));
    expect(res.status).toBe(400);
  });

  test('404s for a class that does not exist', async () => {
    const school = await fixtures.createSchool(models);
    const subject = await fixtures.createSubject(models, school._id);
    const term = await fixtures.createTerm(models, school._id);
    const { password } = await fixtures.createAdmin(models, school._id, { email: 'admin4@broadsheet-test.local' });
    const token = await fixtures.login(app, school.slug, 'admin4@broadsheet-test.local', password);

    const res = await request(app).get('/api/reports/broadsheet-pdf')
      .query({ classId: new models.mongoose.Types.ObjectId().toString(), subjectId: subject.id, academicTermId: term.id })
      .set(fixtures.authHeader(token));
    expect(res.status).toBe(404);
  });

  test('a teacher cannot access it — reports are admin-only', async () => {
    const school = await fixtures.createSchool(models);
    const classRow = await fixtures.createClass(models, school._id);
    const subject = await fixtures.createSubject(models, school._id);
    const term = await fixtures.createTerm(models, school._id);
    const { user, password } = await fixtures.createTeacher(models, school._id);
    const token = await fixtures.login(app, school.slug, user.email, password);

    const res = await request(app).get('/api/reports/broadsheet-pdf')
      .query({ classId: classRow.id, subjectId: subject.id, academicTermId: term.id })
      .set(fixtures.authHeader(token));
    expect(res.status).toBe(403);
  });
});
