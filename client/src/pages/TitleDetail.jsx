import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Layout from '../components/Layout.jsx';
import StatusPill from '../components/StatusPill.jsx';
import EmptyState from '../components/EmptyState.jsx';
import Loader from '../components/Loader.jsx';
import api from '../api/client.js';
import { formatRating } from '../utils/format.js';
import { resolvePosterUrl } from '../utils/media.js';

export default function TitleDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [title, setTitle] = useState(null);
  const [userTitle, setUserTitle] = useState(null);
  const [form, setForm] = useState({ status: 'watchlist', rating: '', review: '', watchedAt: '', isFavorite: false });
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    setMessage('');
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
    } finally {
      setLoading(false);
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

  const handleToggleFavorite = () => {
    setForm((prev) => ({ ...prev, isFavorite: !prev.isFavorite }));
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

  if (loading) {
    return (
      <Layout>
        <Loader label="Loading title details..." />
      </Layout>
    );
  }

  if (!title) {
    return (
      <Layout>
        <EmptyState
          title="Title not found"
          description="We could not load this title. Try again from Explore."
          action={
            <button className="btn primary" type="button" onClick={() => navigate('/explore')}>
              Back to explore
            </button>
          }
        />
      </Layout>
    );
  }

  const posterUrl = resolvePosterUrl(title.PosterPath);
  const posterStyle = posterUrl
    ? { backgroundImage: `url(${posterUrl})` }
    : { backgroundImage: 'linear-gradient(135deg, #1d1f2a, #2a2f3b)' };

  return (
    <Layout>
      <div className="detail-grid">
        <div className="detail-poster" style={posterStyle}>
          {!posterUrl && <span className="poster-logo-text">RATEFLIX</span>}
        </div>
        <div className="detail-info">
          <div className="detail-header">
            <div>
              <h2>{title.Title}</h2>
              <p className="muted">{title.TitleType} - {title.ReleaseYear}</p>
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
              <div className="favorite-row">
                <span>Mark as favorite</span>
                <button
                  className={`icon-btn heart${form.isFavorite ? ' active' : ''}`}
                  type="button"
                  onClick={handleToggleFavorite}
                  aria-label={form.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                  aria-pressed={form.isFavorite}
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      d="M12 20.5l-1.45-1.32C5.4 14.36 2 11.28 2 7.5 2 5 4 3 6.5 3c1.74 0 3.41.81 4.5 2.09A6 6 0 0115.5 3C18 3 20 5 20 7.5c0 3.78-3.4 6.86-8.55 11.68L12 20.5z"
                      fill={form.isFavorite ? 'currentColor' : 'none'}
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              </div>
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
