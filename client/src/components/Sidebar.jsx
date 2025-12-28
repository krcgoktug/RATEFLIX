import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const navItems = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/watchlist', label: 'Watchlist' },
  { to: '/watched', label: 'Watched' },
  { to: '/favorites', label: 'Favorites' },
  { to: '/explore', label: 'Explore' },
  { to: '/profile', label: 'Profile' }
];

export default function Sidebar() {
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">RATEFLIX</div>
      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              isActive ? 'nav-link active' : 'nav-link'
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="sidebar-footer">
        <div className="user-chip">
          <div className="user-initials">
            {(user?.FirstName || 'U').slice(0, 1)}
          </div>
        <div className="user-meta">
          <div className="user-name">
            {user?.FirstName || 'User'} {user?.LastName || ''}
          </div>
          <div className="user-email">{user?.Email || 'user@rateflix.com'}</div>
        </div>
        </div>
        <button className="btn ghost" type="button" onClick={handleLogout}>
          Log out
        </button>
      </div>
    </aside>
  );
}
