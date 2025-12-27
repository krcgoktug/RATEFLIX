import { useEffect, useState } from 'react';
import Layout from '../components/Layout.jsx';
import api from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function Profile() {
  const { setUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [topGenre, setTopGenre] = useState(null);
  const [form, setForm] = useState({ currentPassword: '', newPassword: '' });
  const [message, setMessage] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const [meRes, statsRes] = await Promise.all([
          api.get('/auth/me'),
          api.get('/dashboard/profile')
        ]);
        setProfile(meRes.data.user);
        setUser(meRes.data.user);
        setTopGenre(statsRes.data.topGenre);
      } catch (err) {
        setProfile(null);
      }
    };
    load();
  }, [setUser]);

  const handleChange = (event) => {
    setForm({ ...form, [event.target.name]: event.target.value });
  };

  const handlePassword = async (event) => {
    event.preventDefault();
    setMessage('');
    try {
      await api.patch('/auth/password', form);
      setMessage('Password updated.');
      setForm({ currentPassword: '', newPassword: '' });
    } catch (err) {
      setMessage(err.response?.data?.message || 'Could not update password.');
    }
  };

  return (
    <Layout>
      <div className="page-header">
        <div>
          <h2>Profile</h2>
          <p className="muted">Manage your account and quick stats.</p>
        </div>
      </div>

      <div className="profile-grid">
        <div className="card">
          <h3>Account</h3>
          {profile ? (
            <div className="profile-info">
              <div>
                <span className="label">Name</span>
                <p>{profile.FirstName} {profile.LastName}</p>
              </div>
              <div>
                <span className="label">Email</span>
                <p>{profile.Email}</p>
              </div>
              <div>
                <span className="label">Member since</span>
                <p>{new Date(profile.CreatedAt).toLocaleDateString()}</p>
              </div>
            </div>
          ) : (
            <p className="muted">Loading profile...</p>
          )}
        </div>

        <div className="card">
          <h3>Quick stats</h3>
          {topGenre ? (
            <div className="stat-highlight">
              <div className="stat-value">{topGenre.Name}</div>
              <div className="stat-label">Most watched genre</div>
            </div>
          ) : (
            <p className="muted">No stats yet.</p>
          )}
        </div>

        <div className="card">
          <h3>Change password</h3>
          {message && <div className="alert">{message}</div>}
          <form className="form" onSubmit={handlePassword}>
            <label>
              Current password
              <input
                type="password"
                name="currentPassword"
                value={form.currentPassword}
                onChange={handleChange}
                required
              />
            </label>
            <label>
              New password
              <input
                type="password"
                name="newPassword"
                value={form.newPassword}
                onChange={handleChange}
                required
              />
            </label>
            <button className="btn" type="submit">Update</button>
          </form>
        </div>
      </div>
    </Layout>
  );
}