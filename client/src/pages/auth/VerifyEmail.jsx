import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { verifyEmail } from '../../api/auth.api';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('verifying'); // 'verifying' | 'success' | 'error'
  const [message, setMessage] = useState('');

  useEffect(() => {
    const schoolCode = searchParams.get('schoolCode');
    const token = searchParams.get('token');
    if (!schoolCode || !token) {
      setStatus('error');
      setMessage('This verification link is missing information.');
      return;
    }
    verifyEmail(schoolCode, token)
      .then((result) => {
        setStatus('success');
        setMessage(`${result.email} has been verified.`);
      })
      .catch((err) => {
        setStatus('error');
        setMessage(err.response?.data?.message || 'This verification link is invalid or has expired.');
      });
  }, [searchParams]);

  return (
    <div className="cosmic-auth-page">
      <div className="cosmic-orb cosmic-orb-purple" />
      <div className="cosmic-orb cosmic-orb-blue" />

      <div className="cosmic-card">
        <h1>{status === 'success' ? 'Email Verified' : 'Verify Email'}</h1>
        <p className="cosmic-subtitle" style={{ textTransform: 'none', letterSpacing: 'normal', fontWeight: 400 }}>
          {status === 'verifying' ? 'Verifying your email address...' : message}
        </p>
        {status !== 'verifying' && (
          <Link to="/login" className="cosmic-submit" style={{ display: 'block', textAlign: 'center', textDecoration: 'none' }}>Back to Login</Link>
        )}
      </div>
    </div>
  );
}
