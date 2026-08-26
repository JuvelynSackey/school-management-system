// Shown on teacher-facing pages (Score Entry, Attendance, Terminal Reports)
// so a teacher can see at a glance which mode they're in for the currently
// selected class -- Master Entry vs. their own assigned subjects only.
export default function HomeroomBadge({ isHomeroom }) {
  return isHomeroom ? (
    <span
      className="badge badge-success"
      title="Homeroom teacher for this class — full access to attendance, remarks, and every subject's scores"
    >
      🏠 Homeroom Master
    </span>
  ) : (
    <span
      className="badge badge-neutral"
      title="Subject specialist — score entry is limited to your assigned subjects; attendance and remarks are view-only"
    >
      📘 Subject Specialist
    </span>
  );
}
