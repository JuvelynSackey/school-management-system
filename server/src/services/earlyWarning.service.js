const { Attendance, Result } = require('../models');
const performanceInsights = require('./performanceInsights.service');

// Purely advisory and deterministic — see earlyWarning.controller.js for the
// full boundary rule. Fee arrears are deliberately NOT one of these flag
// types: a family owing fees says nothing about a specific child's academic
// risk, and treating debt as a risk signal would effectively flag poverty as
// a problem. It's attached separately, as context on an already-flagged
// student, never as a reason a student appears here at all.
const LOW_ATTENDANCE_THRESHOLD_PERCENT = 75;
const MIN_ATTENDANCE_RECORDS = 5; // too little data yet to mean anything
const FAILING_PERCENT_CUTOFF = 40; // matches the default NaCCA F9 band (grading.service.js's SCALE)
const MIN_FAILING_SUBJECTS = 2;

const detectAttendanceFlag = async (studentId, academicTermId) => {
  const records = await Attendance.find({ studentId, academicTermId }).select('status');
  if (records.length < MIN_ATTENDANCE_RECORDS) return null;

  const attended = records.filter((r) => r.status === 'Present' || r.status === 'Late').length;
  const percent = (attended / records.length) * 100;
  if (percent >= LOW_ATTENDANCE_THRESHOLD_PERCENT) return null;

  return {
    type: 'low_attendance',
    message: `Attended ${Math.round(percent)}% of recorded school days this term (${attended}/${records.length}).`,
    recommendation: 'Contact the parent/guardian to understand the cause and agree on a plan to improve attendance.',
  };
};

// Reuses the exact same multi-term trend calculation Performance Insights
// (Phase 3) already computes for a student's profile — one trend engine,
// not two slightly different copies of the same math.
const detectAcademicDeclineFlag = async (studentId, scheme) => {
  const results = await Result.find({ studentId })
    .populate('subject', 'name')
    .populate('academicTerm', 'name startDate');
  const { trend } = performanceInsights.computeInsights({ results, scheme });
  if (trend.direction !== 'declining') return null;

  return {
    type: 'academic_decline',
    message: `Downward trend across their last ${trend.termsCompared} terms (${trend.deltaPercent}% vs. the previous term).`,
    recommendation: 'Review recent test/exam scores with the student\'s subject teachers and consider a short check-in to identify what changed.',
  };
};

const detectFailingSubjectsFlag = async (studentId, academicTermId, scheme) => {
  const maxTotal = (scheme?.classScoreMax ?? 50) + (scheme?.examScoreMax ?? 50);
  if (maxTotal <= 0) return null;

  const results = await Result.find({ studentId, academicTermId }).populate('subject', 'name');
  const failing = results.filter((r) => ((r.totalScore / maxTotal) * 100) < FAILING_PERCENT_CUTOFF);
  if (failing.length < MIN_FAILING_SUBJECTS) return null;

  return {
    type: 'failing_multiple_subjects',
    message: `Below ${FAILING_PERCENT_CUTOFF}% in ${failing.length} subject${failing.length === 1 ? '' : 's'} this term: ${failing.map((r) => r.subject?.name || 'Unknown').join(', ')}.`,
    recommendation: `Arrange extra support or a tutoring session focused on ${failing.length === 1 ? failing[0].subject?.name || 'the subject above' : 'the subjects above'}.`,
  };
};

// One student's worth of flags. An empty array means nothing crosses a
// threshold worth a second look right now — not a claim that everything is
// permanently fine.
const detectRiskFlags = async ({ studentId, academicTermId, scheme }) => {
  const [attendanceFlag, declineFlag, failingFlag] = await Promise.all([
    detectAttendanceFlag(studentId, academicTermId),
    detectAcademicDeclineFlag(studentId, scheme),
    detectFailingSubjectsFlag(studentId, academicTermId, scheme),
  ]);
  return [attendanceFlag, declineFlag, failingFlag].filter(Boolean);
};

module.exports = {
  detectRiskFlags,
  LOW_ATTENDANCE_THRESHOLD_PERCENT,
  MIN_ATTENDANCE_RECORDS,
  FAILING_PERCENT_CUTOFF,
  MIN_FAILING_SUBJECTS,
};
