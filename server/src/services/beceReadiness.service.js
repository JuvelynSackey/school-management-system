// BECE/WAEC candidate readiness for JHS 3 -- turns the existing WAEC export
// gate (waecExport.service.js's validateCandidates, already used by
// students.controller.js's previewWaecExport/downloadWaecExport) into a
// standing dashboard instead of a check the admin only sees when they
// click "WAEC Export". Deliberately reuses that same MANDATORY_FIELDS
// check rather than defining a second, possibly-diverging one -- this
// dashboard's "ready" must always agree with what the real export will
// actually accept.
const {
  Student, Class, ClassSubject, StudentGuardian, Guardian,
} = require('../models');
const { validateCandidates } = require('./waecExport.service');
const { normalizeGhanaPhone } = require('./migrationCleansing.service');

const round1 = (n) => Math.round(n * 10) / 10;

// Ghana's basic-education ladder has no per-subject "core" vs "elective"
// flag anywhere in this schema (Subject.name is freeform per school, set
// by each admin) -- so "enrolled in required core subjects + electives"
// isn't something this codebase can honestly check per subject. The real,
// checkable signal is the one the rest of the app already uses: whether
// the class has ANY subjects assigned at all (ClassSubject), same as
// Data Quality Center's classesMissingSubjects.
const getBeceReadinessReport = async () => {
  const jhs3Classes = await Class.find({ gradeLevel: 'JHS 3' }, { name: 1, section: 1 });
  if (jhs3Classes.length === 0) {
    return {
      generatedAt: new Date().toISOString(), classes: [], candidateTotal: 0, readyCount: 0, readyPercent: null, criteria: [], candidates: [],
    };
  }
  const classIds = jhs3Classes.map((c) => c.id);
  const classNameById = new Map(jhs3Classes.map((c) => [c.id, `${c.name} ${c.section || ''}`.trim()]));

  const students = await Student.find({ classId: { $in: classIds }, status: 'active' })
    .sort({ lastName: 1, firstName: 1 });

  // Same function, same field labels, as the real export gate.
  const mandatoryMissingByStudent = new Map(
    validateCandidates(students).map((issue) => [issue.studentId, new Set(issue.missingFields)]),
  );

  const links = await StudentGuardian.find({ studentId: { $in: students.map((s) => s.id) } });
  const guardianIdByStudent = new Map(links.map((l) => [l.studentId.toString(), l.guardianId.toString()]));
  const guardians = await Guardian.find(
    { _id: { $in: [...new Set(links.map((l) => l.guardianId.toString()))] } },
    { phone: 1 },
  );
  const guardianById = new Map(guardians.map((g) => [g.id, g]));

  const classIdsWithSubjects = new Set(
    (await ClassSubject.find({ classId: { $in: classIds } }, { classId: 1 })).map((cs) => cs.classId.toString()),
  );

  const passCounts = {
    identity: 0, indexNumber: 0, photo: 0, demographics: 0, guardian: 0,
  };
  const candidates = [];

  students.forEach((s) => {
    const missing = [];
    const mandatoryMissing = mandatoryMissingByStudent.get(s.id) || new Set();

    const identityOk = !mandatoryMissing.has('Date of Birth') && !mandatoryMissing.has('Gender');
    if (identityOk) passCounts.identity += 1;
    else ['Date of Birth', 'Gender'].filter((f) => mandatoryMissing.has(f)).forEach((f) => missing.push(f));

    if (!mandatoryMissing.has('WAEC/BECE Index Number')) passCounts.indexNumber += 1;
    else missing.push('WAEC/BECE Index Number');

    if (!mandatoryMissing.has('Photo')) passCounts.photo += 1;
    else missing.push('Photo');

    // region is already schema-validated against the 16 official regions
    // (student.model.js's enum) -- a stored value is never a bad one, so
    // this only ever needs to check presence, not re-validate the value.
    const demographicsOk = Boolean(s.hometown) && Boolean(s.region);
    if (demographicsOk) passCounts.demographics += 1;
    else missing.push('Hometown/Region');

    const guardianId = guardianIdByStudent.get(s.id);
    const guardian = guardianId ? guardianById.get(guardianId) : null;
    const guardianOk = Boolean(guardian) && normalizeGhanaPhone(guardian.phone).valid;
    if (guardianOk) passCounts.guardian += 1;
    else missing.push(guardian ? 'Valid Guardian Phone Number' : 'Linked Guardian');

    if (!classIdsWithSubjects.has(s.classId?.toString())) missing.push('Class Has No Subjects Assigned');

    if (missing.length > 0) {
      candidates.push({
        studentId: s.id,
        name: `${s.firstName} ${s.lastName}`,
        admissionNo: s.admissionNo,
        className: classNameById.get(s.classId?.toString()) || 'Unknown',
        missing,
      });
    }
  });

  const total = students.length;
  const criteria = [
    { key: 'identity', label: 'Date of Birth & Gender Recorded', passCount: passCounts.identity, total },
    { key: 'index_number', label: 'WAEC Index Number Assigned', passCount: passCounts.indexNumber, total },
    { key: 'photo', label: 'Passport Photo Uploaded', passCount: passCounts.photo, total },
    { key: 'demographics', label: 'Hometown & Region Recorded', passCount: passCounts.demographics, total },
    { key: 'guardian', label: 'Linked Guardian With a Valid Phone Number', passCount: passCounts.guardian, total },
    {
      key: 'subjects_configured',
      label: 'Class Has Subjects Assigned',
      passCount: jhs3Classes.filter((c) => classIdsWithSubjects.has(c.id)).length,
      total: jhs3Classes.length,
    },
  ];

  const readyCount = total - candidates.length;

  return {
    generatedAt: new Date().toISOString(),
    classes: jhs3Classes.map((c) => ({ classId: c.id, className: classNameById.get(c.id) })),
    candidateTotal: total,
    readyCount,
    readyPercent: total > 0 ? round1((readyCount / total) * 100) : null,
    criteria,
    candidates,
  };
};

module.exports = { getBeceReadinessReport };
