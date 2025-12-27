export default function StatusPill({ status }) {
  const normalized = status === 'watched' ? 'watched' : 'watchlist';
  const colors = {
    watchlist: '#f2c94c',
    watched: '#27ae60'
  };

  return (
    <span
      className="status-pill"
      style={{ backgroundColor: colors[normalized] || '#4f4f4f' }}
    >
      {normalized.toUpperCase()}
    </span>
  );
}