import Reveal from '../../../components/landing/Reveal';
import ReportCardPreview from '../../../components/reports/ReportCardPreview';

const SCHEME = {
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

const SAMPLE_DATA = {
  school: { name: 'Legend International School', motto: 'Knowledge, Character, Excellence', address: 'Accra, Ghana' },
  term: { name: 'Term 2', academicYear: '2025/2026' },
  nextTermBegins: '12 January 2026',
  student: { firstName: 'Ama', lastName: 'Mensah', admissionNo: 'LIS-0142' },
  classRow: { name: 'Basic 5', section: 'A', showPositions: true },
  rollCount: 32,
  classPosition: 3,
  attendance: { totalAttendance: 61, outOfAttendance: 65 },
  results: [
    { subject: 'Mathematics', classScore: 44, examScore: 42, totalScore: 86, grade: 'A1', subjectPosition: 2 },
    { subject: 'English Language', classScore: 40, examScore: 38, totalScore: 78, grade: 'B2', subjectPosition: 4 },
    { subject: 'Integrated Science', classScore: 41, examScore: 40, totalScore: 81, grade: 'A1', subjectPosition: 1 },
    { subject: 'Social Studies', classScore: 37, examScore: 35, totalScore: 72, grade: 'B2', subjectPosition: 5 },
    { subject: 'Ghanaian Language', classScore: 39, examScore: 33, totalScore: 72, grade: 'B2', subjectPosition: 6 },
  ],
  scheme: SCHEME,
  totalMarksObtained: 389,
  averageScore: 77.8,
  personalAttributeRatings: [
    { name: 'Punctuality', rating: 'Excellent' },
    { name: 'Attitude to Work', rating: 'Very Good' },
  ],
  teacherRemark: 'Ama is a diligent and inquisitive pupil. A stronger focus on Ghanaian Language will lift her overall average further.',
  headteacherRemark: 'A commendable result. Keep up the good work.',
  teacherSignatureName: 'Mr. K. Mensah',
  headteacherSignatureName: 'Mrs. A. Owusu-Sarpong',
  status: 'Locked',
  reportId: 'RC-2025-A1B2C3',
};

export default function ReportCardShowcase() {
  return (
    <section id="report-cards" className="landing-section">
      <Reveal as="h2">A Report Card Parents Trust</Reveal>
      <Reveal as="p" className="landing-section-subtitle">
        Locked once approved, verifiable by QR code, and formatted the way schools already print —
        this is real sample data, not a screenshot.
      </Reveal>
      <Reveal>
        <ReportCardPreview data={SAMPLE_DATA} />
      </Reveal>
    </section>
  );
}
