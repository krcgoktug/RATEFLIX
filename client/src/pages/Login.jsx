import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout.jsx';
import api from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';

// Login form with a short retry for cold-started servers.
export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (event) => {
    setForm({ ...form, [event.target.name]: event.target.value });
  };

  // Submit credentials and store JWT on success.
  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      const attemptLogin = async () => {
        const response = await api.post('/auth/login', form);
        login(response.data);
        navigate('/dashboard');
      };

      await attemptLogin();
    } catch (err) {
      const shouldRetry = !err.response || err.response.status >= 500;
      if (shouldRetry) {
        setError('Server is waking up. Retrying...');
        await new Promise((resolve) => setTimeout(resolve, 2500));
        try {
          const response = await api.post('/auth/login', form);
          login(response.data);
          navigate('/dashboard');
          return;
        } catch (retryErr) {
          setError(
            retryErr.response?.data?.message ||
              'Server is waking up. Please try again in a few seconds.'
          );
        }
      } else {
        setError(err.response?.data?.message || 'Login failed.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout variant="auth">
      <div className="auth-card">
        <h1>Welcome back</h1>
        <p className="internal-note">Use your RATEFLIX account to continue.</p>
        {error && <div className="alert">{error}</div>}
        <form className="form" onSubmit={handleSubmit}>
          <label>
            Email
            <input
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              placeholder="you@example.com"
              required
            />
          </label>
          <label>
            Password
            <input
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              placeholder="******"
              required
            />
          </label>
          <button className="btn primary" type="submit" disabled={loading}>
            {loading ? 'Signing in...' : 'Login'}
          </button>
          <div className="auth-links-row">
            <Link className="auth-inline-link" to="/forgot-password" state={{ email: form.email }}>
              {'\u015Eifremi unuttum'}
            </Link>
          </div>
        </form>
        <p className="auth-footer">
          No account yet? <Link to="/register">Create one</Link>
        </p>
      </div>
    </Layout>
  );
}
