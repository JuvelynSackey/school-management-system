const bcrypt = require('bcryptjs');
const { mongoose, Student, User, Guardian, StudentGuardian, StudentSafetyNote } = require('../models');
const { generateTempPassword } = require('../utils/password');
const { findOrCreate } = require('../utils/findOrCreate');

// Links (or creates) guardians for a student. Re-using a phone number always
// links to the same guardian record — this is what makes siblings share one
// contact instead of creating a duplicate guardian per child.
const linkGuardians = async (studentId, guardians, session) => {
  await StudentGuardian.deleteMany({ studentId }, { session });

  for (const g of guardians) {
    if (!g.phone) continue; // eslint-disable-line no-continue
    const [guardian] = await findOrCreate(Guardian, {
      where: { phone: g.phone },
      defaults: {
        fullName: g.fullName || g.phone,
        email: g.email || null,
        relationship: g.relationship || null,
      },
      session,
    });
    await StudentGuardian.create([{
      studentId,
      guardianId: guardian.id,
      contactPriority: g.contactPriority || 'primary',
      isPickupAuthorized: g.isPickupAuthorized ?? true,
    }], { session });
  }
};

const replaceSafetyNotes = async (studentId, notes, session) => {
  await StudentSafetyNote.deleteMany({ studentId }, { session });
  if (notes.length) {
    await StudentSafetyNote.insertMany(
      notes.filter((n) => n.note).map((n) => ({ studentId, type: n.type || 'other', note: n.note })),
      { session },
    );
  }
};

// Creates the full account for a new student — User + Student + guardians +
// safety notes, in one transaction, with a generated temp password. Shared
// by the "New Student" form (students.controller.js) and the admissions
// "Enroll" action (admissions.controller.js) so there's exactly one place
// this logic lives. Caller is responsible for existence/uniqueness checks
// (email, classId, houseId) before calling this.
const createStudentAccount = async ({
  email, admissionNo, firstName, lastName, gender, dateOfBirth, classId, houseId,
  address, admissionDate, category, programme, guardians, safetyNotes,
}) => {
  const tempPassword = generateTempPassword();
  const passwordHash = await bcrypt.hash(tempPassword, 10);

  const session = await mongoose.startSession();
  let student;
  try {
    await session.withTransaction(async () => {
      const [user] = await User.create([{
        email,
        passwordHash,
        fullName: `${firstName} ${lastName}`,
        role: 'student',
        status: 'active',
      }], { session });

      [student] = await Student.create([{
        userId: user.id,
        admissionNo,
        firstName,
        lastName,
        gender: gender || null,
        dateOfBirth: dateOfBirth || null,
        classId: classId || null,
        houseId: houseId || null,
        address: address || null,
        admissionDate: admissionDate || null,
        category: category || null,
        programme: programme || null,
        status: 'active',
      }], { session });

      if (Array.isArray(guardians) && guardians.length) {
        await linkGuardians(student.id, guardians, session);
      }
      if (Array.isArray(safetyNotes) && safetyNotes.length) {
        await replaceSafetyNotes(student.id, safetyNotes, session);
      }
    });
  } finally {
    await session.endSession();
  }

  return { student, tempPassword };
};

module.exports = { createStudentAccount, linkGuardians, replaceSafetyNotes };
