const fetch = require('node-fetch');

function parsePositiveInt(value, fallback, max = 60000) {
  const parsed = parseInt(String(value || ''), 10);
  if (Number.isNaN(parsed) || parsed <= 0) {
    return fallback;
  }
  return Math.min(parsed, max);
}

function trimTrailingSlash(value) {
  return String(value || '').replace(/\/+$/, '');
}

function formatTitle(item) {
  const meta = [item.TitleType, item.ReleaseYear].filter(Boolean).join(', ');
  const flags = [];
  if (item.IsFavorite) flags.push('favorite');
  if (item.Status === 'watched') flags.push('watched');
  if (item.Status === 'watchlist') flags.push('watchlist');

  return `${item.Title} (${meta || 'Unknown'})`
    + `${item.Genres ? ` | genres: ${item.Genres}` : ''}`
    + `${item.Rating ? ` | rating: ${item.Rating}/10` : ''}`
    + `${flags.length ? ` | tags: ${flags.join(', ')}` : ''}`;
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
  const lower = String(message || '').toLowerCase();
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

function getLastUserMessage(messages) {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    if (messages[i]?.role === 'user' && messages[i]?.content) {
      return String(messages[i].content).trim();
    }
  }
  return '';
}

function buildProfileContext(profile) {
  const topGenres = profile.topGenres.length ? profile.topGenres.join(', ') : 'N/A';
  const favorites = profile.favorites.slice(0, 8).map(formatTitle);
  const watched = profile.watched.slice(0, 10).map(formatTitle);
  const watchlist = profile.watchlist.slice(0, 10).map(formatTitle);

  return [
    `User first name: ${profile.firstName || 'User'}`,
    `Top genres: ${topGenres}`,
    `Stats: total=${profile.summary.totalTitles}, watched=${profile.summary.watchedCount}, watchlist=${profile.summary.watchlistCount}, favorites=${profile.summary.favoriteCount}, avgRating=${profile.summary.avgRating || 0}`,
    `Favorites:\n${favorites.length ? favorites.map((item) => `- ${item}`).join('\n') : '- none'}`,
    `Watched:\n${watched.length ? watched.map((item) => `- ${item}`).join('\n') : '- none'}`,
    `Watchlist:\n${watchlist.length ? watchlist.map((item) => `- ${item}`).join('\n') : '- none'}`
  ].join('\n');
}

function buildFallbackReply({ profile, messages }) {
  const userMessage = getLastUserMessage(messages);
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
  const preferredGenres = requestedGenres.length ? requestedGenres : profile.topGenres.slice(0, 3);

  const favoritePool = uniqueByTitle([...profile.favorites]);
  const watchedPool = uniqueByTitle([...profile.watched]);
  const watchlistPool = uniqueByTitle([...profile.watchlist]);
  const combinedPool = uniqueByTitle([...watchlistPool, ...favoritePool, ...watchedPool]);

  if (profile.summary.totalTitles === 0) {
    return [
      `Hi ${profile.firstName || ''}`.trim(),
      '',
      'Your list is still empty. Please add a few movies or series so I can personalize recommendations better.',
      'You can start from the Explore page.'
    ].join('\n');
  }

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
      `Hi ${profile.firstName || ''}`.trim(),
      'I am doing well, thanks for asking.',
      helloPick
        ? `A quick pick for you right now: ${formatPick(helloPick, preferredGenres)}.`
        : 'If you want, ask me for a movie or series and I will suggest one.'
    ].join('\n');
  }

  const lines = [
    `Hi ${profile.firstName || ''}`.trim(),
    'Here are personalized picks from your library patterns:'
  ];

  if (preferredGenres.length) {
    lines.push(`- Strong taste signal: ${preferredGenres.join(', ')}.`);
  }

  if (asksWatchlistOrder && watchlistOrder.length) {
    lines.push('- Suggested watchlist order:');
    for (const item of watchlistOrder) {
      lines.push(`  - ${formatPick(item, preferredGenres)}`);
    }
    lines.push('- Want a weekend marathon order too?');
    return lines.join('\n');
  }

  if (!picks.length) {
    lines.push('- I need more signal. Add a few favorites or watched titles and ask again.');
    return lines.join('\n');
  }

  const count = wantsSeries || wantsMovie ? 5 : 4;
  lines.push('- Recommended picks:');
  for (const item of picks.slice(0, count)) {
    lines.push(`  - ${formatPick(item, preferredGenres)}`);
  }
  lines.push('- Tell me your mood and I will narrow these further.');
  return lines.join('\n');
}

async function withTimeout(promise, timeoutMs, timeoutMessage) {
  let timeoutId = null;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

async function requestDeepSeek({ messages, profile }) {
  const apiKey = String(process.env.DEEPSEEK_API_KEY || '').trim();
  if (!apiKey) {
    throw new Error('DEEPSEEK_API_KEY is not configured.');
  }

  const baseUrl = trimTrailingSlash(process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1');
  const model = String(process.env.DEEPSEEK_MODEL || process.env.AI_MODEL || 'deepseek-chat').trim();
  const timeoutMs = parsePositiveInt(process.env.AI_TIMEOUT_MS, 20000, 120000);

  const systemPrompt = [
    'You are RATEFLIX AI, a polite movie and series assistant.',
    'Always keep a respectful and warm tone.',
    'Default response language is English.',
    'Use the provided user profile context to personalize recommendations.',
    'Recommend concrete titles and briefly explain why they fit the user taste.',
    'Avoid spoilers.',
    'Keep responses concise and practical.'
  ].join(' ');

  const payload = {
    model,
    temperature: 0.7,
    max_tokens: 700,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'system', content: `User taste profile:\n${buildProfileContext(profile)}` },
      ...messages
    ]
  };

  const response = await withTimeout(
    fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify(payload)
    }),
    timeoutMs,
    'AI request timed out.'
  );

  if (!response.ok) {
    let details = response.statusText;
    try {
      const errorPayload = await response.json();
      details = errorPayload?.error?.message || errorPayload?.message || details;
    } catch (err) {
      // keep status text
    }
    throw new Error(`DeepSeek error (${response.status}): ${details}`);
  }

  const data = await response.json();
  const reply = data?.choices?.[0]?.message?.content;
  if (!reply || typeof reply !== 'string') {
    throw new Error('DeepSeek response did not include a valid reply.');
  }

  return reply.trim();
}

async function createAssistantReply({ messages, profile }) {
  const provider = String(process.env.AI_PROVIDER || 'deepseek').trim().toLowerCase();
  if (provider !== 'deepseek') {
    return {
      reply: buildFallbackReply({ profile, messages }),
      provider: 'fallback',
      usedFallback: true
    };
  }

  try {
    const reply = await requestDeepSeek({ messages, profile });
    return { reply, provider: 'deepseek', usedFallback: false };
  } catch (err) {
    console.error('AI provider failed, using fallback:', err.message || err);
    return {
      reply: buildFallbackReply({ profile, messages }),
      provider: 'fallback',
      usedFallback: true
    };
  }
}

module.exports = { createAssistantReply };
