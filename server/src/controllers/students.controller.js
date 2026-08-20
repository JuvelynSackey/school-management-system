const fs = require('fs');
const path = require('path');
const models = require('../models');
const {
  mongoose, Student, User, StudentGuardian, Class, House, School, SchoolSettings, AcademicTerm, ClassSubject, Subject,
} = models;
const asyncHandler = require('../middleware/asyncHandler');
const AppError = require('../utils/AppError');
const { PHOTOS_DIR } = require('../middleware/upload');
const { deleteWithCascade } = require('../services/cascadeDelete.service');
const { getTeacherClassIds: getTeacherClassIdsShared } = require('../services/teacherScope.service');
const { getParentStudentIds } = require('../services/parentScope.service');
const { createStudentAccount, linkGuardians, replaceSafetyNotes } = require('../services/studentEnrollment.service');
const { findOrCreate } = require('../utils/findOrCreate');
const { buildVerificationQrDataUrl } = require('../services/verification.service');
const { renderHtmlToPdfBuffer } = require('../services/pdf.service');
const { buildIdCardsHtml } = require('../services/idCardTemplate.service');
const { validateCandidates, buildWaecCsv } = require('../services/waecExport.service');
const auditLog = require('../services/auditLog.service');

const getTeacherClassIds = async (userId) => (await getTeacherClassIdsShared(userId)).classIds;

const populateFull = (query) => query
  .populate('user', 'email status')
  .populate('class', 'name section')
  .populate('house', 'name colorHex')
  .populate('safetyNotes', 'type note');

// Guardian<->Student is many-to-many via StudentGuardian; attach it manually
// the same way classes.controller.js/guardians.controller.js do.
const attachGuardians = async (studentDoc) => {
  const links = await StudentGuardian.find({ studentId: studentDoc.id }).populate('guardian');
  const data = studentDoc.toJSON();
  data.guardians = await Promise.all(links.map(async (link) => {
    const siblingLinks = await StudentGuardian.find({ guardianId: link.guardianId }).populate('student', 'firstName lastName');
    return {
      ...link.guardian.toJSON(),
      contactPriority: link.contactPriority,
      isPickupAuthorized: link.isPickupAuthorized,
      students: siblingLinks.map((l) => l.student).filter(Boolean),
    };
  }));
  return data;
};

const list = asyncHandler(async (req, res) => {
  const { search, classId, status } = req.query;
  const where = {};

  if (status) {
    where.status = status;
  } else {
    where.status = { $ne: 'archived' };
  }
  if (classId) where.classId = classId;
  if (search) {
    const regex = new RegExp(search, 'i');
    where.$or = [
      { firstName: regex },
      { lastName: regex },
      { admissionNo: regex },
    ];
  }

  if (req.user.role === 'teacher') {
    const classIds = await getTeacherClassIds(req.user.id);
    where.classId = { $in: classIds }; // empty array -> matches nothing, same as before
  }

  const students = await Student.find(where)
    .populate('user', 'email status')
    .populate('class', 'name section')
    .populate('house', 'name colorHex')
    .sort({ firstName: 1 });
  res.json({ success: true, data: students });
});

const getById = asyncHandler(async (req, res, next) => {
  const student = await populateFull(Student.findById(req.params.id));
  if (!student) return next(new AppError('Student not found', 404));

  if (req.user.role === 'student' && student.userId.toString() !== req.user.id) {
    return next(new AppError('You do not have permission to view this student', 403));
  }
  if (req.user.role === 'teacher') {
    const classIds = await getTeacherClassIds(req.user.id);
    if (!classIds.includes(student.classId?.toString())) {
      return next(new AppError('You do not have permission to view this student', 403));
    }
  }
  if (req.user.role === 'parent') {
    const { studentIds } = await getParentStudentIds(req.user.id);
    if (!studentIds.includes(student.id)) {
      return next(new AppError('You do not have permission to view this student', 403));
    }
  }

  res.json({ success: true, data: await attachGuardians(student) });
});

// GET /students/my-children — every child linked to the logged-in parent
const getMyChildren = asyncHandler(async (req, res) => {
  const { studentIds } = await getParentStudentIds(req.user.id);
  const children = await Student.find({ _id: { $in: studentIds } })
    .populate('class', 'name section')
    .select('firstName lastName admissionNo classId status')
    .sort({ firstName: 1 });
  res.json({ success: true, data: children });
});

const getMe = asyncHandler(async (req, res, next) => {
  const student = await populateFull(Student.findOne({ userId: req.user.id }));
  if (!student) return next(new AppError('Student profile not found', 404));
  res.json({ success: true, data: await attachGuardians(student) });
});

const create = asyncHandler(async (req, res, next) => {
  const {
    email, admissionNo, firstName, lastName, gender, dateOfBirth, classId, houseId,
    address, admissionDate, category, programme, guardians, safetyNotes,
  } = req.body;

  const existing = await User.findOne({ email });
  if (existing) return next(new AppError('A user with this email already exists', 400));
  if (classId && !(await Class.findById(classId))) return next(new AppError('Class not found', 400));
  if (houseId && !(await House.findById(houseId))) return next(new AppError('House not found', 400));

  const { student, tempPassword } = await createStudentAccount({
    email, admissionNo, firstName, lastName, gender, dateOfBirth, classId, houseId, address, admissionDate, category, programme, guardians, safetyNotes,
  });

  const full = await populateFull(Student.findById(student.id));

  await auditLog.record({
    req, action: 'student.create', entityType: 'Student', entityId: student.id, description: `Created student: ${firstName} ${lastName} (${admissionNo})`,
  });

  res.status(201).json({
    success: true,
    data: { ...(await attachGuardians(full)), tempPassword },
  });
});

const update = asyncHandler(async (req, res, next) => {
  const student = await Student.findById(req.params.id);
  if (!student) return next(new AppError('Student not found', 404));

  const {
    admissionNo, firstName, lastName, gender, dateOfBirth, classId, houseId,
    address, admissionDate, category, programme, status, waecIndexNumber, guardians, safetyNotes,
  } = req.body;

  if (waecIndexNumber) {
    const clash = await Student.findOne({ waecIndexNumber, _id: { $ne: student.id } });
    if (clash) return next(new AppError('This WAEC index number is already assigned to another student', 400));
  }

  if (classId && !(await Class.findById(classId))) return next(new AppError('Class not found', 400));
  if (houseId && !(await House.findById(houseId))) return next(new AppError('House not found', 400));

  const previousStatus = student.status;

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      student.admissionNo = admissionNo ?? student.admissionNo;
      student.firstName = firstName ?? student.firstName;
      student.lastName = lastName ?? student.lastName;
      student.gender = gender === undefined ? student.gender : gender;
      student.dateOfBirth = dateOfBirth === undefined ? student.dateOfBirth : dateOfBirth;
      student.classId = classId === undefined ? student.classId : (classId || null);
      student.houseId = houseId === undefined ? student.houseId : (houseId || null);
      student.address = address === undefined ? student.address : address;
      student.admissionDate = admissionDate === undefined ? student.admissionDate : admissionDate;
      student.category = category === undefined ? student.category : (category || null);
      student.programme = programme === undefined ? student.programme : (programme || null);
      student.status = status ?? student.status;
      if (waecIndexNumber !== undefined) student.waecIndexNumber = waecIndexNumber || undefined;
      await student.save({ session });

      if (Array.isArray(guardians)) {
        await linkGuardians(student.id, guardians, session);
      }
      if (Array.isArray(safetyNotes)) {
        await replaceSafetyNotes(student.id, safetyNotes, session);
      }
    });
  } finally {
    await session.endSession();
  }

  if (status) {
    await User.updateOne(
      { _id: student.userId },
      { $set: { status: status === 'archived' || status === 'inactive' ? 'inactive' : 'active' } },
    );
  }

  if (status && status !== previousStatus) {
    await auditLog.record({
      req,
      action: 'student.statusChange',
      entityType: 'Student',
      entityId: student.id,
      description: `Changed status of ${student.firstName} ${student.lastName} from ${previousStatus} to ${status}`,
    });
  }

  const full = await populateFull(Student.findById(student.id));
  res.json({ success: true, data: await attachGuardians(full) });
});

const remove = asyncHandler(async (req, res, next) => {
  const student = await Student.findById(req.params.id);
  if (!student) return next(new AppError('Student not found', 404));
  await auditLog.record({
    req, action: 'student.remove', entityType: 'Student', entityId: student.id, description: `Deleted student: ${student.firstName} ${student.lastName}`,
  });
  await deleteWithCascade(models, User, student.userId); // cascades to the student profile too
  res.json({ success: true, data: null });
});

// POST /students/:id/photo — multipart, req.file populated by the
// uploadStudentPhoto multer middleware (see middleware/upload.js) before
// this handler runs. Same absolute-URL pattern as the school-logo upload
// (schools.controller.js's uploadLogo), but unlike that one, this deletes
// the previous photo file on re-upload rather than leaving it orphaned —
// a re-upload here is expected to be a routine correction (wrong photo,
// a retake), not a rare event worth tolerating unbounded disk growth over.
const uploadPhoto = asyncHandler(async (req, res, next) => {
  const student = await Student.findById(req.params.id);
  if (!student) return next(new AppError('Student not found', 404));
  if (!req.file) return next(new AppError('A photo file is required', 400));

  const previousUrl = student.photoUrl;
  const photoUrl = `${req.protocol}://${req.get('host')}/uploads/student-photos/${req.file.filename}`;
  student.photoUrl = photoUrl;
  await student.save();

  if (previousUrl) {
    const previousFilename = previousUrl.split('/uploads/student-photos/')[1];
    if (previousFilename) {
      // best-effort — a leftover file is a disk-space issue, never worth failing this request over
      fs.unlink(path.join(PHOTOS_DIR, previousFilename), () => {});
    }
  }

  await auditLog.record({
    req, action: 'student.photoUpload', entityType: 'Student', entityId: student.id, description: `Uploaded a photo for ${student.firstName} ${student.lastName}`,
  });

  res.json({ success: true, data: { photoUrl } });
});

// GET /students/id-cards/pdf?classId= (admin-only)
// A4 sheet, 10 cards per page (see idCardTemplate.service.js). Each card's
// QR code reuses the SAME verification pattern already built for report
// cards and fee receipts (verification.service.js's buildVerificationQrDataUrl
// with a 'student' type) rather than a new one — it resolves publicly at
// /verify/student/:schoolSlug/:id, scoped to this tenant like every other
// verification lookup.
const downloadIdCardsPdf = asyncHandler(async (req, res, next) => {
  const { classId } = req.query;
  if (!classId) return next(new AppError('classId is required', 400));

  const classRow = await Class.findById(classId);
  if (!classRow) return next(new AppError('Class not found', 400));

  const students = await Student.find({ classId, status: 'active' }).sort({ firstName: 1 });
  if (students.length === 0) return next(new AppError('This class has no active students to print cards for', 400));

  const [settings] = await findOrCreate(SchoolSettings, { where: { schoolId: req.user.schoolId } });
  const schoolDoc = await School.findById(req.user.schoolId);
  const currentTerm = await AcademicTerm.findOne({ isCurrent: true });

  const qrByStudentId = new Map();
  await Promise.all(students.map(async (s) => {
    qrByStudentId.set(s.id, await buildVerificationQrDataUrl('student', s.id, schoolDoc.slug));
  }));

  const cardStudents = students.map((s) => ({
    id: s.id,
    firstName: s.firstName,
    lastName: s.lastName,
    admissionNo: s.admissionNo,
    waecIndexNumber: s.waecIndexNumber || null,
    photoUrl: s.photoUrl || null,
    className: `${classRow.name} ${classRow.section || ''}`.trim(),
  }));

  const html = buildIdCardsHtml({
    school: settings,
    students: cardStudents,
    qrByStudentId,
    academicYear: currentTerm?.academicYear || null,
  });

  const pdfBuffer = await renderHtmlToPdfBuffer(html, { format: 'A4' });

  await auditLog.record({
    req, action: 'student.idCardsDownload', entityType: 'Class', entityId: classRow.id, description: `Generated ${students.length} ID card(s) for ${classRow.name} ${classRow.section || ''}`.trim(),
  });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="id-cards-${classRow.name}.pdf"`.replace(/\s+/g, '-'));
  res.send(pdfBuffer);
});

// Shared by both WAEC endpoints below — the same candidate roster and
// subject-code line, so preview and the real export can never disagree
// about what "this class's candidates" means.
const loadWaecCandidates = async (classId) => {
  const classRow = await Class.findById(classId);
  if (!classRow) return { classRow: null, students: [], subjectCodesLine: '' };

  const students = await Student.find({ classId, status: 'active' }).sort({ lastName: 1, firstName: 1 });

  const classSubjects = await ClassSubject.find({ classId }).populate('subject', 'name code');
  const subjectCodesLine = classSubjects
    .map((cs) => cs.subject?.code || cs.subject?.name)
    .filter(Boolean)
    .join(';');

  return { classRow, students, subjectCodesLine };
};

// GET /students/waec-preview?classId= (admin-only)
// Always JSON, never the file itself — lets the admin see and fix data
// gaps before attempting a download, rather than discovering them as a
// failed export. Deliberately checked again inside downloadWaecExport too
// (never trust that the client actually looked at this first).
const previewWaecExport = asyncHandler(async (req, res, next) => {
  const { classId } = req.query;
  const { classRow, students } = await loadWaecCandidates(classId);
  if (!classRow) return next(new AppError('Class not found', 400));

  const issues = validateCandidates(students);
  res.json({
    success: true,
    data: { ready: issues.length === 0, candidateCount: students.length, issues },
  });
});

// GET /students/waec-export?classId= (admin-only)
const downloadWaecExport = asyncHandler(async (req, res, next) => {
  const { classId } = req.query;
  const { classRow, students, subjectCodesLine } = await loadWaecCandidates(classId);
  if (!classRow) return next(new AppError('Class not found', 400));
  if (students.length === 0) return next(new AppError('This class has no active students to export', 400));

  const issues = validateCandidates(students);
  if (issues.length > 0) {
    return next(new AppError(`${issues.length} candidate(s) are missing required data. Check the preview before exporting.`, 400));
  }

  const csv = buildWaecCsv(students, subjectCodesLine);

  await auditLog.record({
    req, action: 'waec.exported', entityType: 'Class', entityId: classRow.id, description: `Exported ${students.length} WAEC/BECE candidate(s) for ${classRow.name} ${classRow.section || ''}`.trim(),
  });

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="waec-candidates-${classRow.name}.csv"`.replace(/\s+/g, '-'));
  res.send(csv);
});

module.exports = {
  list, getById, getMe, getMyChildren, create, update, remove, uploadPhoto, downloadIdCardsPdf, previewWaecExport, downloadWaecExport, getTeacherClassIds,
};
