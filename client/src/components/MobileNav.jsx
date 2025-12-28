import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const navItems = [
  {
    to: '/dashboard',
    label: 'Home',
    icon: (
      <path
        d="M3 10.5l9-7 9 7V20a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    )
  },
  {
    to: '/watchlist',
    label: 'Watchlist',
    icon: (
      <path
        d="M5 6h14M5 12h14M5 18h8"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    )
  },
  {
    to: '/watched',
    label: 'Watched',
    icon: (
      <>
        <path
          d="M9 12l2 2 4-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M12 21a9 9 0 100-18 9 9 0 000 18z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
        />
      </>
    )
  },
  {
    to: '/favorites',
    label: 'Favorites',
    icon: (
      <path
        d="M12 20.5l-1.45-1.32C5.4 14.36 2 11.28 2 7.5 2 5 4 3 6.5 3c1.74 0 3.41.81 4.5 2.09A6 6 0 0115.5 3C18 3 20 5 20 7.5c0 3.78-3.4 6.86-8.55 11.68L12 20.5z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    )
  },
  {
    to: '/explore',
    label: 'Explore',
    icon: (
      <>
        <path
          d="M12 2a10 10 0 100 20 10 10 0 000-20z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
        />
        <path
          d="M14.8 9.2l-2 5.6-5.6 2 2-5.6 5.6-2z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </>
    )
  },
  {
    to: '/profile',
    label: 'Profile',
    icon: (
      <>
        <path
          d="M12 12a4 4 0 100-8 4 4 0 000 8z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
        />
        <path
          d="M5 20c0-3.3 3-6 7-6s7 2.7 7 6"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </>
    )
  }
];

export default function MobileNav() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="mobile-nav" aria-label="Primary">
      <div className="mobile-nav-items">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              isActive ? 'mobile-nav-link active' : 'mobile-nav-link'
            }
          >
            <span className="nav-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24">{item.icon}</svg>
            </span>
            <span className="nav-label">{item.label}</span>
          </NavLink>
        ))}
      </div>
      <button className="mobile-logout" type="button" onClick={handleLogout}>
        <span className="nav-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24">
            <path
              d="M10 17l-4-4 4-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M6 13h9a3 3 0 003-3V7a3 3 0 00-3-3H9"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>
        </span>
        <span>Log out</span>
      </button>
    </nav>
  );
}
