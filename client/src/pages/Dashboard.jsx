import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout.jsx';
import HeroCard from '../components/HeroCard.jsx';
import Loader from '../components/Loader.jsx';
import api from '../api/client.js';
import { formatRating, formatDate } from '../utils/format.js';

function StatCard({ label, value }) {
  return (
    <div className="stat-card">
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
    </div>
  );
}

export default function Dashboard() {
  const [data, setData] = useState({ summary: null, recent: [], featured: null });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const response = await api.get('/dashboard');
        setData(response.data);
      } catch (err) {
        setData({ summary: null, recent: [], featured: null });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const summary = data.summary || {};

  return (
    <Layout>
      <section className="dashboard-grid">
        <div className="dashboard-main">
          <HeroCard item={data.featured} />
          <div className="stats-row">
            <StatCard label="Total titles" value={summary.totalTitles || 0} />
            <StatCard label="Movies" value={summary.moviesCount || 0} />
            <StatCard label="Series" value={summary.seriesCount || 0} />
            <StatCard label="Watchlist" value={summary.watchlistCount || 0} />
            <StatCard label="Watched" value={summary.watchedCount || 0} />
            <StatCard label="Average rating" value={formatRating(summary.avgRating)} />
          </div>
        </div>
        <div className="dashboard-side">
          <div className="panel">
            <div className="panel-header">
              <h3>Recently watched</h3>
              <Link to="/watched" className="link">See all</Link>
            </div>
            {loading ? (
              <Loader label="Loading activity..." />
            ) : data.recent.length === 0 ? (
              <p className="muted">No watched titles yet.</p>
            ) : (
              <ul className="recent-list">
                {data.recent.map((item) => (
                  <li key={item.TitleId}>
                    <div>
                      <div className="recent-title">{item.Title}</div>
                      <div className="recent-meta">
                        {item.TitleType} - {formatDate(item.WatchedAt)}
                      </div>
                    </div>
                    <div className="recent-rating">{formatRating(item.Rating)}</div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>
    </Layout>
  );
}
