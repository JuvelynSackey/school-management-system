const bcrypt = require('bcryptjs');
const models = require('../models');
const {
  mongoose, Student, User, Guardian, StudentGuardian, StudentSafetyNote,
} = models;
const asyncHandler = require('../middleware/asyncHandler');
const AppError = require('../utils/AppError');
const { generateTempPassword } = require('../utils/password');
const { findOrCreate } = require('../utils/findOrCreate');
const { deleteWithCascade } = require('../services/cascadeDelete.service');
const { getTeacherClassIds: getTeacherClassIdsShared } = require('../services/teacherScope.service');

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

  res.json({ success: true, data: await attachGuardians(student) });
});

const getMe = asyncHandler(async (req, res, next) => {
  const student = await populateFull(Student.findOne({ userId: req.user.id }));
  if (!student) return next(new AppError('Student profile not found', 404));
  res.json({ success: true, data: await attachGuardians(student) });
});

const create = asyncHandler(async (req, res, next) => {
  const {
    email, admissionNo, firstName, lastName, gender, dateOfBirth, classId, houseId,
    address, admissionDate, guardians, safetyNotes,
  } = req.body;

  const existing = await User.findOne({ email });
  if (existing) return next(new AppError('A user with this email already exists', 400));

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

  const full = await populateFull(Student.findById(student.id));

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
    address, admissionDate, status, guardians, safetyNotes,
  } = req.body;

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
      student.status = status ?? student.status;
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

  const full = await populateFull(Student.findById(student.id));
  res.json({ success: true, data: await attachGuardians(full) });
});

const remove = asyncHandler(async (req, res, next) => {
  const student = await Student.findById(req.params.id);
  if (!student) return next(new AppError('Student not found', 404));
  await deleteWithCascade(models, User, student.userId); // cascades to the student profile too
  res.json({ success: true, data: null });
});

module.exports = { list, getById, getMe, create, update, remove, getTeacherClassIds };
