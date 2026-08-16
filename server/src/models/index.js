const { mongoose } = require('../config/database');

const User = require('./user.model');
const AcademicTerm = require('./academicTerm.model');
const Teacher = require('./teacher.model');
const Class = require('./class.model');
const Student = require('./student.model');
const Subject = require('./subject.model');
const ClassSubject = require('./classSubject.model');
const TeacherSubjectAssignment = require('./teacherSubjectAssignment.model');
const Attendance = require('./attendance.model');
const Result = require('./result.model');
const Fee = require('./fee.model');
const Payment = require('./payment.model');
const House = require('./house.model');
const Guardian = require('./guardian.model');
const StudentGuardian = require('./studentGuardian.model');
const StudentSafetyNote = require('./studentSafetyNote.model');
const FeeStructure = require('./feeStructure.model');
const TerminalReport = require('./terminalReport.model');
const Announcement = require('./announcement.model');
const SchoolSettings = require('./schoolSettings.model');

// Relationships now live in-schema as `ref` fields (see each *.model.js);
// there's no separate association-wiring step the way Sequelize needed.
module.exports = {
  mongoose,
  User,
  AcademicTerm,
  Teacher,
  Class,
  Student,
  Subject,
  ClassSubject,
  TeacherSubjectAssignment,
  Attendance,
  Result,
  Fee,
  Payment,
  House,
  Guardian,
  StudentGuardian,
  StudentSafetyNote,
  FeeStructure,
  TerminalReport,
  Announcement,
  SchoolSettings,
};
