const { parse } = require('csv-parse/sync');
const {
  Student, Class, Subject, Result, ResultSheet, AcademicTerm,
} = require('../models');
const { createStudentAccount } = require('./studentEnrollment.service');
const { createTeacherAccount } = require('./teacherEnrollment.service');
const { recalculateSubjectPositions } = require('./terminalReports.service');
const { getSchemeForSchool, computeGradeWithScheme } = require('./grading.service');
const { normalizeRowKeys, normalizeGhanaPhone, matchGhanaRegion } = require('./migrationCleansing.service');
const { PEOPLE_REVERSE_MAP, SCORES_REVERSE_MAP } = require('../constants/migrationFieldAliases');
const AppError = require('../utils/AppError');

const parseCsv = (csvBuffer, label) => {
  try {
    return parse(csvBuffer, { columns: true, skip_empty_lines: true, trim: true });
  } catch (err) {
    const where = err.lines ? ` (line ${err.lines})` : '';
    throw new AppError(`Could not parse ${label} CSV${where}: ${err.message}`, 400);
  }
};

// "Cape Coast / Central Region" (or "Cape Coast / ashanti reg", etc.) ->
// { hometown: "Cape Coast", region: "Ashanti Region" | null }. Region
// resolution goes through matchGhanaRegion's cleansing/fuzzy-match, not a
// strict equality check -- legacy exports rarely spell it exactly right.
const parseHometownRegion = (raw) => {
  if (!raw) return { hometown: null, region: null, regionWarning: null };
  const parts = raw.split('/').map((p) => p.trim()).filter(Boolean);
  const hometown = parts[0] || null;
  const candidateRegion = parts.length > 1 ? parts[1] : null;
  if (!candidateRegion) return { hometown, region: null, regionWarning: null };
  const matched = matchGhanaRegion(candidateRegion);
  if (!matched) return { hometown, region: null, regionWarning: `"${candidateRegion}" did not match one of Ghana's 16 official regions — left blank` };
  return { hometown, region: matched, regionWarning: null };
};

const splitFullName = (fullName) => {
  const parts = fullName.trim().split(/\s+/);
  const [firstName, ...rest] = parts;
  return { firstName, lastName: rest.join(' ') || firstName };
};

const processStudentRow = async (row, ctx) => {
  if (!row.firstName || !row.lastName) throw new Error('firstName and lastName are required for a STUDENT row');

  const warnings = [];
  const fullFirstName = row.otherNames ? `${row.firstName} ${row.otherNames}`.trim() : row.firstName;

  let classId = null;
  if (row.className) {
    const matches = await Class.find({ name: row.className });
    if (matches.length === 0) warnings.push(`Class "${row.className}" not found — left unassigned`);
    else if (matches.length > 1) warnings.push(`Multiple classes named "${row.className}" — left unassigned, resolve manually`);
    else classId = matches[0].id;
  }

  const { hometown, region, regionWarning } = parseHometownRegion(row.hometownRegion);
  if (regionWarning) warnings.push(regionWarning);

  const guardians = [];
  if (row.guardianPhone) {
    const { normalized, valid } = normalizeGhanaPhone(row.guardianPhone);
    if (!valid) warnings.push(`Guardian phone "${row.guardianPhone}" doesn't look like a valid Ghanaian number — stored as given, parent login may not work correctly`);
    guardians.push({
      phone: normalized,
      fullName: row.guardianFullName || row.guardianPhone,
      relationship: row.guardianRelationship || null,
      occupation: row.guardianOccupation || null,
      whatsappNumber: row.guardianWhatsApp ? normalizeGhanaPhone(row.guardianWhatsApp).normalized : normalized,
      contactPriority: 'primary',
    });
  }
  if (row.secondaryGuardianPhone) {
    const { normalized, valid } = normalizeGhanaPhone(row.secondaryGuardianPhone);
    if (!valid) warnings.push(`Secondary guardian phone "${row.secondaryGuardianPhone}" doesn't look like a valid Ghanaian number — stored as given`);
    guardians.push({
      phone: normalized,
      fullName: row.secondaryGuardianFullName || row.secondaryGuardianPhone,
      relationship: row.secondaryGuardianRelationship || null,
      occupation: row.secondaryGuardianOccupation || null,
      whatsappNumber: row.secondaryGuardianWhatsApp ? normalizeGhanaPhone(row.secondaryGuardianWhatsApp).normalized : normalized,
      contactPriority: 'secondary',
    });
  }

  // Preserve a legacy school's existing admission numbers verbatim; only
  // auto-generate one when the row doesn't supply any.
  let admissionNo = row.admissionNo || null;
  if (!admissionNo) {
    admissionNo = `ADM-${String(ctx.nextAdmissionSeq).padStart(4, '0')}`;
    ctx.nextAdmissionSeq += 1;
  }

  const { student, tempPassword, provisionedLogins } = await createStudentAccount({
    email: row.email || null,
    admissionNo,
    firstName: fullFirstName,
    lastName: row.lastName,
    gender: row.gender || null,
    dateOfBirth: row.dateOfBirth || null,
    classId,
    address: row.residentialAddress || null,
    nationality: row.nationality || null,
    religion: row.religion || null,
    hometown,
    region,
    primaryLanguage: row.primaryLanguage || null,
    guardians,
  });

  return {
    recordType: 'STUDENT',
    name: `${fullFirstName} ${row.lastName}`,
    admissionNo,
    studentId: student.id,
    tempPassword,
    provisionedLogins,
    warnings,
  };
};

const processStaffRow = async (row) => {
  if (!row.fullName) throw new Error('fullName is required for a STAFF row');
  if (!row.email) throw new Error('email is required for a STAFF row');
  if (!row.staffId) throw new Error('staffId is required for a STAFF row');

  const warnings = [];
  const { firstName, lastName } = splitFullName(row.fullName);

  let homeroomClassId = null;
  if (row.isHomeroomTeacher === 'true' && row.homeroomClass) {
    const matches = await Class.find({ name: row.homeroomClass });
    if (matches.length === 0) warnings.push(`Homeroom class "${row.homeroomClass}" not found — not assigned as homeroom teacher`);
    else if (matches.length > 1) warnings.push(`Multiple classes named "${row.homeroomClass}" — not assigned as homeroom teacher, resolve manually`);
    else homeroomClassId = matches[0].id;
  }
  if (row.assignedSubjects) {
    warnings.push(`Subjects listed (${row.assignedSubjects}) were not auto-assigned — the CSV doesn't specify which class each applies to. Assign manually via Classes > Manage Subjects.`);
  }

  let phone = row.phone || null;
  if (phone) {
    const { normalized, valid } = normalizeGhanaPhone(phone);
    if (!valid) warnings.push(`Phone "${phone}" doesn't look like a valid Ghanaian number — stored as given`);
    phone = normalized;
  }

  const { teacher, tempPassword } = await createTeacherAccount({
    email: row.email,
    staffNo: row.staffId,
    firstName,
    lastName,
    gender: row.gender || null,
    phone,
    qualification: row.qualification || null,
    homeroomClassId,
    password: row.password || null,
  });

  return {
    recordType: 'STAFF', name: `${firstName} ${lastName}`, staffNo: row.staffId, teacherId: teacher.id, tempPassword, warnings,
  };
};

// Parses a people (STUDENT/STAFF) CSV -- from any legacy export whose
// headers match the alias table -- and creates one record per row,
// independently. A bad row is reported and skipped, never aborts the batch.
// Must run inside an authenticated request's tenant context.
const importPeople = async (csvBuffer) => {
  const rawRows = parseCsv(csvBuffer, 'people');
  const rows = rawRows.map((r) => normalizeRowKeys(r, PEOPLE_REVERSE_MAP));

  const ctx = { nextAdmissionSeq: (await Student.countDocuments()) + 1 };
  const created = [];
  const failed = [];

  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i];
    const rowNumber = i + 2;
    try {
      const recordType = (row.recordType || '').trim().toUpperCase();
      // eslint-disable-next-line no-await-in-loop
      if (recordType === 'STUDENT') created.push({ row: rowNumber, ...(await processStudentRow(row, ctx)) });
      // eslint-disable-next-line no-await-in-loop
      else if (recordType === 'STAFF') created.push({ row: rowNumber, ...(await processStaffRow(row)) });
      else failed.push({ row: rowNumber, name: row.fullName || `${row.firstName || ''} ${row.lastName || ''}`.trim(), reason: `Unknown recordType "${row.recordType}" — must be STUDENT or STAFF` });
    } catch (err) {
      failed.push({ row: rowNumber, name: row.fullName || `${row.firstName || ''} ${row.lastName || ''}`.trim(), reason: err.message });
    }
  }

  return { totalRows: rows.length, createdCount: created.length, failedCount: failed.length, created, failed };
};

// Finds (or, for a historical term no longer tracked, creates) the
// AcademicTerm a score row belongs to. Historical migrations routinely
// reference terms that predate the school's use of this app, so unlike
// class/subject resolution (which only ever looks up), this one backfills.
const resolveTerm = async (academicYear, termNumber) => {
  let term = await AcademicTerm.findOne({ academicYear, termNumber });
  if (!term) {
    // schoolId is stamped automatically on save by tenantScopePlugin.
    term = await AcademicTerm.create({
      name: `Term ${termNumber} (${academicYear})`, academicYear, termNumber, isCurrent: false,
    });
  }
  return term;
};

const processScoreRow = async (row, ctx) => {
  if (!row.studentAdmissionNo) throw new Error('studentAdmissionNo is required');
  if (!row.subject) throw new Error('subject is required');
  if (!row.academicYear || !row.termNumber) throw new Error('academicYear and termNumber are required');
  if (row.classScore === undefined || row.classScore === '' || row.examScore === undefined || row.examScore === '') {
    throw new Error('classScore and examScore are required');
  }

  const student = await Student.findOne({ admissionNo: row.studentAdmissionNo });
  if (!student) throw new Error(`No student found with admission number "${row.studentAdmissionNo}"`);

  const subjectMatches = await Subject.find({ name: row.subject });
  if (subjectMatches.length === 0) throw new Error(`Subject "${row.subject}" not found`);
  if (subjectMatches.length > 1) throw new Error(`Multiple subjects named "${row.subject}" — resolve manually`);
  const subject = subjectMatches[0];

  let classId = student.classId;
  if (row.className) {
    const classMatches = await Class.find({ name: row.className });
    if (classMatches.length === 1) classId = classMatches[0].id;
    else if (classMatches.length === 0) throw new Error(`Class "${row.className}" not found`);
    else throw new Error(`Multiple classes named "${row.className}" — resolve manually`);
  }
  if (!classId) throw new Error(`Student "${row.studentAdmissionNo}" has no current class, and no className column was given for this row`);

  const term = await resolveTerm(row.academicYear.trim(), Number(row.termNumber));

  const classScore = Number(row.classScore);
  const examScore = Number(row.examScore);
  if (Number.isNaN(classScore) || Number.isNaN(examScore)) throw new Error('classScore and examScore must be numbers');
  if (classScore > ctx.scheme.classScoreMax || examScore > ctx.scheme.examScoreMax) {
    throw new Error(`classScore/examScore exceed this school's configured maximums (${ctx.scheme.classScoreMax}/${ctx.scheme.examScoreMax})`);
  }
  if (classScore < 0 || examScore < 0) throw new Error('classScore and examScore cannot be negative');

  const totalScore = classScore + examScore;
  const grade = computeGradeWithScheme(classScore, examScore, ctx.scheme);

  await Result.findOneAndUpdate(
    { studentId: student.id, subjectId: subject.id, academicTermId: term.id },
    {
      $set: {
        classId, classScore, examScore, totalScore, grade, remarks: row.remarks || null, isMigrated: true, migratedAt: new Date(),
      },
    },
    { upsert: true },
  );

  // A ResultSheet with no matching Approved record makes an imported score
  // invisible to the family and blocks the term's report card from ever
  // locking (see terminalReports.controller.js's assertAllSubjectsApproved)
  // -- recordBulk (the live score-entry path) never creates one either, so
  // this import auto-approves it, since a historical row is by definition
  // already final, not awaiting review.
  await ResultSheet.findOneAndUpdate(
    { classId, subjectId: subject.id, academicTermId: term.id },
    { $setOnInsert: { status: 'Approved', reviewedBy: ctx.importedBy, reviewedAt: new Date() } },
    { upsert: true },
  );

  const groupKey = `${classId}:${subject.id}:${term.id}`;
  ctx.touchedGroups.add(groupKey);
  ctx.groupDetails.set(groupKey, { classId, subjectId: subject.id, academicTermId: term.id });

  return {
    studentAdmissionNo: row.studentAdmissionNo, subject: subject.name, academicYear: term.academicYear, termNumber: term.termNumber, totalScore, grade,
  };
};

// Parses a historical scores CSV and upserts Result (+ auto-approved
// ResultSheet) rows tagged isMigrated. Recomputes subjectPosition once per
// distinct (class, subject, term) group touched, same as the live
// recordBulk flow does after a batch of live entries.
const importScores = async (csvBuffer, importedBy, schoolId) => {
  const rawRows = parseCsv(csvBuffer, 'scores');
  const rows = rawRows.map((r) => normalizeRowKeys(r, SCORES_REVERSE_MAP));

  const scheme = await getSchemeForSchool(schoolId);
  const ctx = {
    scheme, importedBy, touchedGroups: new Set(), groupDetails: new Map(),
  };
  const created = [];
  const failed = [];

  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i];
    const rowNumber = i + 2;
    try {
      // eslint-disable-next-line no-await-in-loop
      created.push({ row: rowNumber, ...(await processScoreRow(row, ctx)) });
    } catch (err) {
      failed.push({ row: rowNumber, studentAdmissionNo: row.studentAdmissionNo || null, reason: err.message });
    }
  }

  // eslint-disable-next-line no-restricted-syntax
  for (const key of ctx.touchedGroups) {
    const { classId, subjectId, academicTermId } = ctx.groupDetails.get(key);
    // eslint-disable-next-line no-await-in-loop
    await recalculateSubjectPositions(classId, subjectId, academicTermId);
  }

  return { totalRows: rows.length, createdCount: created.length, failedCount: failed.length, created, failed };
};

module.exports = {
  importPeople, importScores, parseHometownRegion, splitFullName,
};
