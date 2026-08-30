const bcrypt = require('bcryptjs');
const { mongoose, Student, User, Guardian, StudentGuardian, StudentSafetyNote } = require('../models');
const { generatePin } = require('../utils/password');
const { findOrCreate } = require('../utils/findOrCreate');

// Links (or creates) guardians for a student. Re-using a phone number always
// links to the same guardian record — this is what makes siblings share one
// contact instead of creating a duplicate guardian per child.
//
// Whenever a guardian reaches this point with no portal login yet (brand
// new, or an existing contact nobody ever granted one), auto-provisions a
// parent login for them: phone + a generated PIN, same pattern as student
// accounts. This is skipped (not failed) if that phone number is already
// in use by some other account in the school — enrollment itself must
// never fail just because the auxiliary parent-login step hit a collision;
// an admin can resolve and grant a login manually afterward via
// guardians.controller.js's createLogin.
// Returns the PINs for any logins it just created, so the caller can show
// them to the admin once (they're hashed immediately after, never stored
// or shown again).
const linkGuardians = async (studentId, guardians, session) => {
  await StudentGuardian.deleteMany({ studentId }, { session });
  const provisionedLogins = [];

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

    if (!guardian.userId) {
      const phoneTaken = await User.findOne({ phone: guardian.phone }).session(session);
      if (!phoneTaken) {
        const pin = generatePin();
        const passwordHash = await bcrypt.hash(pin, 10);
        const [parentUser] = await User.create([{
          phone: guardian.phone, passwordHash, fullName: guardian.fullName, role: 'parent', status: 'active',
        }], { session });
        guardian.userId = parentUser.id;
        await guardian.save({ session });
        provisionedLogins.push({ guardianId: guardian.id, fullName: guardian.fullName, phone: guardian.phone, pin });
      }
    }

    await StudentGuardian.create([{
      studentId,
      guardianId: guardian.id,
      contactPriority: g.contactPriority || 'primary',
      isPickupAuthorized: g.isPickupAuthorized ?? true,
    }], { session });
  }

  return provisionedLogins;
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
// (email, classId) before calling this.
const createStudentAccount = async ({
  email, admissionNo, firstName, lastName, gender, dateOfBirth, classId,
  address, admissionDate, category, programme, guardians, safetyNotes,
}) => {
  // A short PIN, not the longer alphanumeric password every other role
  // gets -- a basic-school pupil is far more likely to actually be told
  // and remember "4821" than a generated "Kx7m-Qp2r".
  const tempPassword = generatePin();
  const passwordHash = await bcrypt.hash(tempPassword, 10);

  const session = await mongoose.startSession();
  let student;
  let provisionedLogins = [];
  try {
    await session.withTransaction(async () => {
      const [user] = await User.create([{
        email: email || null,
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
        address: address || null,
        admissionDate: admissionDate || null,
        category: category || null,
        programme: programme || null,
        status: 'active',
      }], { session });

      if (Array.isArray(guardians) && guardians.length) {
        provisionedLogins = await linkGuardians(student.id, guardians, session);
      }
      if (Array.isArray(safetyNotes) && safetyNotes.length) {
        await replaceSafetyNotes(student.id, safetyNotes, session);
      }
    });
  } finally {
    await session.endSession();
  }

  return { student, tempPassword, provisionedLogins };
};

module.exports = { createStudentAccount, linkGuardians, replaceSafetyNotes };
