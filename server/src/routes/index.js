const express = require('express');
const authRoutes = require('./auth.routes');
const termsRoutes = require('./terms.routes');
const classesRoutes = require('./classes.routes');
const subjectsRoutes = require('./subjects.routes');
const teachersRoutes = require('./teachers.routes');
const studentsRoutes = require('./students.routes');
const attendanceRoutes = require('./attendance.routes');
const resultsRoutes = require('./results.routes');
const feesRoutes = require('./fees.routes');
const dashboardRoutes = require('./dashboard.routes');
const reportsRoutes = require('./reports.routes');
const assignmentsRoutes = require('./assignments.routes');
const housesRoutes = require('./houses.routes');
const guardiansRoutes = require('./guardians.routes');
const feeStructuresRoutes = require('./feeStructures.routes');
const terminalReportsRoutes = require('./terminalReports.routes');
const announcementsRoutes = require('./announcements.routes');
const schoolSettingsRoutes = require('./schoolSettings.routes');

const router = express.Router();

router.get('/health', (req, res) => {
  res.json({ success: true, data: { status: 'ok', timestamp: new Date().toISOString() } });
});

router.use('/auth', authRoutes);
router.use('/terms', termsRoutes);
router.use('/classes', classesRoutes);
router.use('/subjects', subjectsRoutes);
router.use('/teachers', teachersRoutes);
router.use('/students', studentsRoutes);
router.use('/attendance', attendanceRoutes);
router.use('/results', resultsRoutes);
router.use('/fees', feesRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/reports', reportsRoutes);
router.use('/assignments', assignmentsRoutes);
router.use('/houses', housesRoutes);
router.use('/guardians', guardiansRoutes);
router.use('/fee-structures', feeStructuresRoutes);
router.use('/terminal-reports', terminalReportsRoutes);
router.use('/announcements', announcementsRoutes);
router.use('/school-settings', schoolSettingsRoutes);

module.exports = router;
