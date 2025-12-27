import StatusPill from './StatusPill.jsx';
import { clampText } from '../utils/format.js';
import { resolvePosterUrl } from '../utils/media.js';

export default function TitleCard({ item, onSelect, actions }) {
  const posterUrl = resolvePosterUrl(item.PosterPath);
  const posterStyle = posterUrl
    ? { backgroundImage: `url(${posterUrl})` }
    : { backgroundImage: 'linear-gradient(135deg, #1d1f2a, #2a2f3b)' };

  return (
    <article className="title-card">
      <button className="poster" type="button" style={posterStyle} onClick={onSelect}>
        {!posterUrl && <span className="poster-logo-text">RATEFLIX</span>}
      </button>
      <div className="title-card-body">
        <div className="title-row">
          <h3>{item.Title}</h3>
          {item.Status && <StatusPill status={item.Status} />}
        </div>
        <div className="title-meta">
          <span>{item.TitleType}</span>
          <span>{item.ReleaseYear}</span>
          {item.Genres && <span>{item.Genres}</span>}
        </div>
        {item.Review && <p className="title-review">{clampText(item.Review)}</p>}
        {actions && <div className="card-actions">{actions}</div>}
      </div>
    </article>
  );
}
