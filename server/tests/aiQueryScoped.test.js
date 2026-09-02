const request = require('supertest');
const { startTestServer, stopTestServer, clearTestDb } = require('./testServer');
const { runWithSchool } = require('../src/middleware/tenantContext');

// Split into its own file (rather than living in aiQuery.test.js alongside
// the original 6 intents) so it gets a fresh app instance -- and therefore
// fresh in-memory rate-limiter state -- from its own startTestServer() call.
// Combined into one file, this suite's volume of /api/ai/query and
// /api/auth/login calls was enough to trip both the queryLimiter and the
// pre-existing loginLimiter within a single Jest run.
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

const mockAI = (intentJsonText, summaryText = 'Here is a summary.') => {
  let call = 0;
  global.fetch = jest.fn(async () => {
    call += 1;
    const content = call === 1 ? intentJsonText : summaryText;
    return { ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: content }] } }] }) };
  });
};

describe('Natural-Language Assistant — new admin/teacher/parent-scoped intents', () => {
  const originalKey = process.env.GEMINI_API_KEY;
  const originalFetch = global.fetch;

  beforeEach(() => { process.env.GEMINI_API_KEY = 'AIzaSy-test-fake-key'; });
  afterEach(() => {
    process.env.GEMINI_API_KEY = originalKey;
    global.fetch = originalFetch;
  });

    test('guardians_without_portal_login lists only guardians with no userId set', async () => {
      const school = await fixtures.createSchool(models);
      const classRow = await fixtures.createClass(models, school._id);
      const { student } = await fixtures.createStudent(models, school._id, { classId: classRow.id });
      const { guardian: withLogin } = await fixtures.createParentWithChild(models, school._id, student.id);
      const { Guardian, StudentGuardian } = models;
      const { student: student2 } = await fixtures.createStudent(models, school._id, { classId: classRow.id });
      const noLoginGuardian = await runWithSchool(school._id, () => Guardian.create({
        schoolId: school._id, fullName: 'No Login Guardian', phone: '0501234999',
      }));
      await runWithSchool(school._id, () => StudentGuardian.create({ schoolId: school._id, studentId: student2.id, guardianId: noLoginGuardian.id }));
      const { password } = await fixtures.createAdmin(models, school._id, { email: 'admin13@query-test.local' });
      const token = await fixtures.login(app, school.slug, 'admin13@query-test.local', password);

      mockAI('{"intent":"guardians_without_portal_login","params":{}}');

      const res = await request(app).post('/api/ai/query').set(fixtures.authHeader(token)).send({ question: 'Which guardians have no login?' });
      expect(res.status).toBe(200);
      const ids = res.body.data.rows.map((r) => r.guardianId);
      expect(ids).toContain(noLoginGuardian.id);
      expect(ids).not.toContain(withLogin.id);
    });

    test('classes_without_homeroom_teacher lists only classes with no classTeacherId', async () => {
      const school = await fixtures.createSchool(models);
      const { teacher } = await fixtures.createTeacher(models, school._id, { email: 'homeroom@query-test.local' });
      const withHomeroom = await fixtures.createClass(models, school._id, { name: 'Has Homeroom', classTeacherId: teacher.id });
      const withoutHomeroom = await fixtures.createClass(models, school._id, { name: 'No Homeroom' });
      const { password } = await fixtures.createAdmin(models, school._id, { email: 'admin14@query-test.local' });
      const token = await fixtures.login(app, school.slug, 'admin14@query-test.local', password);

      mockAI('{"intent":"classes_without_homeroom_teacher","params":{}}');

      const res = await request(app).post('/api/ai/query').set(fixtures.authHeader(token)).send({ question: 'Which classes have no homeroom teacher?' });
      expect(res.status).toBe(200);
      const ids = res.body.data.rows.map((r) => r.classId);
      expect(ids).toContain(withoutHomeroom.id);
      expect(ids).not.toContain(withHomeroom.id);
    });

    test('my_class_attendance_summary is scoped to the requesting teacher\'s own classes only', async () => {
      const school = await fixtures.createSchool(models);
      const myClass = await fixtures.createClass(models, school._id, { name: 'My Class' });
      const otherClass = await fixtures.createClass(models, school._id, { name: 'Other Teacher\'s Class' });
      const term = await fixtures.createTerm(models, school._id, { isCurrent: true });
      const { student: myStudent } = await fixtures.createStudent(models, school._id, { classId: myClass.id });
      const { student: otherStudent } = await fixtures.createStudent(models, school._id, { classId: otherClass.id });
      const { teacher, user: teacherUser, password } = await fixtures.createTeacher(models, school._id, { email: 'myclass@query-test.local' });
      await fixtures.assignTeacherToClass(models, school._id, { teacherId: teacher.id, subjectId: (await fixtures.createSubject(models, school._id)).id, classId: myClass.id });
      const token = await fixtures.login(app, school.slug, teacherUser.email, password);

      const { Attendance } = models;
      await runWithSchool(school._id, () => Attendance.create({
        schoolId: school._id, studentId: myStudent.id, classId: myClass.id, academicTermId: term.id, status: 'Present', attendanceDate: new Date(2025, 0, 1),
      }));
      await runWithSchool(school._id, () => Attendance.create({
        schoolId: school._id, studentId: otherStudent.id, classId: otherClass.id, academicTermId: term.id, status: 'Absent', attendanceDate: new Date(2025, 0, 1),
      }));

      mockAI('{"intent":"my_class_attendance_summary","params":{"academicTermHint":null}}');

      const res = await request(app).post('/api/ai/query').set(fixtures.authHeader(token)).send({ question: 'How is attendance in my classes?' });
      expect(res.status).toBe(200);
      const classNames = res.body.data.rows.map((r) => r.className);
      expect(classNames).toContain('My Class');
      expect(classNames).not.toContain('Other Teacher\'s Class');
    });

    test('my_class_unsubmitted_marksheets is scoped to the requesting teacher\'s own row only', async () => {
      const school = await fixtures.createSchool(models);
      const classRow = await fixtures.createClass(models, school._id);
      const subject = await fixtures.createSubject(models, school._id);
      await fixtures.createTerm(models, school._id, { isCurrent: true });
      const { teacher: me, user: meUser, password } = await fixtures.createTeacher(models, school._id, { email: 'me@query-test.local' });
      const { teacher: other } = await fixtures.createTeacher(models, school._id, { email: 'other@query-test.local' });
      const otherClass = await fixtures.createClass(models, school._id, { name: 'Other Class' });
      await fixtures.assignTeacherToClass(models, school._id, { teacherId: me.id, subjectId: subject.id, classId: classRow.id });
      await fixtures.assignTeacherToClass(models, school._id, { teacherId: other.id, subjectId: subject.id, classId: otherClass.id });
      const token = await fixtures.login(app, school.slug, meUser.email, password);

      mockAI('{"intent":"my_class_unsubmitted_marksheets","params":{"academicTermHint":null}}');

      const res = await request(app).post('/api/ai/query').set(fixtures.authHeader(token)).send({ question: 'Which of my marksheets are unsubmitted?' });
      expect(res.status).toBe(200);
      expect(res.body.data.rows).toEqual([expect.objectContaining({ className: expect.stringContaining(classRow.name) })]);
      expect(res.body.data.rows.some((r) => r.className.includes('Other Class'))).toBe(false);
    });

    test('my_child_fee_balance is scoped to the requesting parent\'s own linked children only', async () => {
      const school = await fixtures.createSchool(models);
      const classRow = await fixtures.createClass(models, school._id);
      const term = await fixtures.createTerm(models, school._id, { isCurrent: true });
      const { student: myChild } = await fixtures.createStudent(models, school._id, { classId: classRow.id });
      const { student: otherChild } = await fixtures.createStudent(models, school._id, { classId: classRow.id });
      const { user: parentUser, password } = await fixtures.createParentWithChild(models, school._id, myChild.id);
      const token = await fixtures.login(app, school.slug, parentUser.email, password);

      const { Fee } = models;
      await runWithSchool(school._id, () => Fee.create({
        schoolId: school._id, studentId: myChild.id, academicTermId: term.id, feeType: 'Tuition', category: 'Tuition', amountDue: 400,
      }));
      await runWithSchool(school._id, () => Fee.create({
        schoolId: school._id, studentId: otherChild.id, academicTermId: term.id, feeType: 'Tuition', category: 'Tuition', amountDue: 9999,
      }));

      mockAI('{"intent":"my_child_fee_balance","params":{"academicTermHint":null}}');

      const res = await request(app).post('/api/ai/query').set(fixtures.authHeader(token)).send({ question: 'How much do I owe?' });
      expect(res.status).toBe(200);
      expect(res.body.data.rows).toEqual([expect.objectContaining({ studentId: myChild.id, outstandingBalance: 400 })]);
      expect(res.body.data.rows.map((r) => r.studentId)).not.toContain(otherChild.id);
    });

    test('my_child_results_summary is scoped to the requesting parent\'s own linked children only', async () => {
      const school = await fixtures.createSchool(models);
      const classRow = await fixtures.createClass(models, school._id);
      const subject = await fixtures.createSubject(models, school._id);
      const term = await fixtures.createTerm(models, school._id, { isCurrent: true });
      await fixtures.assignSubjectToClass(models, school._id, { classId: classRow.id, subjectId: subject.id });
      const { student: myChild } = await fixtures.createStudent(models, school._id, { classId: classRow.id });
      const { student: otherChild } = await fixtures.createStudent(models, school._id, { classId: classRow.id });
      const { user: parentUser, password } = await fixtures.createParentWithChild(models, school._id, myChild.id);
      const token = await fixtures.login(app, school.slug, parentUser.email, password);

      const { Result } = models;
      await runWithSchool(school._id, () => Result.create({
        schoolId: school._id, studentId: myChild.id, subjectId: subject.id, classId: classRow.id, academicTermId: term.id, classScore: 40, examScore: 40,
      }));
      await runWithSchool(school._id, () => Result.create({
        schoolId: school._id, studentId: otherChild.id, subjectId: subject.id, classId: classRow.id, academicTermId: term.id, classScore: 5, examScore: 5,
      }));

      mockAI('{"intent":"my_child_results_summary","params":{"academicTermHint":null}}');

      const res = await request(app).post('/api/ai/query').set(fixtures.authHeader(token)).send({ question: 'How is my child doing?' });
      expect(res.status).toBe(200);
      expect(res.body.data.rows).toEqual([expect.objectContaining({ studentId: myChild.id, averageScore: 80 })]);
      expect(res.body.data.rows.map((r) => r.studentId)).not.toContain(otherChild.id);
    });

    test('a parent asking a teacher-only intent (and vice versa) both get the hard refusal, not the data', async () => {
      const school = await fixtures.createSchool(models);
      const classRow = await fixtures.createClass(models, school._id);
      const { student } = await fixtures.createStudent(models, school._id, { classId: classRow.id });
      const { user: parentUser, password: parentPassword } = await fixtures.createParentWithChild(models, school._id, student.id);
      const { user: teacherUser, password: teacherPassword } = await fixtures.createTeacher(models, school._id, { email: 'crossrole@query-test.local' });
      const parentToken = await fixtures.login(app, school.slug, parentUser.email, parentPassword);
      const teacherToken = await fixtures.login(app, school.slug, teacherUser.email, teacherPassword);

      mockAI('{"intent":"my_class_attendance_summary","params":{"academicTermHint":null}}');
      const parentTryingTeacherIntent = await request(app).post('/api/ai/query').set(fixtures.authHeader(parentToken)).send({ question: 'attendance in my classes' });
      expect(parentTryingTeacherIntent.body.data.answer).toBe('I cannot access or disclose information outside your authorized scope.');
      expect(parentTryingTeacherIntent.body.data.rows).toEqual([]);

      mockAI('{"intent":"my_child_fee_balance","params":{"academicTermHint":null}}');
      const teacherTryingParentIntent = await request(app).post('/api/ai/query').set(fixtures.authHeader(teacherToken)).send({ question: 'how much do I owe' });
      expect(teacherTryingParentIntent.body.data.answer).toBe('I cannot access or disclose information outside your authorized scope.');
      expect(teacherTryingParentIntent.body.data.rows).toEqual([]);
    });
});
