// Shared fixture builders for the test suite. These write directly via
// Mongoose (wrapped in runWithSchool, same pattern used throughout this
// project's own manual verification scripts) rather than going through
// HTTP, since most tests need several rows of scaffolding (a school, a
// class, a couple of users) before the actual thing under test happens.
const bcrypt = require('bcryptjs');
const request = require('supertest');
const { runWithSchool } = require('../src/middleware/tenantContext');

const DEFAULT_PASSWORD = 'TestPass@123';

const createSchool = async (models, { name = 'Test School', slug = `test-school-${Date.now()}-${Math.random().toString(36).slice(2, 8)}` } = {}) => {
  const { School, SchoolSettings } = models;
  const school = await School.create({ name, slug, status: 'active' });
  await runWithSchool(school._id, () => SchoolSettings.create({ schoolId: school._id, name }));
  return school;
};

const createUser = async (models, schoolId, { role, email, password = DEFAULT_PASSWORD, fullName = `Test ${role}` }) => {
  const { User } = models;
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await runWithSchool(schoolId, () => User.create({
    schoolId, email, passwordHash, fullName, role, status: 'active',
  }));
  return { user, password };
};

const createAdmin = (models, schoolId, overrides = {}) => createUser(models, schoolId, { role: 'admin', email: `admin-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@test.local`, ...overrides });

const createTeacher = async (models, schoolId, overrides = {}) => {
  const { Teacher } = models;
  const { user, password } = await createUser(models, schoolId, { role: 'teacher', email: `teacher-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@test.local`, ...overrides });
  const teacher = await runWithSchool(schoolId, () => Teacher.create({
    schoolId, userId: user.id, staffNo: `T-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, firstName: 'Test', lastName: 'Teacher', status: 'active',
  }));
  return { user, teacher, password };
};

const createClass = async (models, schoolId, overrides = {}) => {
  const { Class } = models;
  return runWithSchool(schoolId, () => Class.create({
    schoolId, name: `Class-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, stage: 'Primary', ...overrides,
  }));
};

const createSubject = async (models, schoolId, overrides = {}) => {
  const { Subject } = models;
  return runWithSchool(schoolId, () => Subject.create({
    schoolId, name: `Subject-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, ...overrides,
  }));
};

const assignSubjectToClass = async (models, schoolId, { classId, subjectId, academicTermId = null }) => {
  const { ClassSubject } = models;
  return runWithSchool(schoolId, () => ClassSubject.create({ schoolId, classId, subjectId, academicTermId }));
};

const assignTeacherToClass = async (models, schoolId, { teacherId, subjectId, classId, academicTermId = null }) => {
  const { TeacherSubjectAssignment } = models;
  return runWithSchool(schoolId, () => TeacherSubjectAssignment.create({
    schoolId, teacherId, subjectId, classId, academicTermId,
  }));
};

const createTerm = async (models, schoolId, overrides = {}) => {
  const { AcademicTerm } = models;
  return runWithSchool(schoolId, () => AcademicTerm.create({
    schoolId, name: '2025/2026 Term 1', academicYear: '2025/2026', termNumber: 1, isCurrent: true, ...overrides,
  }));
};

const createStudent = async (models, schoolId, { classId, overrides = {} } = {}) => {
  const { Student } = models;
  const { user, password } = await createUser(models, schoolId, { role: 'student', email: `student-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@test.local` });
  const student = await runWithSchool(schoolId, () => Student.create({
    schoolId,
    userId: user.id,
    admissionNo: `A-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    firstName: 'Test',
    lastName: 'Student',
    classId: classId || null,
    status: 'active',
    ...overrides,
  }));
  return { user, student, password };
};

const createParentWithChild = async (models, schoolId, studentId) => {
  const { Guardian, StudentGuardian } = models;
  const { user, password } = await createUser(models, schoolId, { role: 'parent', email: `parent-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@test.local` });
  const guardian = await runWithSchool(schoolId, () => Guardian.create({
    schoolId, userId: user.id, fullName: 'Test Parent', phone: `0${Math.floor(100000000 + Math.random() * 899999999)}`,
  }));
  await runWithSchool(schoolId, () => StudentGuardian.create({ schoolId, studentId, guardianId: guardian.id }));
  return { user, guardian, password };
};

// Logs in via the real HTTP endpoint (not a shortcut) — proves the actual
// login path issues a usable token, not just that a token could theoretically
// be signed.
const login = async (app, schoolSlug, identifier, password) => {
  const res = await request(app).post('/api/auth/login').send({ schoolCode: schoolSlug, identifier, password });
  if (!res.body?.data?.token) {
    throw new Error(`Login failed for ${identifier}@${schoolSlug}: ${JSON.stringify(res.body)}`);
  }
  return res.body.data.token;
};

const authHeader = (token) => ({ Authorization: `Bearer ${token}` });

module.exports = {
  createSchool,
  createUser,
  createAdmin,
  createTeacher,
  createClass,
  createSubject,
  assignSubjectToClass,
  assignTeacherToClass,
  createTerm,
  createStudent,
  createParentWithChild,
  login,
  authHeader,
  DEFAULT_PASSWORD,
};
