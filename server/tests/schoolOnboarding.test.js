const { startTestServer, stopTestServer, clearTestDb } = require('./testServer');
const { runWithSchool } = require('../src/middleware/tenantContext');
const { seedSchoolDefaults } = require('../src/services/schoolOnboarding.service');

let models;
let fixtures;

beforeAll(async () => {
  await startTestServer();
  // eslint-disable-next-line global-require
  models = require('../src/models');
  // eslint-disable-next-line global-require
  fixtures = require('./fixtures');
});
afterAll(stopTestServer);
afterEach(clearTestDb);

const linkedSubjectNames = async (schoolId, className) => {
  const { Class, ClassSubject, Subject } = models;
  const classRow = await runWithSchool(schoolId, async () => Class.findOne({ schoolId, name: className }));
  const links = await runWithSchool(schoolId, async () => ClassSubject.find({ schoolId, classId: classRow.id }));
  const subjects = await runWithSchool(schoolId, async () => Subject.find({ schoolId, _id: { $in: links.map((l) => l.subjectId) } }));
  return subjects.map((s) => s.name).sort();
};

describe('schoolOnboarding.service — seedSchoolDefaults NaCCA subject mapping', () => {
  test('full_basic seeds all 13 classes with grade-appropriate subjects, not one flat list', async () => {
    const school = await fixtures.createSchool(models);
    const result = await seedSchoolDefaults(school._id, 'full_basic');
    expect(result.classesCreated).toBe(13);

    const nursery = await linkedSubjectNames(school._id, 'Nursery 1');
    expect(nursery).toEqual(
      ['Creative Arts', 'Language and Literacy', 'Numeracy', 'Our World Our People', 'Social and Emotional Development'].sort(),
    );
    expect(nursery).not.toContain('Mathematics');
    expect(nursery).not.toContain('Integrated Science');
  });

  test('JHS classes get Integrated Science/Social Studies/Career Technology, not the Basic 1-6 "Science" subject', async () => {
    const school = await fixtures.createSchool(models);
    await seedSchoolDefaults(school._id, 'full_basic');

    const jhs2 = await linkedSubjectNames(school._id, 'JHS 2');
    expect(jhs2).toContain('Integrated Science');
    expect(jhs2).toContain('Social Studies');
    expect(jhs2).toContain('Career Technology');
    expect(jhs2).not.toContain('Science');
  });

  test('Basic 1-3 gets Physical Education & Health but not French; Basic 4-6 gets French but not Physical Education & Health', async () => {
    const school = await fixtures.createSchool(models);
    await seedSchoolDefaults(school._id, 'full_basic');

    const basic2 = await linkedSubjectNames(school._id, 'Basic 2');
    expect(basic2).toContain('Physical Education and Health');
    expect(basic2).not.toContain('French');

    const basic5 = await linkedSubjectNames(school._id, 'Basic 5');
    expect(basic5).toContain('French');
    expect(basic5).not.toContain('Physical Education and Health');
  });

  test('a subject shared across buckets (e.g. English Language) is a single Subject document, not duplicated per bucket', async () => {
    const school = await fixtures.createSchool(models);
    await seedSchoolDefaults(school._id, 'full_basic');

    const { Subject } = models;
    const englishDocs = await runWithSchool(school._id, async () => Subject.find({ schoolId: school._id, name: 'English Language' }));
    expect(englishDocs).toHaveLength(1);
  });

  test('jhs_only never creates a Nursery-only subject that no seeded class needs', async () => {
    const school = await fixtures.createSchool(models);
    await seedSchoolDefaults(school._id, 'jhs_only');

    const { Subject } = models;
    const sedDocs = await runWithSchool(school._id, async () => Subject.find({ schoolId: school._id, name: 'Social and Emotional Development' }));
    expect(sedDocs).toHaveLength(0);
  });

  test('blank seeds nothing', async () => {
    const school = await fixtures.createSchool(models);
    const result = await seedSchoolDefaults(school._id, 'blank');
    expect(result).toEqual({ classesCreated: 0, subjectsCreated: 0 });
  });

  test('subjectsCreated in the return value matches the actual number of Subject documents created', async () => {
    const school = await fixtures.createSchool(models);
    const result = await seedSchoolDefaults(school._id, 'full_basic');

    const { Subject } = models;
    const allSubjects = await runWithSchool(school._id, async () => Subject.find({ schoolId: school._id }));
    expect(allSubjects).toHaveLength(result.subjectsCreated);
  });
});
