import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout.jsx';
import api from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function Register() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (event) => {
    setForm({ ...form, [event.target.name]: event.target.value });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      const response = await api.post('/auth/register', form);
      login(response.data);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout variant="auth">
      <div className="auth-card">
        <h1>Create your account</h1>
        <p className="muted">Track movies, series, and your favorites.</p>
        {error && <div className="alert">{error}</div>}
        <form className="form" onSubmit={handleSubmit}>
          <div className="grid two">
            <label>
              First name
              <input
                name="firstName"
                value={form.firstName}
                onChange={handleChange}
                placeholder="Goktug"
                required
              />
            </label>
            <label>
              Last name
              <input
                name="lastName"
                value={form.lastName}
                onChange={handleChange}
                placeholder="Krc"
                required
              />
            </label>
          </div>
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
              placeholder="At least 6 characters"
              required
            />
          </label>
          <button className="btn primary" type="submit" disabled={loading}>
            {loading ? 'Creating...' : 'Register'}
          </button>
        </form>
        <p className="auth-footer">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </Layout>
  );
}