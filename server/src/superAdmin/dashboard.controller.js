const { School, User } = require('../models');
const asyncHandler = require('../middleware/asyncHandler');
const { listBackups } = require('../services/backup.service');
const { getStats } = require('./schools.controller');

// GET /super-admin/dashboard
const get = asyncHandler(async (req, res) => {
  const schools = await School.find().sort({ createdAt: -1 });

  const [totalSchools, activeSchools, suspendedSchools, totalUsers] = await Promise.all([
    School.countDocuments(),
    School.countDocuments({ status: 'active' }),
    School.countDocuments({ status: 'suspended' }),
    User.countDocuments({}).setOptions({ skipTenantScope: true }),
  ]);

  const withStats = await Promise.all(schools.map(async (school) => ({
    id: school.id, name: school.name, slug: school.slug, status: school.status, stats: await getStats(school.id),
  })));

  const schoolsNeedingAdmin = withStats.filter((s) => s.stats.adminCount === 0);
  const recentSchools = withStats.slice(0, 5);

  const backups = await listBackups();
  const lastBackup = backups[0] || null;

  res.json({
    success: true,
    data: {
      totalSchools,
      activeSchools,
      suspendedSchools,
      totalUsers,
      schoolsNeedingAdmin: schoolsNeedingAdmin.map((s) => ({ id: s.id, name: s.name, slug: s.slug })),
      recentSchools,
      lastBackup,
    },
  });
});

module.exports = { get };
