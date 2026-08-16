const { Result, Attendance, ClassSubject, TerminalReport } = require('../models');

// Dense-ranks all results for a class/subject/term by total_score desc and
// writes subject_position back onto each row. Called after every score save.
const recalculateSubjectPositions = async (classId, subjectId, academicTermId) => {
  const results = await Result.find({ classId, subjectId, academicTermId });
  const sorted = [...results].sort((a, b) => Number(b.totalScore) - Number(a.totalScore));

  let rank = 0;
  let lastScore = null;
  await Promise.all(sorted.map((row, index) => {
    const score = Number(row.totalScore);
    if (score !== lastScore) {
      rank = index + 1;
      lastScore = score;
    }
    return Result.updateOne({ _id: row.id }, { $set: { subjectPosition: rank } });
  }));
};

// Sums a student's total_score across all subjects for a class/term, averages
// over the number of subjects assigned to the class, and rolls up attendance.
const computeAggregatesForStudent = async (studentId, classId, academicTermId) => {
  const results = await Result.find({ studentId, classId, academicTermId });
  const totalMarksObtained = results.reduce((sum, r) => sum + Number(r.totalScore), 0);

  const subjectCount = await ClassSubject.countDocuments({ classId });
  const averageScore = subjectCount > 0 ? totalMarksObtained / subjectCount : null;

  const attendanceRecords = await Attendance.find({ studentId, academicTermId });
  const totalAttendance = attendanceRecords.filter((a) => a.status === 'Present' || a.status === 'Late').length;
  const outOfAttendance = attendanceRecords.length;

  return { totalMarksObtained, averageScore, totalAttendance, outOfAttendance };
};

// Dense-ranks students in a class/term by average_score desc, writing
// class_position back onto each terminal_reports row.
const recalculateClassPositions = async (classId, academicTermId) => {
  const reports = await TerminalReport.find({ classId, academicTermId });
  const sorted = [...reports]
    .filter((r) => r.averageScore !== null)
    .sort((a, b) => Number(b.averageScore) - Number(a.averageScore));

  let rank = 0;
  let lastScore = null;
  await Promise.all(sorted.map((row, index) => {
    const score = Number(row.averageScore);
    if (score !== lastScore) {
      rank = index + 1;
      lastScore = score;
    }
    return TerminalReport.updateOne({ _id: row.id }, { $set: { classPosition: rank } });
  }));
};

module.exports = { recalculateSubjectPositions, computeAggregatesForStudent, recalculateClassPositions };
