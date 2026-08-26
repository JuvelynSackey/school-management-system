import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getStudent, uploadStudentPhoto } from '../../api/students.api';
import { getStudentAttendance } from '../../api/attendance.api';
import { getStudentResults } from '../../api/results.api';
import { createGuardianLogin } from '../../api/guardians.api';
import { listFees, getPayments, downloadReceipt } from '../../api/fees.api';
import { gradeBadgeClass } from '../../utils/grading';
import { formatCurrency } from '../../utils/currency';
import { useAuth } from '../../context/AuthContext';
import Modal from '../../components/common/Modal';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ReportCardsPanel from '../../components/results/ReportCardsPanel';
import PerformanceInsightsPanel from '../../components/results/PerformanceInsightsPanel';
import AcademicHistoryPanel from '../../components/results/AcademicHistoryPanel';

const NOTE_BADGE_CLASS = { medical: 'badge-danger', pickup: 'badge-warning', other: 'badge-neutral' };

function CreateParentLoginAction({ guardian, onCreated }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  if (guardian.userId) return <span className="badge badge-success">Has login</span>;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setError('');
    try {
      const updated = await createGuardianLogin(guardian.id, form);
      onCreated(updated);
      setOpen(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create login.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <button type="button" className="link-btn" onClick={() => setOpen(true)}>Create Parent Login</button>
      {open && (
        <Modal title={`Create Login — ${guardian.fullName}`} onClose={() => setOpen(false)}>
          <form onSubmit={handleSubmit}>
            {error && <div className="alert-error">{error}</div>}
            <label className="field">
              <span>Email</span>
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            </label>
            <label className="field">
              <span>Temporary Password</span>
              <input type="text" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} minLength={8} required />
            </label>
            <div className="modal-actions">
              <button type="button" className="btn-secondary" onClick={() => setOpen(false)}>Cancel</button>
              <button type="submit" className="btn-primary" disabled={isSaving}>{isSaving ? 'Creating...' : 'Create Login'}</button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}

function StudentPhoto({ student, canUpload, onUploaded }) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-selecting the same file next time
    if (!file) return;
    setIsUploading(true);
    setError('');
    try {
      const { photoUrl } = await uploadStudentPhoto(student.id, file);
      onUploaded(photoUrl);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to upload photo.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
      {student.photoUrl ? (
        <img src={student.photoUrl} alt="" style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover' }} />
      ) : (
        <div className="profile-avatar" style={{ width: 64, height: 64, marginBottom: 0 }}>{student.firstName?.[0]}{student.lastName?.[0]}</div>
      )}
      {canUpload && (
        <label className="btn-secondary" style={{ cursor: 'pointer', fontSize: 13 }}>
          {isUploading ? 'Uploading…' : student.photoUrl ? 'Replace Photo' : 'Upload Photo'}
          <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFile} disabled={isUploading} style={{ display: 'none' }} />
        </label>
      )}
      {error && <span className="alert-error" style={{ padding: '4px 10px', marginBottom: 0, fontSize: 12 }}>{error}</span>}
    </div>
  );
}

export function StudentProfileView({
  student, canManageGuardianLogins, onGuardianLoginCreated, onPhotoUploaded,
}) {
  if (!student) return null;
  const siblingsByGuardian = (student.guardians || []).map((g) => ({
    guardian: g,
    siblings: (g.students || []).filter((s) => s.id !== student.id),
  }));

  return (
    <>
      <div className="panel">
        <StudentPhoto student={student} canUpload={canManageGuardianLogins} onUploaded={onPhotoUploaded} />
        <h2>{student.firstName} {student.lastName}</h2>
        <table className="details-table">
          <tbody>
            <tr><th>Admission No.</th><td>{student.admissionNo}</td></tr>
            {student.waecIndexNumber && <tr><th>WAEC/BECE Index No.</th><td>{student.waecIndexNumber}</td></tr>}
            <tr><th>Email</th><td>{student.user?.email || '—'}</td></tr>
            <tr><th>Class</th><td>{student.class ? `${student.class.name} ${student.class.section || ''}` : 'Unassigned'}</td></tr>
            <tr><th>Gender</th><td>{student.gender || '—'}</td></tr>
            <tr><th>Date of Birth</th><td>{student.dateOfBirth || '—'}</td></tr>
            <tr><th>Address</th><td>{student.address || '—'}</td></tr>
            <tr><th>Admission Date</th><td>{student.admissionDate || '—'}</td></tr>
            <tr><th>Status</th><td>{student.status}</td></tr>
          </tbody>
        </table>
      </div>

      {(student.safetyNotes?.length > 0) && (
        <div className="panel">
          <h2>Safety Notes</h2>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {student.safetyNotes.map((n) => (
              <span key={n.id} className={`badge ${NOTE_BADGE_CLASS[n.type] || 'badge-neutral'}`}>
                {n.type === 'pickup' && 'Pickup: '}
                {n.type === 'medical' && 'Medical: '}
                {n.note}
              </span>
            ))}
          </div>
        </div>
      )}

      {(student.guardians?.length > 0) && (
        <div className="panel">
          <h2>Guardians</h2>
          <table>
            <thead>
              <tr>
                <th>Name</th><th>Relationship</th><th>Phone</th><th>Email</th><th>Priority</th><th>Also parent of</th>
                {canManageGuardianLogins && <th>Login</th>}
              </tr>
            </thead>
            <tbody>
              {siblingsByGuardian.map(({ guardian, siblings }) => (
                <tr key={guardian.id}>
                  <td>{guardian.fullName}</td>
                  <td>{guardian.relationship || '—'}</td>
                  <td>{guardian.phone}</td>
                  <td>{guardian.email || '—'}</td>
                  <td style={{ textTransform: 'capitalize' }}>{guardian.contactPriority}</td>
                  <td>{siblings.length ? siblings.map((s) => `${s.firstName} ${s.lastName}`).join(', ') : '—'}</td>
                  {canManageGuardianLogins && (
                    <td><CreateParentLoginAction guardian={guardian} onCreated={onGuardianLoginCreated} /></td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

function FeesPanel({ studentId }) {
  const [fees, setFees] = useState(null);
  const [historyFee, setHistoryFee] = useState(null);
  const [payments, setPayments] = useState([]);

  useEffect(() => {
    listFees({ studentId }).then(setFees).catch(() => setFees([]));
  }, [studentId]);

  const openHistory = async (fee) => {
    setHistoryFee(fee);
    setPayments(await getPayments(fee.id));
  };

  if (fees === null) return null;

  return (
    <div className="panel">
      <h2>Fees</h2>
      <table>
        <thead><tr><th>Fee Type</th><th>Term</th><th>Due</th><th>Paid</th><th>Balance</th><th>Status</th><th /></tr></thead>
        <tbody>
          {fees.map((fee) => (
            <tr key={fee.id}>
              <td>{fee.feeType}</td>
              <td>{fee.academicTerm?.name || '—'}</td>
              <td>{formatCurrency(fee.amountDue)}</td>
              <td>{formatCurrency(fee.amountPaid)}</td>
              <td>{formatCurrency(fee.balance)}</td>
              <td>{fee.status}</td>
              <td><button type="button" className="link-btn" onClick={() => openHistory(fee)}>History</button></td>
            </tr>
          ))}
          {fees.length === 0 && <tr><td colSpan={7} className="muted">No fees assigned yet.</td></tr>}
        </tbody>
      </table>

      {historyFee && (
        <Modal title={`Payment History — ${historyFee.feeType}`} onClose={() => setHistoryFee(null)}>
          <table>
            <thead><tr><th>Date</th><th>Amount</th><th>Method</th><th /></tr></thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id}>
                  <td>{p.paymentDate}</td>
                  <td>{formatCurrency(p.amountPaid)}</td>
                  <td>{p.paymentMethod}</td>
                  <td><button type="button" className="link-btn" onClick={() => downloadReceipt(historyFee.id, p.id)}>Receipt</button></td>
                </tr>
              ))}
              {payments.length === 0 && <tr><td colSpan={4} className="muted">No payments yet.</td></tr>}
            </tbody>
          </table>
        </Modal>
      )}
    </div>
  );
}

export default function StudentProfile() {
  const { id } = useParams();
  const { user } = useAuth();
  const [student, setStudent] = useState(null);
  const [attendanceSummary, setAttendanceSummary] = useState(null);
  const [results, setResults] = useState([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    getStudent(id)
      .then(setStudent)
      .catch((err) => setError(err.response?.data?.message || 'Failed to load student.'))
      .finally(() => setIsLoading(false));
    getStudentAttendance(id).then((data) => setAttendanceSummary(data.summary)).catch(() => {});
    getStudentResults(id).then(setResults).catch(() => {});
  }, [id]);

  const handleGuardianLoginCreated = (updatedGuardian) => {
    setStudent((s) => ({
      ...s,
      guardians: s.guardians.map((g) => (g.id === updatedGuardian.id ? { ...g, userId: updatedGuardian.userId } : g)),
    }));
  };

  const backLink = user?.role === 'parent' ? '/dashboard' : '/students';
  const showFees = user?.role === 'admin' || user?.role === 'parent';

  return (
    <div>
      <div className="toolbar">
        <h1>Student Profile</h1>
        <Link to={backLink} className="btn-secondary">Back</Link>
      </div>
      {isLoading && <LoadingSpinner label="Loading student profile…" />}
      {error && <div className="alert-error">{error}</div>}
      {!isLoading && !error && (
        <>
          <StudentProfileView
            student={student}
            canManageGuardianLogins={user?.role === 'admin'}
            onGuardianLoginCreated={handleGuardianLoginCreated}
            onPhotoUploaded={(photoUrl) => setStudent((s) => ({ ...s, photoUrl }))}
          />

          {attendanceSummary && (
            <div className="panel">
              <h2>Attendance Summary</h2>
              <div className="cards" style={{ marginBottom: 0 }}>
                <div className="card"><div>Present</div><div className="num">{attendanceSummary.Present}</div></div>
                <div className="card"><div>Absent</div><div className="num">{attendanceSummary.Absent}</div></div>
                <div className="card"><div>Late</div><div className="num">{attendanceSummary.Late}</div></div>
                <div className="card"><div>Excused</div><div className="num">{attendanceSummary.Excused}</div></div>
              </div>
            </div>
          )}

          <PerformanceInsightsPanel studentId={id} />
          <AcademicHistoryPanel studentId={id} />

          <div className="panel">
            <h2>Results</h2>
            <table>
              <thead><tr><th>Subject</th><th>Term</th><th>Class Score</th><th>Exam Score</th><th>Total</th><th>Grade</th><th>Position</th></tr></thead>
              <tbody>
                {results.map((r) => (
                  <tr key={r.id}>
                    <td>{r.subject?.name}</td>
                    <td>{r.academicTerm?.name}</td>
                    <td>{r.classScore}</td>
                    <td>{r.examScore}</td>
                    <td>{r.totalScore}</td>
                    <td><span className={`badge badge-solid ${gradeBadgeClass(r.grade)}`}>{r.grade}</span></td>
                    <td>{r.subjectPosition ?? '—'}</td>
                  </tr>
                ))}
                {results.length === 0 && <tr><td colSpan={7} className="muted">No results recorded yet.</td></tr>}
              </tbody>
            </table>
          </div>

          <ReportCardsPanel studentId={id} />

          {showFees && <FeesPanel studentId={id} />}
        </>
      )}
    </div>
  );
}
