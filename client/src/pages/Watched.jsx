import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout.jsx';
import TitleCard from '../components/TitleCard.jsx';
import EmptyState from '../components/EmptyState.jsx';
import LoadingGrid from '../components/LoadingGrid.jsx';
import api from '../api/client.js';
import { formatRating, formatDate } from '../utils/format.js';

export default function Watched() {
  const [items, setItems] = useState([]);
  const [sort, setSort] = useState('date');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const loadItems = async () => {
    setLoading(true);
    try {
      const response = await api.get('/user-titles?status=watched');
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

  const sorted = useMemo(() => {
    const copy = [...items];
    if (sort === 'rating') {
      copy.sort((a, b) => (b.Rating || 0) - (a.Rating || 0));
    } else {
      copy.sort((a, b) => new Date(b.WatchedAt || 0) - new Date(a.WatchedAt || 0));
    }
    return copy;
  }, [items, sort]);

  const handleRemove = async (item) => {
    await api.delete(`/user-titles/${item.UserTitleId}`);
    loadItems();
  };

  return (
    <Layout>
      <div className="page-header">
        <div>
          <h2>Watched</h2>
          <p className="muted">Your rated and reviewed titles.</p>
        </div>
        <div className="filter">
          <label>
            Sort by
            <select value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="date">Date</option>
              <option value="rating">Rating</option>
            </select>
          </label>
        </div>
      </div>

      {loading ? (
        <LoadingGrid count={6} />
      ) : sorted.length === 0 ? (
        <EmptyState
          title="No watched titles yet"
          description="Move a title from watchlist once you finish it."
          action={
            <button className="btn primary" type="button" onClick={() => navigate('/watchlist')}>
              Go to watchlist
            </button>
          }
        />
      ) : (
        <div className="card-grid">
          {sorted.map((item) => (
            <TitleCard
              key={item.UserTitleId}
              item={{ ...item, Review: `${formatRating(item.Rating)} - ${formatDate(item.WatchedAt)}` }}
              onSelect={() => navigate(`/title/${item.TitleId}`)}
              actions={
                <>
                  <button className="btn" type="button" onClick={() => navigate(`/title/${item.TitleId}`)}>
                    Update details
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
