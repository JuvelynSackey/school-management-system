import { useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import LoginForm from '../../components/auth/LoginForm';

const STAR_COUNT = 55;

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();

  const stars = useMemo(() => Array.from({ length: STAR_COUNT }, () => ({
    left: `${Math.random() * 100}%`,
    top: `${Math.random() * 100}%`,
    size: `${1 + Math.random() * 1.6}px`,
    delay: `${Math.random() * 4}s`,
    duration: `${2.5 + Math.random() * 2.5}s`,
  })), []);

  const from = location.state?.from?.pathname || '/dashboard';

  return (
    <div className="cosmic-auth-page">
      <div className="cosmic-orb cosmic-orb-purple" />
      <div className="cosmic-orb cosmic-orb-blue" />
      <div className="cosmic-orb cosmic-orb-orange" />
      <div className="cosmic-orb cosmic-orb-dot-purple" />
      <div className="cosmic-orb cosmic-orb-dot-brown" />

      <div className="cosmic-starfield">
        {stars.map((s, i) => (
          // eslint-disable-next-line react/no-array-index-key
          <span
            key={i}
            className="cosmic-star"
            style={{
              left: s.left, top: s.top, width: s.size, height: s.size,
              animationDelay: s.delay, animationDuration: s.duration,
            }}
          />
        ))}
      </div>

      <div className="cosmic-card">
        <LoginForm onSuccess={() => navigate(from, { replace: true })} />
      </div>
    </div>
  );
}
