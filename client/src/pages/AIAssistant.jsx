import { useEffect, useMemo, useRef, useState } from 'react';
import Layout from '../components/Layout.jsx';
import api from '../api/client.js';

const starterMessage = {
  role: 'assistant',
  content:
    'Hi. I am RATEFLIX AI. I can suggest movies and series based on your favorites and watched history, with a polite and clear style.'
};

const quickPrompts = [
  'Suggest one movie for tonight based on my favorites.',
  'Recommend 5 series similar to my watched list.',
  'Give me high-rated but slower-paced picks.',
  'Which titles in my watchlist should I start with?'
];

function toGenreArray(items) {
  return items
    .flatMap((item) => String(item.Genres || '').split(',').map((genre) => genre.trim()))
    .filter(Boolean);
}

function topGenres(items, limit = 3) {
  const counts = new Map();
  for (const genre of toGenreArray(items)) {
    counts.set(genre, (counts.get(genre) || 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([genre]) => genre);
}

function normalizeTitle(value) {
  return String(value || '').trim().toLowerCase();
}

function uniqueByTitle(items) {
  const map = new Map();
  for (const item of items) {
    const key = normalizeTitle(item.Title);
    if (!key) continue;
    if (!map.has(key)) {
      map.set(key, item);
    }
  }
  return [...map.values()];
}

function itemGenres(item) {
  return String(item.Genres || '')
    .split(',')
    .map((genre) => genre.trim())
    .filter(Boolean);
}

function genreMatchScore(item, preferredGenres) {
  if (!preferredGenres.length) return 0;
  const set = new Set(itemGenres(item).map((genre) => genre.toLowerCase()));
  return preferredGenres.reduce(
    (score, genre) => (set.has(genre.toLowerCase()) ? score + 1 : score),
    0
  );
}

function detectRequestedGenres(message) {
  const lower = message.toLowerCase();
  const checks = [
    { label: 'Sci-Fi', keys: ['sci-fi', 'scifi', 'science fiction'] },
    { label: 'Drama', keys: ['drama'] },
    { label: 'Action', keys: ['action'] },
    { label: 'Thriller', keys: ['thriller'] },
    { label: 'Adventure', keys: ['adventure'] },
    { label: 'Comedy', keys: ['comedy', 'funny'] },
    { label: 'Fantasy', keys: ['fantasy'] },
    { label: 'Mystery', keys: ['mystery'] },
    { label: 'Romance', keys: ['romance', 'romantic'] },
    { label: 'Horror', keys: ['horror', 'scary'] }
  ];

  return checks
    .filter((item) => item.keys.some((key) => lower.includes(key)))
    .map((item) => item.label);
}

function sortCandidates(items, preferredGenres, prioritizeHighRating) {
  return [...items].sort((a, b) => {
    const genreDelta = genreMatchScore(b, preferredGenres) - genreMatchScore(a, preferredGenres);
    if (genreDelta !== 0) return genreDelta;

    const ratingA = Number(a.Rating || 0);
    const ratingB = Number(b.Rating || 0);
    if (prioritizeHighRating && ratingA !== ratingB) return ratingB - ratingA;

    const yearA = Number(a.ReleaseYear || 0);
    const yearB = Number(b.ReleaseYear || 0);
    if (yearA !== yearB) return yearB - yearA;

    return String(a.Title || '').localeCompare(String(b.Title || ''));
  });
}

function formatPick(item, preferredGenres) {
  const genres = itemGenres(item);
  const matched = genres.filter((genre) =>
    preferredGenres.some((preferred) => preferred.toLowerCase() === genre.toLowerCase())
  );
  const reason = matched.length ? `matches ${matched.join(', ')}` : (genres[0] ? `genre: ${genres[0]}` : 'taste match');
  return `${item.Title} (${item.TitleType || 'Title'}, ${item.ReleaseYear || 'N/A'}) - ${reason}`;
}

async function buildLocalFallbackReply(userMessage) {
  const [favoritesRes, watchedRes, watchlistRes] = await Promise.all([
    api.get('/user-titles?favorite=true'),
    api.get('/user-titles?status=watched'),
    api.get('/user-titles?status=watchlist')
  ]);

  const favorites = favoritesRes.data?.items || [];
  const watched = watchedRes.data?.items || [];
  const watchlist = watchlistRes.data?.items || [];
  const all = [...favorites, ...watched];

  if (all.length === 0 && watchlist.length === 0) {
    return [
      'I could not reach the AI service right now, but I can still help.',
      'Your library is currently empty, so there is not enough taste data yet.',
      'Please add a few titles to Favorites or Watched, then ask again for personalized recommendations.'
    ].join('\n');
  }

  const lower = userMessage.toLowerCase();
  const isGreeting =
    /(hi|hello|hey|how are you|how r u|what's up|whats up)/.test(lower) &&
    !/(movie|film|series|show|watchlist|recommend|suggest|pick)/.test(lower);
  const asksWatchlistOrder = /(watchlist|start|first|order)/.test(lower);
  const wantsSeries = lower.includes('series') || lower.includes('show');
  const wantsMovie = lower.includes('movie') || lower.includes('film');
  const wantsHighRated = /(high-rated|top rated|best|10\/10|high rating|must watch)/.test(lower);
  const wantsSlowPace = /(slow|calm|cozy|chill|slower-paced|slow-paced)/.test(lower);

  const requestedGenres = detectRequestedGenres(lower);
  const preferredGenres = requestedGenres.length ? requestedGenres : topGenres(all, 3);
  const favoritePool = uniqueByTitle([...favorites]);
  const watchedPool = uniqueByTitle([...watched]);
  const watchlistPool = uniqueByTitle([...watchlist]);
  const combinedPool = uniqueByTitle([...watchlistPool, ...favoritePool, ...watchedPool]);

  let pool = combinedPool;
  if (wantsSeries) {
    pool = pool.filter((item) => String(item.TitleType || '').toLowerCase() === 'series');
  } else if (wantsMovie) {
    pool = pool.filter((item) => String(item.TitleType || '').toLowerCase() === 'movie');
  }

  if (requestedGenres.length) {
    pool = pool.filter((item) =>
      itemGenres(item).some((genre) =>
        requestedGenres.some((requested) => requested.toLowerCase() === genre.toLowerCase())
      )
    );
  }

  if (wantsSlowPace) {
    const slowKeywords = ['Drama', 'Mystery', 'Romance'];
    const slowPool = pool.filter((item) =>
      itemGenres(item).some((genre) =>
        slowKeywords.some((slow) => slow.toLowerCase() === genre.toLowerCase())
      )
    );
    if (slowPool.length) {
      pool = slowPool;
    }
  }

  const sortedPool = sortCandidates(pool.length ? pool : combinedPool, preferredGenres, wantsHighRated);
  const watchlistOrder = sortCandidates(watchlistPool, preferredGenres, true).slice(0, 5);
  const picks = sortedPool.slice(0, 5);

  if (isGreeting) {
    const helloPick = picks[0];
    return [
      'I am doing well, thank you. Hope you are doing great too.',
      helloPick
        ? `Since you asked, here is one quick pick for you: ${formatPick(helloPick, preferredGenres)}.`
        : 'If you want, I can suggest a movie or series based on your favorites.'
    ].join('\n');
  }

  const lines = ['Here are personalized picks from your library patterns:'];

  if (preferredGenres.length) {
    lines.push(`- Strong taste signal: ${preferredGenres.join(', ')}.`);
  }

  if (asksWatchlistOrder && watchlistOrder.length) {
    lines.push('- Suggested watchlist order:');
    for (const item of watchlistOrder) {
      lines.push(`  - ${formatPick(item, preferredGenres)}`);
    }
    lines.push('- If you want, I can also make a weekend marathon order.');
    return lines.join('\n');
  }

  if (!picks.length) {
    lines.push('- I need a bit more signal. Please add a few more favorites or watched titles.');
    return lines.join('\n');
  }

  const titleCount = wantsSeries || wantsMovie ? 5 : 4;
  lines.push('- Recommended picks:');
  for (const item of picks.slice(0, titleCount)) {
    lines.push(`  - ${formatPick(item, preferredGenres)}`);
  }
  lines.push('- Tell me your mood (mind-bending, cozy, intense thriller, etc.) and I will narrow this list further.');
  return lines.join('\n');
}

export default function AIAssistant() {
  const [messages, setMessages] = useState([starterMessage]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, loading]);

  const canSend = useMemo(() => input.trim().length > 0 && !loading, [input, loading]);

  const handleSend = async (event) => {
    event.preventDefault();
    const userMessage = input.trim();
    if (!userMessage || loading) return;

    const outgoing = { role: 'user', content: userMessage };
    const history = [...messages, outgoing];
    setMessages(history);
    setInput('');
    setError('');
    setLoading(true);

    try {
      const response = await api.post('/ai/chat', { messages: history });
      const reply = String(response.data?.reply || '').trim();
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: reply || 'I could not generate a response just now. Please try again.'
        }
      ]);
      setError('');
    } catch (err) {
      try {
        const localReply = await buildLocalFallbackReply(userMessage);
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: localReply }
        ]);
        setError('');
      } catch (fallbackErr) {
        setError(err.response?.data?.message || 'Could not get an AI response. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setMessages([starterMessage]);
    setInput('');
    setError('');
  };

  return (
    <Layout>
      <section className="ai-page">
        <div className="page-header">
          <div>
            <h2>AI Assistant</h2>
            <p className="muted">
              Get personalized recommendations from your favorites and watched history.
            </p>
          </div>
          <button className="btn ghost" type="button" onClick={handleReset} disabled={loading}>
            New Chat
          </button>
        </div>

        <div className="ai-quick-row">
          {quickPrompts.map((prompt) => (
            <button
              key={prompt}
              type="button"
              className="ai-quick-btn"
              onClick={() => setInput(prompt)}
              disabled={loading}
            >
              {prompt}
            </button>
          ))}
        </div>

        <section className="ai-chat-card" aria-label="AI chat">
          <div className="ai-chat-stream">
            {messages.map((message, index) => (
              <article
                key={`${message.role}-${index}`}
                className={`ai-msg ${message.role === 'user' ? 'user' : 'assistant'}`}
              >
                <div className="ai-msg-role">
                  {message.role === 'user' ? 'You' : 'RATEFLIX AI'}
                </div>
                <div className="ai-msg-bubble">{message.content}</div>
              </article>
            ))}

            {loading && (
              <article className="ai-msg assistant">
                <div className="ai-msg-role">RATEFLIX AI</div>
                <div className="ai-msg-bubble ai-msg-thinking">Generating recommendations...</div>
              </article>
            )}

            <div ref={endRef} />
          </div>

          <form className="ai-chat-form" onSubmit={handleSend}>
            <input
              className="ai-chat-input"
              type="text"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Example: Recommend 3 sci-fi movies similar to my favorites."
              maxLength={500}
              disabled={loading}
            />
            <button className="btn primary" type="submit" disabled={!canSend}>
              {loading ? 'Please wait...' : 'Send'}
            </button>
          </form>

          {error && <div className="alert">{error}</div>}
        </section>
      </section>
    </Layout>
  );
}
