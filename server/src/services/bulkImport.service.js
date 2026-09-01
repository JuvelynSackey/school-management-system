const { parse } = require('csv-parse/sync');
const { Student, Class } = require('../models');
const { createStudentAccount } = require('./studentEnrollment.service');
const { createTeacherAccount } = require('./teacherEnrollment.service');
const { GHANA_REGIONS } = require('../constants/ghanaRegions');
const AppError = require('../utils/AppError');

// "Cape Coast / Central Region" -> { hometown: "Cape Coast", region: "Central Region" }.
// An unrecognized region string is dropped (not guessed at) but reported as
// a warning, rather than failing the whole row over a formatting mismatch.
const parseHometownRegion = (raw) => {
  if (!raw) return { hometown: null, region: null, regionWarning: null };
  const parts = raw.split('/').map((p) => p.trim()).filter(Boolean);
  const hometown = parts[0] || null;
  const candidateRegion = parts.length > 1 ? parts[1] : null;
  if (candidateRegion && !GHANA_REGIONS.includes(candidateRegion)) {
    return { hometown, region: null, regionWarning: `"${candidateRegion}" is not one of Ghana's 16 official regions — left blank` };
  }
  return { hometown, region: candidateRegion, regionWarning: null };
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
    guardians.push({
      phone: row.guardianPhone,
      fullName: row.guardianFullName || row.guardianPhone,
      relationship: row.guardianRelationship || null,
      occupation: row.guardianOccupation || null,
      whatsappNumber: row.guardianWhatsApp || row.guardianPhone,
      contactPriority: 'primary',
    });
  }
  if (row.secondaryGuardianPhone) {
    guardians.push({
      phone: row.secondaryGuardianPhone,
      fullName: row.secondaryGuardianFullName || row.secondaryGuardianPhone,
      relationship: row.secondaryGuardianRelationship || null,
      occupation: row.secondaryGuardianOccupation || null,
      whatsappNumber: row.secondaryGuardianWhatsApp || row.secondaryGuardianPhone,
      contactPriority: 'secondary',
    });
  }

  const admissionNo = `ADM-${String(ctx.nextAdmissionSeq).padStart(4, '0')}`;
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
  ctx.nextAdmissionSeq += 1;

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

  const { teacher, tempPassword } = await createTeacherAccount({
    email: row.email,
    staffNo: row.staffId,
    firstName,
    lastName,
    gender: row.gender || null,
    phone: row.phone || null,
    qualification: row.qualification || null,
    homeroomClassId,
    password: row.password || null,
  });

  return {
    recordType: 'STAFF',
    name: `${firstName} ${lastName}`,
    staffNo: row.staffId,
    teacherId: teacher.id,
    tempPassword,
    warnings,
  };
};

// Parses a CSV buffer and creates one record per row (STUDENT or STAFF),
// each independently -- one bad row is reported and skipped, never aborts
// the whole batch. Must run inside an authenticated request's tenant
// context (Class/Student/etc. queries are auto-scoped to req.user.schoolId
// via tenantScopePlugin), same as every other admin-only creation endpoint.
const importCsv = async (csvBuffer) => {
  let rows;
  try {
    rows = parse(csvBuffer, { columns: true, skip_empty_lines: true, trim: true });
  } catch (err) {
    // csv-parse's column-count check is strict on purpose (a silently
    // shifted row would misfile e.g. a phone number into a religion field) —
    // surface exactly which line and why, rather than a raw parser stack.
    const where = err.lines ? ` (line ${err.lines})` : '';
    throw new AppError(`Could not parse CSV${where}: ${err.message}`, 400);
  }

  const ctx = { nextAdmissionSeq: (await Student.countDocuments()) + 1 };
  const created = [];
  const failed = [];

  // Sequential, not Promise.all -- each row runs its own Mongo transaction,
  // and admissionNo generation reads/increments a shared in-memory counter
  // that must not race across concurrent rows (same lesson learned in
  // students.controller.js's promote handler).
  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i];
    const rowNumber = i + 2; // +1 for 0-index, +1 for the header line
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

module.exports = { importCsv, parseHometownRegion, splitFullName };
