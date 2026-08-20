const bcrypt = require('bcryptjs');
const models = require('../models');
const { mongoose, Teacher, User } = models;
const asyncHandler = require('../middleware/asyncHandler');
const AppError = require('../utils/AppError');
const { generateTempPassword } = require('../utils/password');
const { deleteWithCascade } = require('../services/cascadeDelete.service');
const auditLog = require('../services/auditLog.service');

const list = asyncHandler(async (req, res) => {
  const teachers = await Teacher.find().populate('user', 'email status').sort({ firstName: 1 });
  res.json({ success: true, data: teachers });
});

const getById = asyncHandler(async (req, res, next) => {
  const teacher = await Teacher.findById(req.params.id).populate('user', 'email status');
  if (!teacher) return next(new AppError('Teacher not found', 404));
  res.json({ success: true, data: teacher });
});

const create = asyncHandler(async (req, res, next) => {
  const { email, staffNo, firstName, lastName, gender, phone, hireDate, qualification } = req.body;

  const existing = await User.findOne({ email });
  if (existing) return next(new AppError('A user with this email already exists', 400));

  const tempPassword = generateTempPassword();
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
    });
  } finally {
    await session.endSession();
  }

  await auditLog.record({
    req, action: 'teacher.create', entityType: 'Teacher', entityId: teacher.id, description: `Created teacher: ${firstName} ${lastName} (${staffNo})`,
  });

  res.status(201).json({
    success: true,
    data: { ...teacher.toJSON(), user: { id: user.id, email: user.email }, tempPassword },
  });
});

const update = asyncHandler(async (req, res, next) => {
  const teacher = await Teacher.findById(req.params.id);
  if (!teacher) return next(new AppError('Teacher not found', 404));

  const { staffNo, firstName, lastName, gender, phone, hireDate, qualification, status } = req.body;
  const previousStatus = teacher.status;

  teacher.staffNo = staffNo ?? teacher.staffNo;
  teacher.firstName = firstName ?? teacher.firstName;
  teacher.lastName = lastName ?? teacher.lastName;
  teacher.gender = gender === undefined ? teacher.gender : gender;
  teacher.phone = phone === undefined ? teacher.phone : phone;
  teacher.hireDate = hireDate === undefined ? teacher.hireDate : hireDate;
  teacher.qualification = qualification === undefined ? teacher.qualification : qualification;
  teacher.status = status ?? teacher.status;
  await teacher.save();

  if (status) {
    await User.updateOne({ _id: teacher.userId }, { $set: { status: status === 'active' ? 'active' : 'inactive' } });
  }

  if (status && status !== previousStatus) {
    await auditLog.record({
      req,
      action: 'teacher.statusChange',
      entityType: 'Teacher',
      entityId: teacher.id,
      description: `Changed status of ${teacher.firstName} ${teacher.lastName} from ${previousStatus} to ${status}`,
    });
  }

  res.json({ success: true, data: teacher });
});

const remove = asyncHandler(async (req, res, next) => {
  const teacher = await Teacher.findById(req.params.id);
  if (!teacher) return next(new AppError('Teacher not found', 404));
  await auditLog.record({
    req, action: 'teacher.remove', entityType: 'Teacher', entityId: teacher.id, description: `Deleted teacher: ${teacher.firstName} ${teacher.lastName}`,
  });
  await deleteWithCascade(models, User, teacher.userId); // cascades to the teacher profile too
  res.json({ success: true, data: null });
});

module.exports = { list, getById, create, update, remove };
