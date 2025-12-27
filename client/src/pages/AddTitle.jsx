import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout.jsx';
import api from '../api/client.js';
import { GENRES } from '../data/genres.js';

export default function AddTitle() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    title: '',
    type: 'Movie',
    year: '',
    status: 'watchlist',
    rating: '',
    review: '',
    watchedAt: '',
    isFavorite: false,
    genres: []
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const toggleFavorite = () => {
    setForm((prev) => ({ ...prev, isFavorite: !prev.isFavorite }));
  };

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setForm({
      ...form,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const toggleGenre = (genre) => {
    setForm((prev) => {
      if (prev.genres.includes(genre)) {
        return { ...prev, genres: prev.genres.filter((g) => g !== genre) };
      }
      return { ...prev, genres: [...prev.genres, genre] };
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const payload = new FormData();
      payload.append('title', form.title);
      payload.append('type', form.type);
      payload.append('year', form.year);
      payload.append('status', form.status);
      payload.append('rating', form.rating || '');
      payload.append('review', form.review || '');
      payload.append('watchedAt', form.watchedAt || '');
      payload.append('isFavorite', form.isFavorite);
      payload.append('genres', JSON.stringify(form.genres));
      await api.post('/titles', payload);
      navigate(form.status === 'watched' ? '/watched' : '/watchlist');
    } catch (err) {
      setError(err.response?.data?.message || 'Could not add title.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="page-header">
        <div>
          <h2>Add Movie / Series</h2>
          <p className="muted">Create a new title and save it to your list.</p>
        </div>
      </div>

      {error && <div className="alert">{error}</div>}

      <form className="form card" onSubmit={handleSubmit}>
        <div className="grid two">
          <label>
            Title
            <input
              name="title"
              value={form.title}
              onChange={handleChange}
              placeholder="Interstellar"
              required
            />
          </label>
          <label>
            Type
            <select name="type" value={form.type} onChange={handleChange}>
              <option value="Movie">Movie</option>
              <option value="Series">Series</option>
            </select>
          </label>
        </div>
        <div className="grid two">
          <label>
            Release year
            <input
              name="year"
              value={form.year}
              onChange={handleChange}
              placeholder="2024"
              required
            />
          </label>
          <label>
            Status
            <select name="status" value={form.status} onChange={handleChange}>
              <option value="watchlist">Watchlist</option>
              <option value="watched">Watched</option>
            </select>
          </label>
        </div>

        <label>
          Genres (multi-select)
          <div className="genre-grid">
            {GENRES.map((genre) => (
              <label
                key={genre}
                className={`chip ${form.genres.includes(genre) ? 'selected' : ''}`}
              >
                <input
                  type="checkbox"
                  checked={form.genres.includes(genre)}
                  onChange={() => toggleGenre(genre)}
                />
                {genre}
              </label>
            ))}
          </div>
        </label>

        <div className="favorite-row">
          <span>Add to favorites</span>
          <button
            className={`icon-btn heart ${form.isFavorite ? 'active' : ''}`}
            type="button"
            onClick={toggleFavorite}
            aria-pressed={form.isFavorite}
            aria-label="Add to favorites"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M12 20.5l-1.45-1.32C5.4 14.36 2 11.28 2 7.5 2 5 4 3 6.5 3c1.74 0 3.41.81 4.5 2.09A6 6 0 0115.5 3C18 3 20 5 20 7.5c0 3.78-3.4 6.86-8.55 11.68L12 20.5z"
                fill="currentColor"
              />
            </svg>
          </button>
        </div>

        {form.status === 'watched' && (
          <div className="grid two">
            <label>
              Rating (1-10)
              <input
                name="rating"
                value={form.rating}
                onChange={handleChange}
                placeholder="8"
              />
            </label>
            <label>
              Watched date
              <input
                name="watchedAt"
                type="date"
                value={form.watchedAt}
                onChange={handleChange}
              />
            </label>
          </div>
        )}

        {form.status === 'watched' && (
          <label>
            Review (optional)
            <textarea
              name="review"
              value={form.review}
              onChange={handleChange}
              placeholder="Short review"
              rows="3"
            ></textarea>
          </label>
        )}

        <button className="btn primary" type="submit" disabled={loading}>
          {loading ? 'Saving...' : 'Save title'}
        </button>
      </form>
    </Layout>
  );
}
