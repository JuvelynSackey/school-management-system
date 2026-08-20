import { useEffect, useState } from 'react';
import useApiResource from '../../hooks/useApiResource';
import { listFees, createFee, deleteFee, getPayments, recordPayment, downloadReceipt } from '../../api/fees.api';
import { listStudents } from '../../api/students.api';
import { listClasses } from '../../api/classes.api';
import { listTerms } from '../../api/terms.api';
import { createAnnouncement } from '../../api/announcements.api';
import { formatCurrency } from '../../utils/currency';
import Modal from '../../components/common/Modal';
import FeeStructures from './FeeStructures';
import DailyFeedingPanel from './DailyFeedingPanel';
import ArrearsPanel from './ArrearsPanel';

const PAYMENT_METHODS = ['Cash', 'Bank Transfer', 'Mobile Money', 'Card', 'Cheque', 'Other'];
const CATEGORIES = ['Tuition', 'Feeding', 'ClassActivity', 'PTA', 'Other'];
const CATEGORY_BADGE = {
  Tuition: 'badge-neutral', Feeding: 'badge-success', ClassActivity: 'badge-warning', PTA: 'badge-rose', Other: 'badge-neutral',
};

const statusBadge = (status) => {
  if (status === 'Paid') return <span className="badge badge-success">Paid</span>;
  if (status === 'Partial') return <span className="badge badge-warning">Partial</span>;
  return <span className="badge badge-danger">Pending</span>;
};

const emptyForm = { studentId: '', academicTermId: '', feeType: '', category: 'Tuition', amountDue: '', dueDate: '' };
const emptyPayment = { amountPaid: '', paymentDate: new Date().toISOString().slice(0, 10), paymentMethod: 'Cash', referenceNo: '', notes: '' };

export default function FeeList() {
  const [view, setView] = useState('fees'); // 'fees' | 'structures' | 'feeding' | 'arrears'
  const [classFilter, setClassFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [terms, setTerms] = useState([]);

  const params = {
    ...(classFilter ? { classId: classFilter } : {}),
    ...(categoryFilter ? { category: categoryFilter } : {}),
    ...(overdueOnly ? { overdue: 'true' } : {}),
  };
  const { data: fees, isLoading, error, reload } = useApiResource(() => listFees(params), [classFilter, categoryFilter, overdueOnly]);

  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const [payingFee, setPayingFee] = useState(null);
  const [payments, setPayments] = useState([]);
  const [paymentForm, setPaymentForm] = useState(emptyPayment);
  const [paymentError, setPaymentError] = useState('');
  const [isPaying, setIsPaying] = useState(false);

  const [remindingFee, setRemindingFee] = useState(null);
  const [reminderMessage, setReminderMessage] = useState('');
  const [reminderError, setReminderError] = useState('');
  const [isReminding, setIsReminding] = useState(false);
  const [reminderSent, setReminderSent] = useState(false);

  useEffect(() => {
    listStudents().then(setStudents).catch(() => setStudents([]));
    listClasses().then(setClasses).catch(() => setClasses([]));
    listTerms().then(setTerms).catch(() => setTerms([]));
  }, []);

  const openCreate = () => { setForm(emptyForm); setFormError(''); setCreating(true); };
  const closeCreate = () => setCreating(false);

  const handleCreate = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setFormError('');
    try {
      await createFee({ ...form, studentId: form.studentId, academicTermId: form.academicTermId || null, amountDue: Number(form.amountDue) });
      closeCreate();
      reload();
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to create fee.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (fee) => {
    if (!window.confirm(`Delete this fee record for ${fee.student?.firstName} ${fee.student?.lastName}?`)) return;
    await deleteFee(fee.id);
    reload();
  };

  const openPay = async (fee) => {
    setPayingFee(fee);
    setPaymentForm(emptyPayment);
    setPaymentError('');
    const history = await getPayments(fee.id);
    setPayments(history);
  };
  const closePay = () => setPayingFee(null);

  const openRemind = (fee) => {
    setRemindingFee(fee);
    setReminderError('');
    setReminderSent(false);
    const studentName = `${fee.student?.firstName} ${fee.student?.lastName}`;
    setReminderMessage(`Dear parent/guardian, ${studentName}'s ${fee.feeType} balance of ${formatCurrency(fee.balance)} is overdue. Please settle at your earliest convenience.`);
  };
  const closeRemind = () => setRemindingFee(null);

  const handleSendReminder = async (e) => {
    e.preventDefault();
    setIsReminding(true);
    setReminderError('');
    try {
      await createAnnouncement({
        message: reminderMessage,
        targetType: 'student',
        targetStudentId: remindingFee.studentId,
        category: 'fee_reminder',
      });
      setReminderSent(true);
    } catch (err) {
      setReminderError(err.response?.data?.message || 'Failed to send reminder.');
    } finally {
      setIsReminding(false);
    }
  };

  const handlePay = async (e) => {
    e.preventDefault();
    setIsPaying(true);
    setPaymentError('');
    try {
      await recordPayment(payingFee.id, { ...paymentForm, amountPaid: Number(paymentForm.amountPaid) });
      const history = await getPayments(payingFee.id);
      setPayments(history);
      setPaymentForm(emptyPayment);
      reload();
    } catch (err) {
      setPaymentError(err.response?.data?.message || 'Failed to record payment.');
    } finally {
      setIsPaying(false);
    }
  };

  return (
    <div>
      <div className="toolbar">
        <h1>Fees</h1>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" className={view === 'fees' ? 'btn-primary' : 'btn-secondary'} onClick={() => { setView('fees'); reload(); }}>Fees</button>
          <button type="button" className={view === 'structures' ? 'btn-primary' : 'btn-secondary'} onClick={() => setView('structures')}>Fee Structures</button>
          <button type="button" className={view === 'feeding' ? 'btn-primary' : 'btn-secondary'} onClick={() => setView('feeding')}>Daily Feeding</button>
          <button type="button" className={view === 'arrears' ? 'btn-primary' : 'btn-secondary'} onClick={() => setView('arrears')}>Arrears</button>
        </div>
      </div>

      {view === 'structures' && <FeeStructures classes={classes} terms={terms} />}
      {view === 'feeding' && <DailyFeedingPanel classes={classes} />}
      {view === 'arrears' && <ArrearsPanel classes={classes} />}

      {view === 'fees' && (
        <>
          <div className="panel">
            <div className="toolbar" style={{ marginBottom: 16, flexWrap: 'wrap' }}>
              <select value={classFilter} onChange={(e) => setClassFilter(e.target.value)}>
                <option value="">All classes</option>
                {classes.map((c) => <option key={c.id} value={c.id}>{c.name} {c.section}</option>)}
              </select>
              <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
                <option value="">All categories</option>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14 }}>
                <input type="checkbox" checked={overdueOnly} onChange={(e) => setOverdueOnly(e.target.checked)} />
                Overdue only
              </label>
              <div style={{ flex: 1 }} />
              <button type="button" className="btn-primary" onClick={openCreate}>Assign Fee</button>
            </div>

            {isLoading && <p className="muted">Loading...</p>}
            {error && <div className="alert-error">{error}</div>}
            {!isLoading && !error && (
              <table>
                <thead>
                  <tr><th>Student</th><th>Fee Type</th><th>Category</th><th>Due</th><th>Paid</th><th>Balance</th><th>Status</th><th /></tr>
                </thead>
                <tbody>
                  {fees.map((fee) => (
                    <tr key={fee.id}>
                      <td>{fee.student?.firstName} {fee.student?.lastName}</td>
                      <td>{fee.feeType}</td>
                      <td><span className={`badge ${CATEGORY_BADGE[fee.category] || 'badge-neutral'}`}>{fee.category || 'Tuition'}</span></td>
                      <td>{formatCurrency(fee.amountDue)}</td>
                      <td>{formatCurrency(fee.amountPaid)}</td>
                      <td>{formatCurrency(fee.balance)}</td>
                      <td>{statusBadge(fee.status)}</td>
                      <td>
                        <div className="row-actions">
                          <button type="button" className="link-btn" onClick={() => openPay(fee)}>Record Payment</button>
                          {Number(fee.balance) > 0 && (
                            <button type="button" className="link-btn" onClick={() => openRemind(fee)}>Send Reminder</button>
                          )}
                          <button type="button" className="link-btn danger" onClick={() => handleDelete(fee)}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {fees.length === 0 && <tr><td colSpan={8} className="muted">No fees found.</td></tr>}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {creating && (
        <Modal title="Assign Fee" onClose={closeCreate}>
          <form onSubmit={handleCreate}>
            {formError && <div className="alert-error">{formError}</div>}
            <label className="field">
              <span>Student</span>
              <select value={form.studentId} onChange={(e) => setForm({ ...form, studentId: e.target.value })} required>
                <option value="">Select a student...</option>
                {students.map((s) => <option key={s.id} value={s.id}>{s.firstName} {s.lastName} ({s.admissionNo})</option>)}
              </select>
            </label>
            <label className="field">
              <span>Academic Term</span>
              <select value={form.academicTermId} onChange={(e) => setForm({ ...form, academicTermId: e.target.value })}>
                <option value="">—</option>
                {terms.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </label>
            <label className="field">
              <span>Fee Type</span>
              <input value={form.feeType} onChange={(e) => setForm({ ...form, feeType: e.target.value })} placeholder="e.g. Tuition" required />
            </label>
            <label className="field">
              <span>Category</span>
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
            <label className="field">
              <span>Amount Due (GH₵)</span>
              <input type="number" min="0" step="0.01" value={form.amountDue} onChange={(e) => setForm({ ...form, amountDue: e.target.value })} required />
            </label>
            <label className="field">
              <span>Due Date</span>
              <input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
            </label>
            <div className="modal-actions">
              <button type="button" className="btn-secondary" onClick={closeCreate}>Cancel</button>
              <button type="submit" className="btn-primary" disabled={isSaving}>{isSaving ? 'Saving...' : 'Save'}</button>
            </div>
          </form>
        </Modal>
      )}

      {payingFee && (
        <Modal title={`Payments — ${payingFee.student?.firstName} ${payingFee.student?.lastName}`} onClose={closePay}>
          <p className="muted">{payingFee.feeType} · Balance: {formatCurrency(payingFee.balance)}</p>
          <table style={{ margin: '12px 0' }}>
            <thead><tr><th>Date</th><th>Amount</th><th>Method</th><th /></tr></thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id}>
                  <td>{p.paymentDate}</td>
                  <td>{formatCurrency(p.amountPaid)}</td>
                  <td>{p.paymentMethod}</td>
                  <td><button type="button" className="link-btn" onClick={() => downloadReceipt(payingFee.id, p.id)}>Receipt</button></td>
                </tr>
              ))}
              {payments.length === 0 && <tr><td colSpan={4} className="muted">No payments yet.</td></tr>}
            </tbody>
          </table>
          <form onSubmit={handlePay}>
            {paymentError && <div className="alert-error">{paymentError}</div>}
            <label className="field">
              <span>Amount (GH₵)</span>
              <input type="number" min="0.01" step="0.01" value={paymentForm.amountPaid} onChange={(e) => setPaymentForm({ ...paymentForm, amountPaid: e.target.value })} required />
            </label>
            <label className="field">
              <span>Payment Date</span>
              <input type="date" value={paymentForm.paymentDate} onChange={(e) => setPaymentForm({ ...paymentForm, paymentDate: e.target.value })} required />
            </label>
            <label className="field">
              <span>Method</span>
              <select value={paymentForm.paymentMethod} onChange={(e) => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value })}>
                {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </label>
            <label className="field">
              <span>Reference No.</span>
              <input value={paymentForm.referenceNo} onChange={(e) => setPaymentForm({ ...paymentForm, referenceNo: e.target.value })} />
            </label>
            <div className="modal-actions">
              <button type="button" className="btn-secondary" onClick={closePay}>Close</button>
              <button type="submit" className="btn-primary" disabled={isPaying}>{isPaying ? 'Saving...' : 'Record Payment'}</button>
            </div>
          </form>
        </Modal>
      )}

      {remindingFee && (
        <Modal title={`Send Reminder — ${remindingFee.student?.firstName} ${remindingFee.student?.lastName}`} onClose={closeRemind}>
          {reminderSent ? (
            <>
              <p>Reminder logged. It now appears on {remindingFee.student?.firstName}&apos;s notice board — SMS sending isn&apos;t connected yet, so no text message was actually sent.</p>
              <div className="modal-actions">
                <button type="button" className="btn-primary" onClick={closeRemind}>Done</button>
              </div>
            </>
          ) : (
            <form onSubmit={handleSendReminder}>
              {reminderError && <div className="alert-error">{reminderError}</div>}
              <label className="field">
                <span>Message</span>
                <textarea rows={3} value={reminderMessage} onChange={(e) => setReminderMessage(e.target.value)} required maxLength={1000} />
              </label>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={closeRemind}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={isReminding}>{isReminding ? 'Sending...' : 'Send'}</button>
              </div>
            </form>
          )}
        </Modal>
      )}
    </div>
  );
}
