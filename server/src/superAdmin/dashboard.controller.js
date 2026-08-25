const {
  School, User, AcademicTerm, TerminalReport, mongoose,
} = require('../models');
const asyncHandler = require('../middleware/asyncHandler');
const { runWithSchool } = require('../middleware/tenantContext');
const { listBackups } = require('../services/backup.service');
const { getStats } = require('./schools.controller');

// Result-completion progress for one school's current term: what fraction of
// its terminal reports have been locked (the school-level "term report
// approval" metric already surfaced on the tenant dashboard), rolled up here
// so a school with no current term (or no reports yet) simply contributes
// nothing rather than skewing the platform-wide percentage.
const getResultCompletion = async (schoolId) => runWithSchool(schoolId, async () => {
  const currentTerm = await AcademicTerm.findOne({ isCurrent: true }, { _id: 1 });
  if (!currentTerm) return { locked: 0, total: 0 };
  const [locked, total] = await Promise.all([
    TerminalReport.countDocuments({ academicTermId: currentTerm.id, status: 'Locked' }),
    TerminalReport.countDocuments({ academicTermId: currentTerm.id }),
  ]);
  return { locked, total };
});

// GET /super-admin/dashboard
const get = asyncHandler(async (req, res) => {
  const schools = await School.find().sort({ createdAt: -1 });

  const [totalSchools, activeSchools, suspendedSchools, pendingSchools, totalUsers, totalTerminalReports] = await Promise.all([
    School.countDocuments(),
    School.countDocuments({ status: 'active' }),
    School.countDocuments({ status: 'suspended' }),
    School.countDocuments({ status: 'pending' }),
    User.countDocuments({}).setOptions({ skipTenantScope: true }),
    TerminalReport.countDocuments({}).setOptions({ skipTenantScope: true }),
  ]);

  const withStats = await Promise.all(schools.map(async (school) => ({
    id: school.id, name: school.name, slug: school.slug, status: school.status, stats: await getStats(school.id),
  })));

  const schoolsNeedingAdmin = withStats.filter((s) => s.status === 'active' && s.stats.adminCount === 0);
  const schoolsPendingApproval = withStats.filter((s) => s.status === 'pending');
  const recentSchools = withStats.slice(0, 5);

  const totalActiveStudents = withStats.reduce((sum, s) => sum + s.stats.studentCount, 0);
  const totalActiveTeachers = withStats.reduce((sum, s) => sum + s.stats.teacherCount, 0);

  const activeSchoolIds = withStats.filter((s) => s.status === 'active').map((s) => s.id);
  const completionRows = await Promise.all(activeSchoolIds.map(getResultCompletion));
  const resultCompletion = completionRows.reduce(
    (acc, row) => ({ locked: acc.locked + row.locked, total: acc.total + row.total }),
    { locked: 0, total: 0 },
  );
  const resultCompletionPercent = resultCompletion.total > 0
    ? Math.round((resultCompletion.locked / resultCompletion.total) * 1000) / 10
    : null;

  const dbStats = await mongoose.connection.db.stats();

  const backups = await listBackups();
  const lastBackup = backups[0] || null;

  res.json({
    success: true,
    data: {
      totalSchools,
      activeSchools,
      suspendedSchools,
      pendingSchools,
      totalUsers,
      totalActiveStudents,
      totalActiveTeachers,
      totalTerminalReports,
      resultCompletionPercent,
      storage: {
        dataSizeBytes: dbStats.dataSize,
        storageSizeBytes: dbStats.storageSize,
        indexSizeBytes: dbStats.indexSize,
      },
      schoolsNeedingAdmin: schoolsNeedingAdmin.map((s) => ({ id: s.id, name: s.name, slug: s.slug })),
      schoolsPendingApproval: schoolsPendingApproval.map((s) => ({ id: s.id, name: s.name, slug: s.slug })),
      recentSchools,
      lastBackup,
    },
  });
});

module.exports = { get };
