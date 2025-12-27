import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Layout from '../components/Layout.jsx';
import StatusPill from '../components/StatusPill.jsx';
import api from '../api/client.js';
import { formatRating } from '../utils/format.js';

export default function TitleDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [title, setTitle] = useState(null);
  const [userTitle, setUserTitle] = useState(null);
  const [form, setForm] = useState({ status: 'watchlist', rating: '', review: '', watchedAt: '', isFavorite: false });
  const [message, setMessage] = useState('');

  const loadData = async () => {
    try {
      const [titleRes, userRes] = await Promise.all([
        api.get(`/titles/${id}`),
        api.get(`/user-titles?titleId=${id}`)
      ]);
      setTitle(titleRes.data.item);
      const found = userRes.data.items?.[0] || null;
      setUserTitle(found);
      if (found) {
        setForm({
          status: found.Status,
          rating: found.Rating || '',
          review: found.Review || '',
          watchedAt: found.WatchedAt ? found.WatchedAt.slice(0, 10) : '',
          isFavorite: found.IsFavorite
        });
      }
    } catch (err) {
      setTitle(null);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setForm({
      ...form,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const handleSave = async () => {
    if (!userTitle) return;
    await api.patch(`/user-titles/${userTitle.UserTitleId}`, {
      status: form.status,
      rating: form.rating || null,
      review: form.review || null,
      watchedAt: form.watchedAt || null,
      isFavorite: form.isFavorite
    });
    setMessage('Saved changes.');
    loadData();
  };

  const handleDelete = async () => {
    if (!userTitle) return;
    await api.delete(`/user-titles/${userTitle.UserTitleId}`);
    navigate('/watchlist');
  };

  const handleAdd = async () => {
    await api.post('/user-titles', { titleId: id, status: 'watchlist' });
    loadData();
  };

  if (!title) {
    return (
      <Layout>
        <p className="muted">Loading title details...</p>
      </Layout>
    );
  }

  const posterStyle = title.PosterPath
    ? { backgroundImage: `url(${title.PosterPath})` }
    : { backgroundImage: 'linear-gradient(135deg, #1d1f2a, #2a2f3b)' };

  return (
    <Layout>
      <div className="detail-grid">
        <div className="detail-poster" style={posterStyle}></div>
        <div className="detail-info">
          <div className="detail-header">
            <div>
              <h2>{title.Title}</h2>
              <p className="muted">{title.TitleType} ? {title.ReleaseYear}</p>
              {title.Genres && <p className="muted">{title.Genres}</p>}
            </div>
            {userTitle && <StatusPill status={userTitle.Status} />}
          </div>

          {message && <div className="alert">{message}</div>}

          {!userTitle ? (
            <button className="btn primary" type="button" onClick={handleAdd}>
              Add to watchlist
            </button>
          ) : (
            <div className="detail-form">
              <label>
                Status
                <select name="status" value={form.status} onChange={handleChange}>
                  <option value="watchlist">Watchlist</option>
                  <option value="watched">Watched</option>
                </select>
              </label>
              <label>
                Rating (1-10)
                <input name="rating" value={form.rating} onChange={handleChange} />
              </label>
              <label>
                Watched date
                <input name="watchedAt" type="date" value={form.watchedAt} onChange={handleChange} />
              </label>
              <label>
                Review
                <textarea name="review" rows="3" value={form.review} onChange={handleChange}></textarea>
              </label>
              <label className="checkbox-row">
                <input
                  type="checkbox"
                  name="isFavorite"
                  checked={form.isFavorite}
                  onChange={handleChange}
                />
                Mark as favorite
              </label>
              <div className="detail-actions">
                <button className="btn primary" type="button" onClick={handleSave}>
                  Save
                </button>
                <button className="btn ghost" type="button" onClick={handleDelete}>
                  Remove
                </button>
              </div>
              <div className="detail-rating">Current rating: {formatRating(userTitle.Rating)}</div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}