import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout.jsx';
import TitleCard from '../components/TitleCard.jsx';
import EmptyState from '../components/EmptyState.jsx';
import api from '../api/client.js';

export default function Favorites() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const loadItems = async () => {
    setLoading(true);
    try {
      const response = await api.get('/user-titles?favorite=true');
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

  const handleUnfavorite = async (item) => {
    await api.patch(`/user-titles/${item.UserTitleId}`, { isFavorite: false });
    loadItems();
  };

  return (
    <Layout>
      <div className="page-header">
        <div>
          <h2>Favorites</h2>
          <p className="muted">Your top-rated picks.</p>
        </div>
      </div>

      {loading ? (
        <p className="muted">Loading...</p>
      ) : items.length === 0 ? (
        <EmptyState
          title="No favorites yet"
          description="Mark a title as favorite from its detail page."
          action={
            <button className="btn primary" type="button" onClick={() => navigate('/explore')}>
              Explore titles
            </button>
          }
        />
      ) : (
        <div className="card-grid">
          {items.map((item) => (
            <TitleCard
              key={item.UserTitleId}
              item={item}
              onSelect={() => navigate(`/title/${item.TitleId}`)}
              actions={
                <button className="btn ghost" type="button" onClick={() => handleUnfavorite(item)}>
                  Remove favorite
                </button>
              }
            />
          ))}
        </div>
      )}
    </Layout>
  );
}