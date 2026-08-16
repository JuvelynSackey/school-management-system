// Ghanaian NaCCA basic-education grading scale, applied to class_score + exam_score
// (each 0-50, so their sum is already a 0-100 percentage — no division needed).
const SCALE = [
  { min: 80, grade: 'A1', label: 'Excellent' },
  { min: 70, grade: 'B2', label: 'Very Good' },
  { min: 65, grade: 'B3', label: 'Good' },
  { min: 60, grade: 'C4', label: 'Credit' },
  { min: 55, grade: 'C5', label: 'Credit' },
  { min: 50, grade: 'C6', label: 'Credit' },
  { min: 45, grade: 'D7', label: 'Pass' },
  { min: 40, grade: 'E8', label: 'Pass' },
  { min: 0, grade: 'F9', label: 'Fail' },
];

const computeGrade = (classScore, examScore) => {
  const total = Number(classScore) + Number(examScore);
  const match = SCALE.find((tier) => total >= tier.min);
  return match ? match.grade : 'F9';
};

module.exports = { computeGrade, SCALE };
