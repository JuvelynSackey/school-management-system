import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { verifyDocument } from '../../api/verify.api';
import { formatCurrency } from '../../utils/currency';

const REASON_MESSAGES = {
  not_found: 'No document matches this verification link. It may have been mistyped or the record no longer exists.',
  not_finalized: 'This report has not been finalized by the school yet, so it cannot be verified.',
};

export default function VerifyDocument() {
  const { type, id } = useParams();
  const [state, setState] = useState({ loading: true, data: null, error: null });

  useEffect(() => {
    let cancelled = false;
    setState({ loading: true, data: null, error: null });

    verifyDocument(type, id)
      .then((data) => { if (!cancelled) setState({ loading: false, data, error: null }); })
      .catch(() => { if (!cancelled) setState({ loading: false, data: null, error: 'lookup_failed' }); });

    return () => { cancelled = true; };
  }, [type, id]);

  const { loading, data, error } = state;
  const isValid = data?.valid === true;

  return (
    <div className="verify-page">
      <div className={`verify-card ${loading ? '' : isValid ? 'verify-card--valid' : 'verify-card--invalid'}`}>
        {loading && (
          <>
            <div className="verify-spinner" />
            <p className="verify-status-text">Checking document…</p>
          </>
        )}

        {!loading && isValid && (
          <>
            <div className="verify-icon verify-icon--valid">&#10003;</div>
            <h1>Verified Genuine</h1>
            <p className="verify-school">{data.schoolName || 'School Manager'}</p>

            {data.type === 'receipt' && (
              <dl className="verify-details">
                <div><dt>Receipt No.</dt><dd>{data.receiptNumber}</dd></div>
                <div><dt>Student</dt><dd>{data.studentName}</dd></div>
                <div><dt>Admission No.</dt><dd>{data.admissionNo}</dd></div>
                <div><dt>Fee Type</dt><dd>{data.feeType}</dd></div>
                {data.term && <div><dt>Term</dt><dd>{data.term}</dd></div>}
                <div><dt>Amount Paid</dt><dd>{formatCurrency(data.amountPaid)}</dd></div>
                <div><dt>Payment Date</dt><dd>{data.paymentDate}</dd></div>
              </dl>
            )}

            {data.type === 'report' && (
              <dl className="verify-details">
                <div><dt>Report ID</dt><dd>{data.reportId}</dd></div>
                <div><dt>Student</dt><dd>{data.studentName}</dd></div>
                <div><dt>Admission No.</dt><dd>{data.admissionNo}</dd></div>
                {data.className && <div><dt>Class</dt><dd>{data.className}</dd></div>}
                {data.term && <div><dt>Term</dt><dd>{data.term}</dd></div>}
                {data.averageScore !== null && data.averageScore !== undefined && (
                  <div><dt>Average Score</dt><dd>{Number(data.averageScore).toFixed(2)}%</dd></div>
                )}
                {data.classPosition && <div><dt>Class Position</dt><dd>{data.classPosition}</dd></div>}
                <div><dt>Status</dt><dd>{data.status}</dd></div>
              </dl>
            )}

            <p className="verify-footnote">This document was issued by the school shown above and matches our records.</p>
          </>
        )}

        {!loading && !error && !isValid && (
          <>
            <div className="verify-icon verify-icon--invalid">&#10007;</div>
            <h1>Could Not Verify</h1>
            <p className="verify-footnote">
              {REASON_MESSAGES[data?.reason] || 'This document could not be verified. Please contact the school directly to confirm its authenticity.'}
            </p>
          </>
        )}

        {!loading && error && (
          <>
            <div className="verify-icon verify-icon--invalid">&#10007;</div>
            <h1>Could Not Verify</h1>
            <p className="verify-footnote">Something went wrong while checking this document. Please try again shortly.</p>
          </>
        )}
      </div>
    </div>
  );
}
