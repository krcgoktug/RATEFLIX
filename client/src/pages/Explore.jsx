import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout.jsx';
import TitleCard from '../components/TitleCard.jsx';
import EmptyState from '../components/EmptyState.jsx';
import api from '../api/client.js';
import { GENRES } from '../data/genres.js';

export default function Explore() {
  const [filters, setFilters] = useState({ search: '', type: '', year: '', genre: '' });
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  const loadItems = async (params) => {
    setLoading(true);
    setMessage('');
    try {
      const response = await api.get('/titles', { params });
      setItems(response.data.items || []);
    } catch (err) {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadItems(filters);
  }, []);

  const handleChange = (event) => {
    setFilters({ ...filters, [event.target.name]: event.target.value });
  };

  const handleApply = () => {
    loadItems(filters);
  };

  const handleAdd = async (item) => {
    try {
      await api.post('/user-titles', { titleId: item.TitleId, status: 'watchlist' });
      setMessage('Added to watchlist.');
    } catch (err) {
      setMessage(err.response?.data?.message || 'Could not add title.');
    }
  };

  return (
    <Layout>
      <div className="page-header">
        <div>
          <h2>Explore</h2>
          <p className="muted">Search and add titles to your watchlist.</p>
        </div>
        <div className="filter-row">
          <label>
            Search
            <input
              name="search"
              value={filters.search}
              onChange={handleChange}
              placeholder="Search by title"
            />
          </label>
          <label>
            Type
            <select name="type" value={filters.type} onChange={handleChange}>
              <option value="">All</option>
              <option value="Movie">Movie</option>
              <option value="Series">Series</option>
            </select>
          </label>
          <label>
            Year
            <input
              name="year"
              value={filters.year}
              onChange={handleChange}
              placeholder="2024"
            />
          </label>
          <label>
            Genre
            <select name="genre" value={filters.genre} onChange={handleChange}>
              <option value="">All</option>
              {GENRES.map((genre) => (
                <option key={genre} value={genre}>
                  {genre}
                </option>
              ))}
            </select>
          </label>
          <button className="btn" type="button" onClick={handleApply}>
            Apply
          </button>
        </div>
      </div>

      {message && <div className="alert">{message}</div>}

      {loading ? (
        <p className="muted">Loading...</p>
      ) : items.length === 0 ? (
        <EmptyState
          title="No titles found"
          description="Try a different search or add your own title."
          action={
            <button className="btn primary" type="button" onClick={() => navigate('/add')}>
              Add title
            </button>
          }
        />
      ) : (
        <div className="card-grid">
          {items.map((item) => (
            <TitleCard
              key={item.TitleId}
              item={item}
              onSelect={() => navigate(`/title/${item.TitleId}`)}
              actions={
                <button className="btn" type="button" onClick={() => handleAdd(item)}>
                  Add to watchlist
                </button>
              }
            />
          ))}
        </div>
      )}
    </Layout>
  );
}