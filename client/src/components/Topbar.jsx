import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Topbar({ variant }) {
  const { user } = useAuth();
  const location = useLocation();
  const segments = location.pathname.split('/').filter(Boolean);
  const routeLabels = {
    dashboard: 'Dashboard',
    watchlist: 'Watchlist',
    watched: 'Watched',
    favorites: 'Favorites',
    explore: 'Explore',
    add: 'Add Title',
    profile: 'Profile',
    login: 'Login',
    register: 'Register'
  };
  const pageTitle = segments[0] === 'title'
    ? 'Title Detail'
    : (routeLabels[segments[0]] || 'Dashboard');

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
        <div className="topbar-title">{pageTitle}</div>
        <div className="topbar-sub">Welcome back, {user?.FirstName || 'Guest'}</div>
      </div>
      <div className="topbar-actions">
        <Link className="btn primary" to="/add">+ Add Title</Link>
      </div>
    </header>
  );
}
