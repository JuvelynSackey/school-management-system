// WAEC/BECE candidate data export — CSV only in this pass. No Excel library
// exists anywhere in this project (checked package.json before writing
// this), and adding one is a real dependency decision, not something to
// slip in silently; CSV is what WAEC candidate-registration portals accept
// in practice. "Restrict to JHS 3" from the original ask isn't something
// the schema can express — Class.stage only has a coarse 'JHS' value, no
// JHS1/2/3 distinction — so this is scoped by classId (the admin picks
// whichever class is this year's actual candidate class) like every other
// per-class export in this app already is.

const MANDATORY_FIELDS = [
  { key: 'dateOfBirth', label: 'Date of Birth' },
  { key: 'waecIndexNumber', label: 'WAEC/BECE Index Number' },
  { key: 'photoUrl', label: 'Photo' },
  { key: 'gender', label: 'Gender' },
];

// One entry per student missing at least one mandatory field — never a
// generic "N students have problems" message. Whether the class's subjects
// are configured at all is checked separately (checkSubjectsConfigured),
// since that's a property of the class, not any individual candidate.
const validateCandidates = (students) => students
  .map((s) => {
    const missingFields = MANDATORY_FIELDS.filter(({ key }) => !s[key]).map(({ label }) => label);
    if (missingFields.length === 0) return null;
    return {
      studentId: s.id, name: `${s.firstName} ${s.lastName}`, admissionNo: s.admissionNo, missingFields,
    };
  })
  .filter(Boolean);

// RFC 4180-ish: quote a field only when it actually needs it, doubling any
// internal quotes — simple enough to hand-write correctly rather than pull
// in a CSV library for one column set.
const csvEscape = (value) => {
  const str = value === null || value === undefined ? '' : String(value);
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
};

const CSV_HEADERS = ['INDEX_NUMBER', 'SURNAME', 'FIRST_NAME', 'OTHER_NAMES', 'GENDER', 'DATE_OF_BIRTH', 'BECE_SUBJECT_CODES'];

// subjectCodesLine is the SAME for every row — JesManage assigns subjects
// per class, not per student, so every candidate in a class sits the same
// subject set. OTHER_NAMES stays permanently blank: the Student model has
// no middle/other-name field to draw from, and this column is left in
// (rather than dropped) only so the output still matches the shape a WAEC
// upload template expects.
const buildWaecCsv = (students, subjectCodesLine) => {
  const rows = students.map((s) => [
    s.waecIndexNumber, s.lastName, s.firstName, '', s.gender, s.dateOfBirth, subjectCodesLine,
  ].map(csvEscape).join(','));
  return [CSV_HEADERS.join(','), ...rows].join('\n');
};

module.exports = {
  validateCandidates, buildWaecCsv, csvEscape, MANDATORY_FIELDS,
};
