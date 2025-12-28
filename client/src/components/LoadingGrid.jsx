export default function LoadingGrid({ count = 6 }) {
  return (
    <div className="card-grid" aria-hidden="true">
      {Array.from({ length: count }).map((_, index) => (
        <div className="skeleton-card" key={`skeleton-${index}`}>
          <div className="skeleton skeleton-poster"></div>
          <div className="skeleton-body">
            <div className="skeleton skeleton-line wide"></div>
            <div className="skeleton skeleton-line"></div>
            <div className="skeleton skeleton-line short"></div>
            <div className="skeleton-actions">
              <div className="skeleton skeleton-pill"></div>
              <div className="skeleton skeleton-pill small"></div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
