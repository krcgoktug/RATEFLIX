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

function buildFallbackReply({ profile }) {
  if (profile.summary.totalTitles === 0) {
    return [
      `Merhaba ${profile.firstName || ''}`.trim(),
      '',
      'Henuz listen bos gorunuyor. Sana daha iyi oneri verebilmem icin birkac film/dizi ekleyip bir kismini favorilere almani oneririm.',
      'Istersen once Explore sayfasindan baslayabiliriz.'
    ].join('\n');
  }

  const lines = [
    `Merhaba ${profile.firstName || ''}`.trim(),
    '',
    'Su an AI servisine baglanamadim ama listene gore hizli ve nazik bir oneri plani cikardim:'
  ];

  if (profile.topGenres.length) {
    lines.push(`- Zevk profilinde one cikan turler: ${profile.topGenres.join(', ')}.`);
  }

  if (profile.favorites.length) {
    const favoritePicks = profile.favorites.slice(0, 3).map((item) => item.Title).join(', ');
    lines.push(`- Favorilerinden anladigim ton: ${favoritePicks}. Bu cizgide icerikler seni memnun eder.`);
  }

  if (profile.watchlist.length) {
    const watchlistPicks = profile.watchlist
      .slice(0, 3)
      .map((item) => item.Title)
      .join(', ');
    lines.push(`- Siradaki izleme icin watchlist onerim: ${watchlistPicks}.`);
  } else {
    lines.push('- Watchlist tarafi bos gorunuyor, favori turlerine gore 3-4 icerik eklemen iyi olur.');
  }

  lines.push('- Istersen bana "bu aksam tek film oner" veya "favorilerime benzer 5 dizi oner" diye yaz, daha nokta atisi yonlendireyim.');
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
    'Default response language is Turkish unless the user clearly writes in another language.',
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
  try {
    const reply = await requestDeepSeek({ messages, profile });
    return { reply, provider: 'deepseek', usedFallback: false };
  } catch (err) {
    console.error('AI provider failed, using fallback:', err.message || err);
    return {
      reply: buildFallbackReply({ profile }),
      provider: 'fallback',
      usedFallback: true
    };
  }
}

module.exports = { createAssistantReply };
