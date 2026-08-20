const {
  Class, Subject, AcademicTerm, ClassSubject, TeacherSubjectAssignment, Student, Result, SchoolSettings,
} = require('../models');
const asyncHandler = require('../middleware/asyncHandler');
const AppError = require('../utils/AppError');
const { getTeacherClassIds } = require('../services/teacherScope.service');
const { findOrCreate } = require('../utils/findOrCreate');
const { renderHtmlToPdfBuffer } = require('../services/pdf.service');
const { buildAssessmentSheetsPdfHtml } = require('../services/assessmentSheetTemplate.service');
const auditLog = require('../services/auditLog.service');

const assertClassAccess = async (req, classId) => {
  if (req.user.role === 'admin') return;
  if (req.user.role === 'teacher') {
    const { classIds } = await getTeacherClassIds(req.user.id);
    if (!classIds.includes(String(classId))) {
      throw new AppError('You are not assigned to this class', 403);
    }
    return;
  }
  throw new AppError('You do not have permission to perform this action', 403);
};

const footerTemplate = `
  <div style="width:100%; font-size:9px; text-align:center; color:#777; padding: 0 20px;">
    Page <span class="pageNumber"></span> of <span class="totalPages"></span>
  </div>
`;

// GET /assessment-sheets/subjects?classId=&academicTermId= — every subject
// assigned to the class this term, its assigned teacher, and how many of the
// roster already have a recorded score (so "View Entry Status" needs no new
// tracking model — it's just a read against Result/roster counts).
const listSubjectsForClass = asyncHandler(async (req, res, next) => {
  const { classId, academicTermId } = req.query;
  if (!classId || !academicTermId) return next(new AppError('classId and academicTermId are required', 400));
  await assertClassAccess(req, classId);

  const [classSubjects, assignments, rosterCount] = await Promise.all([
    ClassSubject.find({ classId }).populate('subject', 'name'),
    TeacherSubjectAssignment.find({ classId }).populate('teacher', 'firstName lastName'),
    Student.countDocuments({ classId, status: 'active' }),
  ]);

  const teacherBySubject = new Map(assignments.map((a) => [a.subjectId.toString(), a.teacher]));

  const data = await Promise.all(classSubjects.map(async (cs) => {
    const enteredCount = await Result.countDocuments({
      classId, subjectId: cs.subjectId, academicTermId, classScore: { $ne: null }, examScore: { $ne: null },
    });
    const teacher = teacherBySubject.get(cs.subjectId.toString());
    let entryStatus = 'Not started';
    if (enteredCount > 0 && enteredCount < rosterCount) entryStatus = 'In progress';
    if (rosterCount > 0 && enteredCount >= rosterCount) entryStatus = 'Complete';
    return {
      subjectId: cs.subjectId,
      subjectName: cs.subject?.name || 'Unknown',
      teacherName: teacher ? `${teacher.firstName} ${teacher.lastName}` : null,
      rosterCount,
      enteredCount,
      entryStatus,
    };
  }));

  res.json({ success: true, data });
});

// GET /assessment-sheets/single/pdf?classId=&subjectId=&academicTermId=&mode=prefilled|blank
const downloadSingle = asyncHandler(async (req, res, next) => {
  const { classId, subjectId, academicTermId } = req.query;
  const mode = req.query.mode === 'blank' ? 'blank' : 'prefilled';
  if (!classId || !subjectId || !academicTermId) return next(new AppError('classId, subjectId, and academicTermId are required', 400));
  await assertClassAccess(req, classId);

  const [classRow, subject, term, students] = await Promise.all([
    Class.findById(classId),
    Subject.findById(subjectId),
    AcademicTerm.findById(academicTermId),
    Student.find({ classId, status: 'active' }).sort({ firstName: 1, lastName: 1 }),
  ]);
  if (!classRow || !subject || !term) return next(new AppError('Class, subject, or term not found', 404));

  const [assignment] = await TeacherSubjectAssignment.find({ classId, subjectId }).populate('teacher', 'firstName lastName').limit(1);
  const [settings] = await findOrCreate(SchoolSettings, { where: { schoolId: req.user.schoolId } });

  const html = buildAssessmentSheetsPdfHtml([{
    school: settings,
    term,
    classRow,
    subject,
    teacherName: assignment?.teacher ? `${assignment.teacher.firstName} ${assignment.teacher.lastName}` : null,
    students,
    mode,
  }]);

  const pdfBuffer = await renderHtmlToPdfBuffer(html, {
    format: 'A4', landscape: true, displayHeaderFooter: true, footerTemplate,
  });

  await auditLog.record({
    req, action: 'assessmentSheet.generate', entityType: 'AssessmentSheet', entityId: subject.id, description: `Printed assessment sheet: ${classRow.name} ${classRow.section || ''} — ${subject.name} (${term.name})`,
  });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="score-sheet-${classRow.name}-${subject.name}.pdf"`.replace(/\s+/g, '-'));
  res.send(pdfBuffer);
});

// GET /assessment-sheets/bulk/pdf?classId=&academicTermId=&mode=prefilled|blank
const downloadBulk = asyncHandler(async (req, res, next) => {
  const { classId, academicTermId } = req.query;
  const mode = req.query.mode === 'blank' ? 'blank' : 'prefilled';
  if (!classId || !academicTermId) return next(new AppError('classId and academicTermId are required', 400));
  await assertClassAccess(req, classId);

  const [classRow, term, students, classSubjects, assignments, settings] = await Promise.all([
    Class.findById(classId),
    AcademicTerm.findById(academicTermId),
    Student.find({ classId, status: 'active' }).sort({ firstName: 1, lastName: 1 }),
    ClassSubject.find({ classId }).populate('subject', 'name').sort({ createdAt: 1 }),
    TeacherSubjectAssignment.find({ classId }).populate('teacher', 'firstName lastName'),
    findOrCreate(SchoolSettings, { where: { schoolId: req.user.schoolId } }),
  ]);
  if (!classRow || !term) return next(new AppError('Class or term not found', 404));
  if (classSubjects.length === 0) return next(new AppError('No subjects are assigned to this class yet', 400));

  const teacherBySubject = new Map(assignments.map((a) => [a.subjectId.toString(), a.teacher]));

  const sheets = classSubjects.map((cs) => {
    const teacher = teacherBySubject.get(cs.subjectId.toString());
    return {
      school: settings[0],
      term,
      classRow,
      subject: cs.subject,
      teacherName: teacher ? `${teacher.firstName} ${teacher.lastName}` : null,
      students,
      mode,
    };
  });

  const html = buildAssessmentSheetsPdfHtml(sheets);
  const pdfBuffer = await renderHtmlToPdfBuffer(html, {
    format: 'A4', landscape: true, displayHeaderFooter: true, footerTemplate,
  });

  await auditLog.record({
    req, action: 'assessmentSheet.generateBulk', entityType: 'AssessmentSheet', description: `Printed all ${classSubjects.length} subject score sheets for ${classRow.name} ${classRow.section || ''} (${term.name})`,
  });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="score-sheets-${classRow.name}-all-subjects.pdf"`.replace(/\s+/g, '-'));
  res.send(pdfBuffer);
});

module.exports = { listSubjectsForClass, downloadSingle, downloadBulk };
