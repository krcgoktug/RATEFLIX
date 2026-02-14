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

function pickTitles(items, count = 3) {
  return items
    .slice(0, count)
    .map((item) => item.Title)
    .filter(Boolean);
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

  const genreHighlights = topGenres(all);
  const favoritePicks = pickTitles(favorites, 3);
  const watchedPicks = pickTitles(watched, 3);
  const watchlistPicks = pickTitles(watchlist, 4);
  const lower = userMessage.toLowerCase();
  const wantsSeries = lower.includes('series') || lower.includes('show');
  const wantsWatchlistOrder = lower.includes('watchlist') || lower.includes('start') || lower.includes('first');

  const lines = [
    'Here is a polite local recommendation based on your library data:'
  ];

  if (genreHighlights.length) {
    lines.push(`- Your strongest genres look like: ${genreHighlights.join(', ')}.`);
  }
  if (favoritePicks.length) {
    lines.push(`- Favorite mood profile: ${favoritePicks.join(', ')}.`);
  }
  if (watchedPicks.length) {
    lines.push(`- Recently watched anchor titles: ${watchedPicks.join(', ')}.`);
  }

  if (wantsWatchlistOrder && watchlistPicks.length) {
    lines.push(`- Suggested watchlist order: ${watchlistPicks.join(' -> ')}.`);
  } else if (wantsSeries) {
    const seriesPool = all.filter((item) => String(item.TitleType || '').toLowerCase() === 'series');
    const seriesPicks = pickTitles(seriesPool, 5);
    if (seriesPicks.length) {
      lines.push(`- Series picks for you: ${seriesPicks.join(', ')}.`);
    } else if (watchlistPicks.length) {
      lines.push(`- Good next picks from your watchlist: ${watchlistPicks.join(', ')}.`);
    }
  } else if (watchlistPicks.length) {
    lines.push(`- Good next picks from your watchlist: ${watchlistPicks.join(', ')}.`);
  }

  lines.push('If you want, ask for a specific mood like "mind-bending", "cozy", or "intense thriller" and I will narrow it down.');
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
