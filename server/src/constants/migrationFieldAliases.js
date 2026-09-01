// Legacy spreadsheets/systems name the same concept differently school to
// school -- this maps a bunch of common header spellings onto the canonical
// field names migration.service.js actually reads. Matching is
// case-insensitive and ignores surrounding whitespace (see
// migrationCleansing.service.js's normalizeRowKeys).
const PEOPLE_FIELD_ALIASES = {
  recordType: ['recordType', 'type', 'record type'],
  fullName: ['fullName', 'full name', 'name'],
  firstName: ['firstName', 'first name', 'given name'],
  lastName: ['lastName', 'last name', 'surname', 'family name'],
  otherNames: ['otherNames', 'other names', 'middle name', 'middle names'],
  email: ['email', 'email address'],
  phone: ['phone', 'phone number', 'mobile', 'mobile number'],
  gender: ['gender', 'sex'],
  dateOfBirth: ['dateOfBirth', 'dob', 'date of birth'],
  nationality: ['nationality'],
  religion: ['religion'],
  hometownRegion: ['hometownRegion', 'hometown / region', 'hometown/region', 'hometown'],
  primaryLanguage: ['primaryLanguage', 'primary language', 'home language'],
  residentialAddress: ['residentialAddress', 'address', 'residential address', 'home address'],
  admissionNo: ['admissionNo', 'admission no', 'admission number', 'admission no.', 'student id', 'studentid'],
  className: ['className', 'class', 'class enrolled', 'grade', 'grade level', 'class/grade'],
  guardianFullName: ['guardianFullName', 'parent name', 'guardian name', 'emergency contact', 'parent/guardian name'],
  guardianPhone: ['guardianPhone', 'parent phone', 'guardian phone', 'mobile', 'parent contact', 'contact number'],
  guardianWhatsApp: ['guardianWhatsApp', 'whatsapp', 'whatsapp number', 'parent whatsapp'],
  guardianRelationship: ['guardianRelationship', 'relationship', 'relation'],
  guardianOccupation: ['guardianOccupation', 'occupation', 'parent occupation'],
  secondaryGuardianFullName: ['secondaryGuardianFullName', 'second parent name', 'guardian 2 name'],
  secondaryGuardianPhone: ['secondaryGuardianPhone', 'second parent phone', 'guardian 2 phone'],
  secondaryGuardianWhatsApp: ['secondaryGuardianWhatsApp', 'guardian 2 whatsapp'],
  secondaryGuardianRelationship: ['secondaryGuardianRelationship', 'guardian 2 relationship'],
  secondaryGuardianOccupation: ['secondaryGuardianOccupation', 'guardian 2 occupation'],
  staffId: ['staffId', 'staff id', 'staff no', 'employee id', 'employee no'],
  qualification: ['qualification', 'qualifications'],
  isHomeroomTeacher: ['isHomeroomTeacher', 'is homeroom teacher', 'homeroom teacher'],
  homeroomClass: ['homeroomClass', 'homeroom class', 'homeroom'],
  assignedSubjects: ['assignedSubjects', 'assigned subjects', 'subjects'],
  password: ['password'],
};

const SCORES_FIELD_ALIASES = {
  studentAdmissionNo: ['studentAdmissionNo', 'admission no', 'admission number', 'student id', 'admissionNo'],
  subject: ['subject', 'subject name'],
  className: ['className', 'class', 'class enrolled'],
  academicYear: ['academicYear', 'academic year', 'year'],
  termNumber: ['termNumber', 'term number', 'term'],
  classScore: ['classScore', 'class score', 'ca', 'continuous assessment'],
  examScore: ['examScore', 'exam score', 'exam'],
  remarks: ['remarks', 'comment', 'comments'],
};

// One reverse lookup per alias set: lowercased/trimmed header text -> canonical field.
const buildReverseMap = (aliasMap) => {
  const reverse = new Map();
  Object.entries(aliasMap).forEach(([canonical, aliases]) => {
    aliases.forEach((alias) => reverse.set(alias.toLowerCase().trim(), canonical));
  });
  return reverse;
};

module.exports = {
  PEOPLE_FIELD_ALIASES,
  SCORES_FIELD_ALIASES,
  PEOPLE_REVERSE_MAP: buildReverseMap(PEOPLE_FIELD_ALIASES),
  SCORES_REVERSE_MAP: buildReverseMap(SCORES_FIELD_ALIASES),
};
