const bcrypt = require('bcryptjs');
const {
  School, User, SchoolSettings, Student, Teacher,
} = require('../models');
const asyncHandler = require('../middleware/asyncHandler');
const AppError = require('../utils/AppError');
const { runWithSchool } = require('../middleware/tenantContext');
const { findOrCreate } = require('../utils/findOrCreate');
const { recordSuperAdmin } = require('../services/auditLog.service');
const { sendVerificationEmail } = require('../services/emailVerification.service');
const { sendWelcomeEmail } = require('../services/welcomeEmail.service');
const { seedSchoolDefaults } = require('../services/schoolOnboarding.service');
const { generateTempPassword } = require('../utils/password');

const getStats = async (schoolId) => runWithSchool(schoolId, async () => {
  const [studentCount, teacherCount, adminCount] = await Promise.all([
    Student.countDocuments({ status: 'active' }),
    Teacher.countDocuments({ status: 'active' }),
    User.countDocuments({ role: 'admin' }),
  ]);
  return { studentCount, teacherCount, adminCount };
});

const list = asyncHandler(async (req, res) => {
  const schools = await School.find().sort({ createdAt: -1 });
  const withStats = await Promise.all(schools.map(async (school) => ({
    ...school.toJSON(),
    stats: await getStats(school.id),
  })));
  res.json({ success: true, data: withStats });
});

const create = asyncHandler(async (req, res, next) => {
  const { name, slug, curriculumTemplate } = req.body;
  const existing = await School.findOne({ slug });
  if (existing) return next(new AppError('A school with this slug already exists', 400));

  const school = await School.create({ name, slug, status: 'active' });
  // Seed the new school's settings doc up front so its report cards/receipts
  // have a branded name from the start instead of the usual blank default.
  await runWithSchool(school._id, () => findOrCreate(SchoolSettings, {
    where: { schoolId: school._id },
    defaults: { name },
  }));

  const seeded = await seedSchoolDefaults(school._id, curriculumTemplate || 'full_basic');

  await recordSuperAdmin({
    req,
    action: 'school.create',
    entityType: 'School',
    entityId: school.id,
    description: `Created school: ${school.name} (seeded ${seeded.classesCreated} classes, ${seeded.subjectsCreated} subjects)`,
    schoolId: school.id,
  });

  res.status(201).json({ success: true, data: { ...school.toJSON(), seeded } });
});

const update = asyncHandler(async (req, res, next) => {
  const school = await School.findById(req.params.id);
  if (!school) return next(new AppError('School not found', 404));

  const { name, status } = req.body;
  const previousStatus = school.status;
  school.name = name ?? school.name;
  school.status = status ?? school.status;
  await school.save();

  if (status && status !== previousStatus) {
    await recordSuperAdmin({
      req,
      action: 'school.statusChange',
      entityType: 'School',
      entityId: school.id,
      description: `Changed status of ${school.name} from ${previousStatus} to ${status}`,
      schoolId: school.id,
    });
  }

  res.json({ success: true, data: school });
});

// POST /super-admin/schools/:id/admin — bootstraps the first tenant admin
// user for a school. Without this a newly created School has no way to log in.
// The password is generated server-side (not typed by the operator) and the
// account is flagged mustChangePassword so the temp value never persists.
const createAdmin = asyncHandler(async (req, res, next) => {
  const school = await School.findById(req.params.id);
  if (!school) return next(new AppError('School not found', 404));

  const { email, fullName } = req.body;
  const tempPassword = generateTempPassword();

  const admin = await runWithSchool(school._id, async () => {
    const existing = await User.findOne({ email });
    if (existing) return null;
    const passwordHash = await bcrypt.hash(tempPassword, 10);
    return User.create({
      email, passwordHash, fullName, role: 'admin', status: 'active', mustChangePassword: true,
    });
  });

  if (!admin) return next(new AppError('A user with this email already exists at this school', 400));

  await sendVerificationEmail(admin, school);
  await sendWelcomeEmail(admin, school, tempPassword);

  await recordSuperAdmin({
    req, action: 'school.createAdmin', entityType: 'School', entityId: school.id, description: `Created admin account (${admin.email}) for ${school.name}`, schoolId: school.id,
  });

  res.status(201).json({
    success: true, data: {
      id: admin.id, email: admin.email, fullName: admin.fullName, tempPassword,
    },
  });
});

// POST /super-admin/schools/:id/logo — multipart, req.file populated by the
// uploadLogo multer middleware before this handler runs.
const uploadLogo = asyncHandler(async (req, res, next) => {
  const school = await School.findById(req.params.id);
  if (!school) return next(new AppError('School not found', 404));
  if (!req.file) return next(new AppError('A logo file is required', 400));

  // Absolute URL so the client never has to guess the API host, and so it
  // can be re-fetched and base64-embedded into PDFs later regardless of
  // which origin generated the URL.
  const logoUrl = `${req.protocol}://${req.get('host')}/uploads/logos/${req.file.filename}`;

  await runWithSchool(school._id, () => SchoolSettings.findOneAndUpdate(
    { schoolId: school._id },
    { $set: { logoUrl } },
    { upsert: true },
  ));

  await recordSuperAdmin({
    req, action: 'school.logoUpload', entityType: 'School', entityId: school.id, description: `Uploaded a logo for ${school.name}`, schoolId: school.id,
  });

  res.json({ success: true, data: { logoUrl } });
});

// PUT /super-admin/schools/:id/branding { motto, primaryColor, secondaryColor }
const updateBranding = asyncHandler(async (req, res, next) => {
  const school = await School.findById(req.params.id);
  if (!school) return next(new AppError('School not found', 404));

  const { motto, primaryColor, secondaryColor } = req.body;
  const settings = await runWithSchool(school._id, () => SchoolSettings.findOneAndUpdate(
    { schoolId: school._id },
    { $set: {
      motto: motto ?? '',
      primaryColor: primaryColor || null,
      secondaryColor: secondaryColor || null,
    } },
    { upsert: true, new: true },
  ));

  res.json({ success: true, data: settings });
});

module.exports = {
  list, create, update, createAdmin, uploadLogo, updateBranding, getStats,
};
