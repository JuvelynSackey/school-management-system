// Mirrors server/src/services/grading.service.js — for instant UI feedback only;
// the server-computed grade after save is authoritative.
const SCALE = [
  { min: 80, grade: 'A1' },
  { min: 70, grade: 'B2' },
  { min: 65, grade: 'B3' },
  { min: 60, grade: 'C4' },
  { min: 55, grade: 'C5' },
  { min: 50, grade: 'C6' },
  { min: 45, grade: 'D7' },
  { min: 40, grade: 'E8' },
  { min: 0, grade: 'F9' },
];

export const computeGrade = (classScore, examScore) => {
  if (classScore === '' || examScore === '' || classScore === null || examScore === null) return null;
  const total = Number(classScore) + Number(examScore);
  if (Number.isNaN(total)) return null;
  const match = SCALE.find((tier) => total >= tier.min);
  return match ? match.grade : 'F9';
};

const GOOD_GRADES = ['A1', 'B2', 'B3'];
const MID_GRADES = ['C4', 'C5', 'C6'];

// Maps a grade to a badge color tier — good (green) / mid (amber) / low (red).
export const gradeBadgeClass = (grade) => {
  if (GOOD_GRADES.includes(grade)) return 'badge-success';
  if (MID_GRADES.includes(grade)) return 'badge-warning';
  return 'badge-danger';
};
