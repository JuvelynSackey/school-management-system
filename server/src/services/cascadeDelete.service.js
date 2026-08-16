const mongoose = require('mongoose');

// Mirrors every ON DELETE CASCADE / ON DELETE SET NULL foreign key that used
// to live in schema.sql. Keyed by model name; each entry names the child
// model/field it governs and whether removing the parent should delete the
// child row(s) ('cascade') or null out the reference ('setNull').
const rules = {
  User: [
    { model: 'Teacher', field: 'userId', action: 'cascade' },
    { model: 'Student', field: 'userId', action: 'cascade' },
    { model: 'Attendance', field: 'recordedBy', action: 'setNull' },
    { model: 'Payment', field: 'receivedBy', action: 'setNull' },
    { model: 'Announcement', field: 'createdBy', action: 'setNull' },
  ],
  Teacher: [
    { model: 'Class', field: 'classTeacherId', action: 'setNull' },
    { model: 'TeacherSubjectAssignment', field: 'teacherId', action: 'cascade' },
    { model: 'Result', field: 'recordedBy', action: 'setNull' },
  ],
  Student: [
    { model: 'StudentGuardian', field: 'studentId', action: 'cascade' },
    { model: 'StudentSafetyNote', field: 'studentId', action: 'cascade' },
    { model: 'Attendance', field: 'studentId', action: 'cascade' },
    { model: 'Result', field: 'studentId', action: 'cascade' },
    { model: 'TerminalReport', field: 'studentId', action: 'cascade' },
    { model: 'Fee', field: 'studentId', action: 'cascade' },
    { model: 'Announcement', field: 'targetStudentId', action: 'cascade' },
  ],
  Class: [
    { model: 'Student', field: 'classId', action: 'setNull' },
    { model: 'ClassSubject', field: 'classId', action: 'cascade' },
    { model: 'TeacherSubjectAssignment', field: 'classId', action: 'cascade' },
    { model: 'Attendance', field: 'classId', action: 'cascade' },
    { model: 'Result', field: 'classId', action: 'cascade' },
    { model: 'TerminalReport', field: 'classId', action: 'cascade' },
    { model: 'Announcement', field: 'targetClassId', action: 'cascade' },
  ],
  House: [
    { model: 'Student', field: 'houseId', action: 'setNull' },
  ],
  Guardian: [
    { model: 'StudentGuardian', field: 'guardianId', action: 'cascade' },
  ],
  Subject: [
    { model: 'ClassSubject', field: 'subjectId', action: 'cascade' },
    { model: 'TeacherSubjectAssignment', field: 'subjectId', action: 'cascade' },
    { model: 'Result', field: 'subjectId', action: 'cascade' },
  ],
  AcademicTerm: [
    { model: 'ClassSubject', field: 'academicTermId', action: 'cascade' },
    { model: 'TeacherSubjectAssignment', field: 'academicTermId', action: 'cascade' },
    { model: 'Attendance', field: 'academicTermId', action: 'setNull' },
    { model: 'Result', field: 'academicTermId', action: 'cascade' },
    { model: 'TerminalReport', field: 'academicTermId', action: 'cascade' },
    { model: 'FeeStructure', field: 'academicTermId', action: 'setNull' },
    { model: 'Fee', field: 'academicTermId', action: 'setNull' },
  ],
  FeeStructure: [
    { model: 'Fee', field: 'feeStructureId', action: 'setNull' },
  ],
  Fee: [
    { model: 'Payment', field: 'feeId', action: 'cascade' },
  ],
};

// Recursively applies `rules[modelName]` to every id in `ids`, chaining into
// grandchildren before the child rows themselves are deleted (matches
// InnoDB's multi-level cascade behavior for a single DELETE).
const cascadeStep = async (models, modelName, ids, session) => {
  const rule = rules[modelName];
  if (!rule || ids.length === 0) return;

  for (const r of rule) {
    const ChildModel = models[r.model];
    if (r.action === 'setNull') {
      await ChildModel.updateMany(
        { [r.field]: { $in: ids } },
        { $set: { [r.field]: null } },
        { session },
      );
    } else {
      const children = await ChildModel.find({ [r.field]: { $in: ids } }, { _id: 1 }).session(session);
      const childIds = children.map((c) => c._id);
      if (childIds.length === 0) continue; // eslint-disable-line no-continue
      await cascadeStep(models, r.model, childIds, session);
      await ChildModel.deleteMany({ _id: { $in: childIds } }, { session });
    }
  }
};

// Deletes `id` from `Model`, cascading/nulling every dependent collection
// exactly as the old MySQL foreign keys did, all inside one transaction.
const deleteWithCascade = async (models, Model, id) => {
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      await cascadeStep(models, Model.modelName, [id], session);
      await Model.deleteOne({ _id: id }, { session });
    });
  } finally {
    await session.endSession();
  }
};

module.exports = { deleteWithCascade };
