import Topbar from './Topbar.jsx';
import Sidebar from './Sidebar.jsx';
import MobileNav from './MobileNav.jsx';

export default function Layout({ children, variant = 'app' }) {
  return (
    <div className={`app-shell variant-${variant}`}>
      <div className="bg-blur" aria-hidden="true"></div>
      {variant === 'app' && <Sidebar />}
      <div className="app-main">
        <Topbar variant={variant} />
        <main className="app-content">{children}</main>
      </div>
      {variant === 'app' && <MobileNav />}
    </div>
  );
}
