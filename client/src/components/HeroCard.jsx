import { formatRating } from '../utils/format.js';

export default function HeroCard({ item }) {
  if (!item) {
    return (
      <div className="hero-card">
        <div>
          <h2>Your featured pick</h2>
          <p>Add a rating to see a featured title here.</p>
        </div>
      </div>
    );
  }

  const posterStyle = item.PosterPath
    ? { backgroundImage: `url(${item.PosterPath})` }
    : { backgroundImage: 'linear-gradient(135deg, #1d1f2a, #2a2f3b)' };

  return (
    <div className="hero-card">
      <div className="hero-info">
        <div className="hero-label">Featured</div>
        <h2>{item.Title}</h2>
        <p>
          {item.TitleType} ? {item.ReleaseYear}
        </p>
        <div className="hero-rating">{formatRating(item.Rating)}</div>
      </div>
      <div className="hero-poster" style={posterStyle}></div>
    </div>
  );
}