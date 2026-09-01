const bcrypt = require('bcryptjs');
const {
  mongoose, Teacher, User, Class, Subject, TeacherSubjectAssignment,
} = require('../models');
const AppError = require('../utils/AppError');
const { generateTempPassword } = require('../utils/password');

// Creates the full account for a new teacher -- User + Teacher + optional
// homeroom assignment + optional subject assignments, in one transaction.
// Shared by the single "New Teacher" form (teachers.controller.js) and the
// CSV bulk-import path (bulkImport.service.js) so there's exactly one place
// this logic lives, same pattern as studentEnrollment.service.js.
//
// `password` is optional -- omit it (the normal single-teacher-form path)
// for an auto-generated temp password; the bulk importer passes an explicit
// one through when the source data specifies a shared password.
const createTeacherAccount = async ({
  email, staffNo, firstName, lastName, gender, phone, hireDate, qualification,
  homeroomClassId, subjectAssignments, password,
}) => {
  const existing = await User.findOne({ email });
  if (existing) throw new AppError('A user with this email already exists', 400);

  // De-dupe (classId, subjectId) pairs before anything else touches the DB —
  // the TeacherSubjectAssignment unique index only applies when
  // academicTermId is a real ObjectId, so a null-term duplicate (what every
  // assignment made here uses) wouldn't be caught by the DB itself.
  const seenPairs = new Set();
  const uniqueAssignments = (Array.isArray(subjectAssignments) ? subjectAssignments : []).filter((a) => {
    const key = `${a.classId}:${a.subjectId}`;
    if (seenPairs.has(key)) return false;
    seenPairs.add(key);
    return true;
  });

  // Validate referenced classes/subjects up front so a bad id fails fast
  // with a clear error instead of aborting mid-transaction.
  if (homeroomClassId && !(await Class.findById(homeroomClassId))) {
    throw new AppError('Homeroom class not found', 400);
  }
  if (uniqueAssignments.length > 0) {
    const classIds = [...new Set(uniqueAssignments.map((a) => a.classId))];
    const subjectIds = [...new Set(uniqueAssignments.map((a) => a.subjectId))];
    const [classCount, subjectCount] = await Promise.all([
      Class.countDocuments({ _id: { $in: classIds } }),
      Subject.countDocuments({ _id: { $in: subjectIds } }),
    ]);
    if (classCount !== classIds.length || subjectCount !== subjectIds.length) {
      throw new AppError('One or more assigned classes/subjects were not found', 400);
    }
  }

  const tempPassword = password || generateTempPassword();
  const passwordHash = await bcrypt.hash(tempPassword, 10);

  const session = await mongoose.startSession();
  let teacher;
  let user;
  try {
    await session.withTransaction(async () => {
      [user] = await User.create([{
        email,
        passwordHash,
        fullName: `${firstName} ${lastName}`,
        role: 'teacher',
        status: 'active',
      }], { session });

      [teacher] = await Teacher.create([{
        userId: user.id,
        staffNo,
        firstName,
        lastName,
        gender: gender || null,
        phone: phone || null,
        hireDate: hireDate || null,
        qualification: qualification || null,
        status: 'active',
      }], { session });

      if (homeroomClassId) {
        await Class.updateOne({ _id: homeroomClassId }, { $set: { classTeacherId: teacher._id } }, { session });
      }
      if (uniqueAssignments.length > 0) {
        await TeacherSubjectAssignment.insertMany(
          uniqueAssignments.map((a) => ({
            teacherId: teacher._id, classId: a.classId, subjectId: a.subjectId, academicTermId: null,
          })),
          { session },
        );
      }
    });
  } finally {
    await session.endSession();
  }

  return {
    teacher, user, tempPassword, homeroomAssigned: !!homeroomClassId, assignmentCount: uniqueAssignments.length,
  };
};

module.exports = { createTeacherAccount };
