import { useEffect, useState } from 'react';
import { getMyFees, getPayments, downloadReceipt } from '../../api/fees.api';
import { formatCurrency } from '../../utils/currency';
import Modal from '../../components/common/Modal';

const statusBadge = (status) => {
  if (status === 'Paid') return <span className="badge badge-success">Paid</span>;
  if (status === 'Partial') return <span className="badge badge-warning">Partial</span>;
  return <span className="badge badge-danger">Pending</span>;
};

export default function MyFees() {
  const [fees, setFees] = useState([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [historyFee, setHistoryFee] = useState(null);
  const [payments, setPayments] = useState([]);

  useEffect(() => {
    getMyFees()
      .then(setFees)
      .catch((err) => setError(err.response?.data?.message || 'Failed to load fees.'))
      .finally(() => setIsLoading(false));
  }, []);

  const totalBalance = fees.reduce((sum, f) => sum + Number(f.balance), 0);

  const openHistory = async (fee) => {
    setHistoryFee(fee);
    setPayments(await getPayments(fee.id));
  };

  return (
    <div>
      <h1>My Fees</h1>
      {isLoading && <p className="muted">Loading...</p>}
      {error && <div className="alert-error">{error}</div>}
      {!isLoading && !error && (
        <>
          <div className="cards">
            <div className="card"><div>Outstanding Balance</div><div className="num">{formatCurrency(totalBalance)}</div></div>
          </div>
          <div className="panel">
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
                    <td>{statusBadge(fee.status)}</td>
                    <td><button type="button" className="link-btn" onClick={() => openHistory(fee)}>History</button></td>
                  </tr>
                ))}
                {fees.length === 0 && <tr><td colSpan={7} className="muted">No fees assigned yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </>
      )}

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
