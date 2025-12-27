import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Topbar({ variant }) {
  const { user } = useAuth();
  const location = useLocation();
  const pageTitle = location.pathname.replace('/', '') || 'dashboard';

  if (variant === 'auth') {
    return (
      <header className="topbar auth-topbar">
        <div className="brand">RATEFLIX</div>
        <div className="tagline">Rate it. Track it. Love it.</div>
      </header>
    );
  }

  return (
    <header className="topbar">
      <div>
        <div className="topbar-title">{pageTitle.toUpperCase()}</div>
        <div className="topbar-sub">Welcome back, {user?.FirstName || 'Guest'}</div>
      </div>
      <div className="topbar-actions">
        <Link className="btn primary" to="/add">+ Add Title</Link>
      </div>
    </header>
  );
}