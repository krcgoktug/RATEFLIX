import StatusPill from './StatusPill.jsx';
import { clampText } from '../utils/format.js';

export default function TitleCard({ item, onSelect, actions }) {
  const posterStyle = item.PosterPath
    ? { backgroundImage: `url(${item.PosterPath})` }
    : { backgroundImage: 'linear-gradient(135deg, #1d1f2a, #2a2f3b)' };

  return (
    <article className="title-card">
      <button className="poster" type="button" style={posterStyle} onClick={onSelect}>
        {!item.PosterPath && <span className="poster-placeholder">No Poster</span>}
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