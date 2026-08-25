const { Attendance } = require('../models');
const { LOW_ATTENDANCE_THRESHOLD_PERCENT, MIN_ATTENDANCE_RECORDS } = require('./earlyWarning.service');

const isPresentLike = (status) => status === 'Present' || status === 'Late';

// Aggregate attendance-health summary — overall %, a month-by-month trend,
// and a chronic-absenteeism list. The absenteeism threshold/min-records are
// imported (not redefined) from earlyWarning.service.js so a student who
// appears here matches the one already flagged on the At-Risk Students view
// — one definition of "chronic", not two that can silently drift apart.
const buildAttendanceSummary = async ({ classId, academicTermId } = {}) => {
  const where = {};
  if (classId) where.classId = classId;
  if (academicTermId) where.academicTermId = academicTermId;

  const records = await Attendance.find(where)
    .populate('student', 'firstName lastName admissionNo')
    .populate('class', 'name section');

  const totalRecords = records.length;
  const presentCount = records.filter((r) => isPresentLike(r.status)).length;
  const overallPercent = totalRecords > 0 ? Math.round((presentCount / totalRecords) * 1000) / 10 : null;

  const monthMap = new Map();
  records.forEach((r) => {
    const month = r.attendanceDate.slice(0, 7);
    const row = monthMap.get(month) || { month, present: 0, total: 0 };
    row.total += 1;
    if (isPresentLike(r.status)) row.present += 1;
    monthMap.set(month, row);
  });
  const monthlyTrend = [...monthMap.values()]
    .map((m) => ({ ...m, percent: Math.round((m.present / m.total) * 1000) / 10 }))
    .sort((a, b) => a.month.localeCompare(b.month));

  const studentMap = new Map();
  records.forEach((r) => {
    const key = r.studentId.toString();
    const row = studentMap.get(key) || {
      studentId: key,
      name: r.student ? `${r.student.firstName} ${r.student.lastName}` : 'Unknown',
      admissionNo: r.student?.admissionNo || null,
      className: r.class ? `${r.class.name} ${r.class.section || ''}`.trim() : '',
      present: 0,
      total: 0,
    };
    row.total += 1;
    if (isPresentLike(r.status)) row.present += 1;
    studentMap.set(key, row);
  });
  const chronicAbsentees = [...studentMap.values()]
    .filter((s) => s.total >= MIN_ATTENDANCE_RECORDS)
    .map((s) => ({ ...s, percent: Math.round((s.present / s.total) * 1000) / 10 }))
    .filter((s) => s.percent < LOW_ATTENDANCE_THRESHOLD_PERCENT)
    .sort((a, b) => a.percent - b.percent);

  return {
    totalRecords, overallPercent, monthlyTrend, chronicAbsentees,
  };
};

module.exports = { buildAttendanceSummary };
