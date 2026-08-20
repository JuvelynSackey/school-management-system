const { mongoose } = require('../config/database');

const School = require('./school.model');
const User = require('./user.model');
const AcademicTerm = require('./academicTerm.model');
const Teacher = require('./teacher.model');
const Class = require('./class.model');
const Student = require('./student.model');
const Admission = require('./admission.model');
const Subject = require('./subject.model');
const ClassSubject = require('./classSubject.model');
const TeacherSubjectAssignment = require('./teacherSubjectAssignment.model');
const Attendance = require('./attendance.model');
const Result = require('./result.model');
const ResultSheet = require('./resultSheet.model');
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
const AuditLog = require('./audit-log.model');
const PlatformSettings = require('./platformSettings.model');
const FeedingCharge = require('./feedingCharge.model');
const GradingScheme = require('./gradingScheme.model');
const PersonalAttribute = require('./personalAttribute.model');

// Relationships now live in-schema as `ref` fields (see each *.model.js);
// there's no separate association-wiring step the way Sequelize needed.
module.exports = {
  mongoose,
  School,
  User,
  AcademicTerm,
  Teacher,
  Class,
  Student,
  Admission,
  Subject,
  ClassSubject,
  TeacherSubjectAssignment,
  Attendance,
  Result,
  ResultSheet,
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
  AuditLog,
  PlatformSettings,
  FeedingCharge,
  GradingScheme,
  PersonalAttribute,
};
