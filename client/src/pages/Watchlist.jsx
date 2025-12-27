import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout.jsx';
import TitleCard from '../components/TitleCard.jsx';
import EmptyState from '../components/EmptyState.jsx';
import api from '../api/client.js';

export default function Watchlist() {
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const loadItems = async () => {
    setLoading(true);
    try {
      const response = await api.get('/user-titles?status=watchlist');
      setItems(response.data.items || []);
    } catch (err) {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadItems();
  }, []);

  const filtered = useMemo(() => {
    if (filter === 'all') return items;
    return items.filter((item) => item.TitleType.toLowerCase() === filter);
  }, [items, filter]);

  const handleMoveToWatched = async (item) => {
    await api.patch(`/user-titles/${item.UserTitleId}`, {
      status: 'watched',
      watchedAt: new Date().toISOString().slice(0, 10)
    });
    loadItems();
  };

  const handleRemove = async (item) => {
    await api.delete(`/user-titles/${item.UserTitleId}`);
    loadItems();
  };

  return (
    <Layout>
      <div className="page-header">
        <div>
          <h2>Watchlist</h2>
          <p className="muted">Titles you plan to watch next.</p>
        </div>
        <div className="filter">
          <label>
            Type
            <select value={filter} onChange={(e) => setFilter(e.target.value)}>
              <option value="all">All</option>
              <option value="movie">Movie</option>
              <option value="series">Series</option>
            </select>
          </label>
        </div>
      </div>

      {loading ? (
        <p className="muted">Loading...</p>
      ) : filtered.length === 0 ? (
        <EmptyState
          title="Your watchlist is empty"
          description="Add a movie or series to get started."
          action={
            <button className="btn primary" type="button" onClick={() => navigate('/add')}>
              Add a title
            </button>
          }
        />
      ) : (
        <div className="card-grid">
          {filtered.map((item) => (
            <TitleCard
              key={item.UserTitleId}
              item={item}
              onSelect={() => navigate(`/title/${item.TitleId}`)}
              actions={
                <>
                  <button className="btn" type="button" onClick={() => handleMoveToWatched(item)}>
                    Mark as watched
                  </button>
                  <button className="btn ghost" type="button" onClick={() => handleRemove(item)}>
                    Remove
                  </button>
                </>
              }
            />
          ))}
        </div>
      )}
    </Layout>
  );
}
