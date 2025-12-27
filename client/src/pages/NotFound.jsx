import { Link } from 'react-router-dom';
import Layout from '../components/Layout.jsx';

export default function NotFound() {
  return (
    <Layout variant="auth">
      <div className="auth-card">
        <h1>Page not found</h1>
        <p className="muted">The page you requested does not exist.</p>
        <Link className="btn primary" to="/dashboard">Go to dashboard</Link>
      </div>
    </Layout>
  );
}