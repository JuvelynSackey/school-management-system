import Reveal from '../../../components/landing/Reveal';
import TiltCard from '../../../components/landing/TiltCard';

const formatCedis = (n) => `GH₵ ${Number(n).toLocaleString('en-GH', { minimumFractionDigits: 2 })}`;

const FEE_ROWS = [
  { student: 'Kofi Owusu', feeType: 'Term 2 Fees', billed: 850, paid: 850, status: 'Paid' },
  { student: 'Yaw Asante', feeType: 'Term 2 Fees', billed: 850, paid: 500, status: 'Partial' },
  { student: 'Akosua Boateng', feeType: 'Term 2 Fees', billed: 850, paid: 0, status: 'Outstanding' },
];

const STATUS_COLOR = { Paid: '#0ca30c', Partial: '#fab219', Outstanding: '#e5484d' };

export default function FeesShowcase() {
  return (
    <section id="fees" className="landing-section landing-section-alt">
      <Reveal as="h2">Fees, Tracked in Cedis</Reveal>
      <Reveal as="p" className="landing-section-subtitle">
        Every balance, payment, and printable receipt — in GH₵, no conversion, no spreadsheet.
      </Reveal>
      <div className="fees-showcase-grid">
        <Reveal>
          <TiltCard className="fees-showcase-table-card">
            <table className="fees-showcase-table">
              <thead>
                <tr><th>Student</th><th>Fee</th><th>Billed</th><th>Paid</th><th>Status</th></tr>
              </thead>
              <tbody>
                {FEE_ROWS.map((r) => (
                  <tr key={r.student}>
                    <td>{r.student}</td>
                    <td>{r.feeType}</td>
                    <td>{formatCedis(r.billed)}</td>
                    <td>{formatCedis(r.paid)}</td>
                    <td>
                      <span className="fees-showcase-status" style={{ '--status-color': STATUS_COLOR[r.status] }}>
                        {r.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TiltCard>
        </Reveal>
        <Reveal delay={100}>
          <TiltCard className="fees-showcase-receipt">
            <p className="fees-showcase-receipt-label">RECEIPT</p>
            <h4>Kofi Owusu</h4>
            <p className="fees-showcase-receipt-line">Term 2 Fees</p>
            <div className="fees-showcase-receipt-amount">{formatCedis(850)}</div>
            <p className="fees-showcase-receipt-line">Paid in full · Mobile Money</p>
            <p className="fees-showcase-receipt-ref">Receipt No. RCPT-0421</p>
          </TiltCard>
        </Reveal>
      </div>
    </section>
  );
}
