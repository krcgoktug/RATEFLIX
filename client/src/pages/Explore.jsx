import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout.jsx';
import TitleCard from '../components/TitleCard.jsx';
import EmptyState from '../components/EmptyState.jsx';
import LoadingGrid from '../components/LoadingGrid.jsx';
import api from '../api/client.js';
import { GENRES } from '../data/genres.js';

export default function Explore() {
  const [searchText, setSearchText] = useState('');
  const [filters, setFilters] = useState({ type: '', year: '', genre: '' });
  const [items, setItems] = useState([]);
  const [favoriteIds, setFavoriteIds] = useState([]);
  const [userTitleMap, setUserTitleMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  const loadItems = async (params = {}) => {
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
    loadItems();
    loadUserTitles();
  }, []);

  const loadUserTitles = async () => {
    try {
      const response = await api.get('/user-titles');
      const map = {};
      const favorites = [];
      (response.data.items || []).forEach((item) => {
        map[item.TitleId] = {
          status: item.Status,
          userTitleId: item.UserTitleId,
          isFavorite: item.IsFavorite
        };
        if (item.IsFavorite) {
          favorites.push(item.TitleId);
        }
      });
      setUserTitleMap(map);
      setFavoriteIds(favorites);
    } catch (err) {
      setUserTitleMap({});
      setFavoriteIds([]);
    }
  };

  const handleSearchChange = (event) => {
    setSearchText(event.target.value);
  };

  const handleFilterChange = (event) => {
    setFilters({ ...filters, [event.target.name]: event.target.value });
  };

  const handleSearch = () => {
    const query = searchText.trim();
    loadItems(query ? { search: query } : {});
  };

  const handleApplyFilters = () => {
    loadItems({
      type: filters.type,
      year: filters.year,
      genre: filters.genre
    });
  };

  const handleAdd = async (item) => {
    try {
      const response = await api.post('/user-titles', {
        titleId: item.TitleId,
        status: 'watchlist'
      });
      setUserTitleMap((prev) => ({
        ...prev,
        [item.TitleId]: {
          status: 'watchlist',
          userTitleId: response.data.userTitleId,
          isFavorite: prev[item.TitleId]?.isFavorite || false
        }
      }));
      setMessage('Added to watchlist.');
    } catch (err) {
      setMessage(err.response?.data?.message || 'Could not add title.');
    }
  };

  const handleToggleFavorite = async (item) => {
    const isFavorite = favoriteIds.includes(item.TitleId);
    try {
      const entry = userTitleMap[item.TitleId];
      if (entry?.userTitleId) {
        await api.patch(`/user-titles/${entry.userTitleId}`, { isFavorite: !isFavorite });
      } else if (!isFavorite) {
        const response = await api.post('/user-titles', {
          titleId: item.TitleId,
          status: 'watchlist',
          isFavorite: true
        });
        setUserTitleMap((prev) => ({
          ...prev,
          [item.TitleId]: {
            status: 'watchlist',
            userTitleId: response.data.userTitleId,
            isFavorite: true
          }
        }));
      }
      setFavoriteIds((prev) => {
        if (isFavorite) {
          return prev.filter((id) => id !== item.TitleId);
        }
        return [...new Set([...prev, item.TitleId])];
      });
      setUserTitleMap((prev) => {
        if (!prev[item.TitleId]) {
          return prev;
        }
        return {
          ...prev,
          [item.TitleId]: {
            ...prev[item.TitleId],
            isFavorite: !isFavorite
          }
        };
      });
      setMessage(isFavorite ? 'Removed from favorites.' : 'Added to favorites.');
    } catch (err) {
      setMessage(err.response?.data?.message || 'Could not update favorite.');
    }
  };

  return (
    <Layout>
      <div className="page-header explore-header">
        <div>
          <h2>Explore</h2>
          <p className="muted">Search and add titles to your watchlist.</p>
        </div>
        <div className="explore-controls">
          <div className="search-row">
            <label className="search-field">
              Search
              <div className="search-input">
                <input
                  name="search"
                  value={searchText}
                  onChange={handleSearchChange}
                  placeholder="Search by title"
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      handleSearch();
                    }
                  }}
                />
                <button className="search-btn" type="button" onClick={handleSearch} aria-label="Search">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      d="M21 21l-4.35-4.35m1.1-4.55a7.65 7.65 0 11-15.3 0 7.65 7.65 0 0115.3 0z"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              </div>
            </label>
          </div>
          <div className="filters-row">
            <label>
              Type
              <select name="type" value={filters.type} onChange={handleFilterChange}>
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
                onChange={handleFilterChange}
                placeholder="2024"
              />
            </label>
            <label>
              Genre
              <select
                name="genre"
                value={filters.genre}
                onChange={handleFilterChange}
              >
                <option value="">All</option>
                {GENRES.map((genre) => (
                  <option key={genre} value={genre}>
                    {genre}
                  </option>
                ))}
              </select>
            </label>
            <button className="btn filters-apply" type="button" onClick={handleApplyFilters}>
              Apply filters
            </button>
          </div>
        </div>
      </div>

      {message && <div className="alert">{message}</div>}

      {loading ? (
        <LoadingGrid count={9} />
      ) : items.length === 0 ? (
        <EmptyState
          title="No titles found"
          description="Try a different search or adjust filters."
          action={
            <button className="btn primary" type="button" onClick={() => navigate('/add')}>
              Add title
            </button>
          }
        />
      ) : (
        <div className="card-grid">
          {items.map((item) => {
            const isFavorite = favoriteIds.includes(item.TitleId);
            const status = userTitleMap[item.TitleId]?.status || '';
            const isWatchlisted = status === 'watchlist';
            const isWatched = status === 'watched';
            const actionLabel = isWatched ? 'Watched' : isWatchlisted ? 'In watchlist' : 'Add to watchlist';
            return (
              <TitleCard
                key={item.TitleId}
                item={{ ...item, Status: status }}
                onSelect={() => navigate(`/title/${item.TitleId}`)}
                actions={
                  <div className="actions-row">
                    <button
                      className="btn"
                      type="button"
                      onClick={() => handleAdd(item)}
                      disabled={isWatchlisted || isWatched}
                    >
                      {actionLabel}
                    </button>
                    <button
                      className={`icon-btn heart${isFavorite ? ' active' : ''}`}
                      type="button"
                      onClick={() => handleToggleFavorite(item)}
                      aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                      aria-pressed={isFavorite}
                    >
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path
                          d="M12 20.5l-1.45-1.32C5.4 14.36 2 11.28 2 7.5 2 5 4 3 6.5 3c1.74 0 3.41.81 4.5 2.09A6 6 0 0115.5 3C18 3 20 5 20 7.5c0 3.78-3.4 6.86-8.55 11.68L12 20.5z"
                          fill={isFavorite ? 'currentColor' : 'none'}
                          stroke="currentColor"
                          strokeWidth="1.6"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </button>
                  </div>
                }
              />
            );
          })}
        </div>
      )}
    </Layout>
  );
}
