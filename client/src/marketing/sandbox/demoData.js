// Static, fictional demo data for the public /demo sandbox. Nothing here is
// fetched from the real API — client/src/marketing/sandbox/** must never
// import from client/src/api/*. This module is the ONLY source of data for
// the whole sandbox, so every interactive action here is local state only.

export const DEMO_SCHOOL = {
  name: 'Legend International School',
  motto: 'Knowledge, Character, Excellence',
};

export const GRADING_SCHEME = {
  classScoreMax: 50,
  examScoreMax: 50,
  bands: [
    { min: 80, grade: 'A1', label: 'Excellent' },
    { min: 70, grade: 'B2', label: 'Very Good' },
    { min: 65, grade: 'B3', label: 'Good' },
    { min: 60, grade: 'C4', label: 'Credit' },
    { min: 55, grade: 'C5', label: 'Credit' },
    { min: 50, grade: 'C6', label: 'Credit' },
    { min: 45, grade: 'D7', label: 'Pass' },
    { min: 40, grade: 'E8', label: 'Pass' },
    { min: 0, grade: 'F9', label: 'Fail' },
  ],
};

export const gradeFor = (total) => {
  const sorted = [...GRADING_SCHEME.bands].sort((a, b) => b.min - a.min);
  const match = sorted.find((tier) => total >= tier.min);
  return match ? match.grade : 'F9';
};

export const DEMO_CLASS = { id: 'c1', name: 'Basic 5', section: 'A', showPositions: true };

export const DEMO_TEACHER = { firstName: 'Kwabena', lastName: 'Mensah', title: 'Mr.' };

export const DEMO_STUDENTS = [
  { id: 's1', firstName: 'Ama', lastName: 'Mensah', admissionNo: 'LIS-0142' },
  { id: 's2', firstName: 'Kofi', lastName: 'Owusu', admissionNo: 'LIS-0143' },
  { id: 's3', firstName: 'Yaw', lastName: 'Asante', admissionNo: 'LIS-0144' },
  { id: 's4', firstName: 'Akosua', lastName: 'Boateng', admissionNo: 'LIS-0145' },
];

export const DEMO_SUBJECTS = ['Mathematics', 'English Language', 'Integrated Science', 'Social Studies'];

// [studentId][subject] -> { classScore, examScore }
export const DEMO_SCORES = {
  s1: {
    Mathematics: { classScore: 44, examScore: 42 },
    'English Language': { classScore: 40, examScore: 38 },
    'Integrated Science': { classScore: 45, examScore: 43 },
    'Social Studies': { classScore: 37, examScore: 35 },
  },
  s2: {
    Mathematics: { classScore: 38, examScore: 35 },
    'English Language': { classScore: 42, examScore: 40 },
    'Integrated Science': { classScore: 33, examScore: 30 },
    'Social Studies': { classScore: 39, examScore: 36 },
  },
  s3: {
    Mathematics: { classScore: 47, examScore: 46 },
    'English Language': { classScore: 30, examScore: 28 },
    'Integrated Science': { classScore: 44, examScore: 43 },
    'Social Studies': { classScore: 32, examScore: 29 },
  },
  s4: {
    Mathematics: { classScore: 29, examScore: 26 },
    'English Language': { classScore: 34, examScore: 31 },
    'Integrated Science': { classScore: 27, examScore: 24 },
    'Social Studies': { classScore: 31, examScore: 28 },
  },
};

export const DEMO_ADMIN_STATS = {
  students: 482, teachers: 24, classes: 14, attendanceRate: 96,
  feesCollected: 128400, feesOutstanding: 18650,
};

export const DEMO_PARENT = {
  fullName: 'Mrs. Comfort Owusu',
  children: [DEMO_STUDENTS[1], DEMO_STUDENTS[3]],
};

export const DEMO_STUDENT_USER = DEMO_STUDENTS[0];

export const DEMO_REMARK_BANK = {
  strong: [
    "{name} has had an excellent term, consistently applying {pronoun}self well across every subject. Keep up this standard.",
    "A pleasure to teach — {name} grasps new concepts quickly and supports classmates generously.",
  ],
  average: [
    "{name} has shown steady progress this term. More consistent revision at home would lift {possessive} results further.",
    "{name} performs well when focused. Encouraging regular study habits will help sustain this.",
  ],
  weak: [
    "{name} has found this term challenging. Extra support in {weakSubject} at home would make a real difference.",
    "{name} has the ability to do better — closer attention to homework and class participation is needed.",
  ],
};

const subjectPositionFor = (studentId, subject) => {
  const totals = DEMO_STUDENTS
    .map((s) => DEMO_SCORES[s.id][subject].classScore + DEMO_SCORES[s.id][subject].examScore)
    .sort((a, b) => b - a);
  const ownTotal = DEMO_SCORES[studentId][subject].classScore + DEMO_SCORES[studentId][subject].examScore;
  return totals.indexOf(ownTotal) + 1;
};

export const computeStudentResults = (studentId) => {
  const results = DEMO_SUBJECTS.map((subj) => {
    const { classScore, examScore } = DEMO_SCORES[studentId][subj];
    const total = classScore + examScore;
    return {
      subject: subj, classScore, examScore, totalScore: total, grade: gradeFor(total),
      subjectPosition: subjectPositionFor(studentId, subj),
    };
  });
  const totalMarksObtained = results.reduce((sum, r) => sum + r.totalScore, 0);
  const averageScore = totalMarksObtained / results.length;
  return { results, totalMarksObtained, averageScore };
};

export const classPositionFor = (studentId) => {
  const totals = DEMO_STUDENTS.map((s) => {
    const sum = DEMO_SUBJECTS.reduce((acc, subj) => acc + DEMO_SCORES[s.id][subj].classScore + DEMO_SCORES[s.id][subj].examScore, 0);
    return { id: s.id, sum };
  }).sort((a, b) => b.sum - a.sum);
  return totals.findIndex((t) => t.id === studentId) + 1;
};

export const buildReportCardData = (studentId, overrides = {}) => {
  const student = DEMO_STUDENTS.find((s) => s.id === studentId);
  const { results, totalMarksObtained, averageScore } = computeStudentResults(studentId);
  return {
    school: DEMO_SCHOOL,
    term: { name: 'Term 2', academicYear: '2025/2026' },
    nextTermBegins: '12 January 2026',
    student,
    classRow: DEMO_CLASS,
    rollCount: DEMO_STUDENTS.length,
    classPosition: classPositionFor(studentId),
    attendance: { totalAttendance: 61, outOfAttendance: 65 },
    results,
    scheme: GRADING_SCHEME,
    totalMarksObtained,
    averageScore,
    teacherRemark: 'A pleasure to teach — consistent effort across every subject this term.',
    headteacherRemark: 'A commendable result. Keep up the good work.',
    teacherSignatureName: `${DEMO_TEACHER.title} ${DEMO_TEACHER.lastName}`,
    status: 'Locked',
    reportId: `RC-DEMO-${studentId.toUpperCase()}`,
    ...overrides,
  };
};
