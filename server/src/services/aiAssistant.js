const fetch = require('node-fetch');
const ASSISTANT_VERSION = 'chat-v3';

function parsePositiveInt(value, fallback, max = 60000) {
  const parsed = parseInt(String(value || ''), 10);
  if (Number.isNaN(parsed) || parsed <= 0) return fallback;
  return Math.min(parsed, max);
}

function trimTrailingSlash(value) {
  return String(value || '').replace(/\/+$/, '');
}

function getLastUserMessage(messages) {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    if (messages[i]?.role === 'user' && messages[i]?.content) {
      return String(messages[i].content).trim();
    }
  }
  return '';
}

function detectLanguage(message) {
  const lower = String(message || '').toLowerCase();
  const trChars = (lower.match(/[\u00e7\u011f\u0131\u00f6\u015f\u00fc]/g) || []).length;
  const trWords = (lower.match(/\b(ve|ile|bir|naber|nasilsin|nas\u0131ls\u0131n|merhaba|selam|film|dizi|oner|oneri|izle|hangi|neden|nasil|nas\u0131l|kim|ne|turkce|turkce|favori|kategori|tavsiye)\b/g) || []).length;
  const enWords = (lower.match(/\b(the|and|what|which|how|why|who|movie|series|recommend|suggest|watch|favorite|favourite|category)\b/g) || []).length;
  return trChars + trWords > enWords ? 'tr' : 'en';
}

function t(lang, trText, enText) {
  return lang === 'tr' ? trText : enText;
}

function trySolveBasicMath(message) {
  const normalized = String(message || '')
    .toLowerCase()
    .replace(/,/g, '.')
    .replace(/\bplus\b/g, '+')
    .replace(/\barti\b/g, '+')
    .replace(/\bminus\b/g, '-')
    .replace(/\beksi\b/g, '-')
    .replace(/\btimes\b/g, '*')
    .replace(/\bx\b/g, '*')
    .replace(/\bcarpi\b/g, '*')
    .replace(/\bmultiplied by\b/g, '*')
    .replace(/\bdivided by\b/g, '/')
    .replace(/\bbolu\b/g, '/');

  const match = normalized.match(/(-?\d+(?:\.\d+)?)\s*([+\-*/])\s*(-?\d+(?:\.\d+)?)/);
  if (!match) return null;

  const left = Number(match[1]);
  const op = match[2];
  const right = Number(match[3]);
  if (Number.isNaN(left) || Number.isNaN(right)) return null;

  let value = null;
  if (op === '+') value = left + right;
  if (op === '-') value = left - right;
  if (op === '*') value = left * right;
  if (op === '/') {
    if (right === 0) return null;
    value = left / right;
  }
  if (value === null || !Number.isFinite(value)) return null;
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(6)));
}

function detectMode(message) {
  const lower = String(message || '').toLowerCase();
  const recommendationRegex = /(recommend|suggest|pick|what should i watch|watch next|similar to|based on my favorites|watchlist order|tavsiye|oner|oneri|izlemeli|izleyeyim|benzer|hangi filmi izleyeyim|hangi diziyi izleyeyim)/;
  const mediaRegex = /(movie|film|series|tv|show|dizi|genre|kategori|izle|watch)/;

  return {
    asksTurkish: /(turkce|speak turkish|turkish konu[s\u015f]|turkce konu[s\u015f]|t[\u00fcu]rk[\u00e7c]e konu[s\u015f])/.test(lower),
    asksEnglish: /(english|ingilizce|speak english)/.test(lower),
    asksHistory: /(history|tarih|teach|explain|timeline|hollywood|industry|how did|sinema tarihi|turkish cinema|turk sinemasi)/.test(lower),
    asksRecommendation: recommendationRegex.test(lower),
    isMediaRelated: mediaRegex.test(lower),
    isSmallTalk: /(\b(hi|hello|hey|selam|merhaba|naber|nasilsin|nas\u0131ls\u0131n)\b|how are you|how r u|what's up|whats up)/.test(lower),
    isGeneralQuestion: /[?]$/.test(lower)
      || /\b(count|calculate|kac|ka\u00e7)\b/.test(lower)
      || /\b(what|which|who|why|how|when|where|can you|do you|is|are)\b/.test(lower)
      || /\b(ne|kim|neden|nasil|nas\u0131l|hangi|nerede|ne zaman|sence)\b/.test(lower)
  };
}

function historyMiniAnswer(lang) {
  if (lang === 'tr') {
    return [
      'Kisa Hollywood tarihi ozeti:',
      '- 1910-1920: Sessiz sinema donemi.',
      '- 1930-1950: Klasik studio sistemi.',
      '- 1960-1970: New Hollywood, yonetmen odakli donem.',
      '- 1980-1990: Blockbuster cagi.',
      '- 2000-2010: Franchise/IP ve dijital VFX buyumesi.',
      '- 2020+: Streaming agirlikli dagitim modelleri.',
      'Istersen tek bir donemi detaylandirayim.'
    ].join('\n');
  }

  return [
    'Quick Hollywood timeline:',
    '- 1910s-1920s: Silent era.',
    '- 1930s-1950s: Classic studio system.',
    '- 1960s-1970s: New Hollywood.',
    '- 1980s-1990s: Blockbuster era.',
    '- 2000s-2010s: Franchise/IP and digital VFX growth.',
    '- 2020s: Streaming-first distribution.',
    'If you want, I can expand one era in detail.'
  ].join('\n');
}

function buildFallbackReply({ messages, fallbackReason }) {
  const userMessage = getLastUserMessage(messages);
  const mode = detectMode(userMessage);
  const lang = mode.asksTurkish ? 'tr' : (mode.asksEnglish ? 'en' : detectLanguage(userMessage));

  const mathAnswer = trySolveBasicMath(userMessage);
  if (mathAnswer !== null) {
    return t(lang, `Sonuc: ${mathAnswer}`, `The result is: ${mathAnswer}`);
  }

  if (mode.asksTurkish) {
    return 'Tabii, Turkce devam edelim. Genel sohbet edebiliriz.';
  }

  if (mode.asksEnglish) {
    return 'Sure, we can continue in English.';
  }

  if (mode.asksHistory) {
    return historyMiniAnswer(lang);
  }

  if (mode.asksRecommendation) {
    return t(
      lang,
      'Su an AI model baglantisi yok. Kisisel film/dizi onerisi simdi uretemiyorum. Birazdan tekrar dene.',
      'The AI model is currently unavailable, so I cannot generate personalized movie/series recommendations right now. Please try again shortly.'
    );
  }

  if (mode.isSmallTalk) {
    return t(
      lang,
      'Iyiyim, tesekkurler. Sen nasilsin? Istiyorsan sohbet edelim.',
      'I am doing well, thanks. How are you? We can keep chatting.'
    );
  }

  if (mode.isGeneralQuestion) {
    const note = fallbackReason
      ? t(lang, 'Not: Model su an fallback modda.', 'Note: the model is currently in fallback mode.')
      : '';
    return [
      t(lang, 'Sorunu aldim. Yardim etmeye calisiyorum.', 'I got your question. I will do my best to help.'),
      note
    ].filter(Boolean).join('\n');
  }

  return t(
    lang,
    'Buradayim. Istegini yaz, sohbet ederek devam edelim.',
    'I am here. Send your message and we can continue in chat mode.'
  );
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
  const favorites = profile.favorites.slice(0, 10).map(formatTitle);
  const watched = profile.watched.slice(0, 12).map(formatTitle);
  const watchlist = profile.watchlist.slice(0, 12).map(formatTitle);

  return [
    `User first name: ${profile.firstName || 'User'}`,
    `Top genres: ${topGenres}`,
    `Stats: total=${profile.summary.totalTitles}, watched=${profile.summary.watchedCount}, watchlist=${profile.summary.watchlistCount}, favorites=${profile.summary.favoriteCount}, avgRating=${profile.summary.avgRating || 0}`,
    `Favorites:\n${favorites.length ? favorites.map((item) => `- ${item}`).join('\n') : '- none'}`,
    `Watched:\n${watched.length ? watched.map((item) => `- ${item}`).join('\n') : '- none'}`,
    `Watchlist:\n${watchlist.length ? watchlist.map((item) => `- ${item}`).join('\n') : '- none'}`
  ].join('\n');
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

  const userMessage = getLastUserMessage(messages);
  const mode = detectMode(userMessage);
  const includeProfileContext = mode.asksRecommendation || mode.isMediaRelated;
  const styleHint = includeProfileContext
    ? 'Movie/series context is relevant for this request.'
    : 'General chat mode. Do not inject movie/series suggestions unless asked.';

  const baseUrl = trimTrailingSlash(process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1');
  const model = String(process.env.DEEPSEEK_MODEL || process.env.AI_MODEL || 'deepseek-chat').trim();
  const timeoutMs = parsePositiveInt(process.env.AI_TIMEOUT_MS, 20000, 120000);

  const systemPrompt = [
    'You are RATEFLIX AI, a conversational assistant in an entertainment app.',
    'Primary rule: answer the latest user message directly and naturally.',
    'Do not force recommendations, lists, or profile-based picks unless the user explicitly asks for them.',
    'If the user asks a non-media/general question, answer it as a normal assistant.',
    'Mirror user language (Turkish or English).',
    'Keep replies concise and useful.',
    styleHint
  ].join(' ');

  const modelMessages = [{ role: 'system', content: systemPrompt }];
  if (includeProfileContext) {
    modelMessages.push({
      role: 'system',
      content: `User profile context:\n${buildProfileContext(profile)}`
    });
  }
  modelMessages.push(...messages);

  const payload = {
    model,
    temperature: 0.8,
    max_tokens: 800,
    messages: modelMessages
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
  const providerSetting = String(process.env.AI_PROVIDER || '').trim().toLowerCase();
  const deepSeekKey = String(process.env.DEEPSEEK_API_KEY || '').trim();
  const forceFallback = ['fallback', 'local', 'off', 'disabled', 'none'].includes(providerSetting);

  if (!deepSeekKey || forceFallback) {
    const reason = !deepSeekKey
      ? 'DEEPSEEK_API_KEY is not configured.'
      : `AI_PROVIDER forces fallback (${providerSetting})`;

    return {
      reply: buildFallbackReply({ messages, fallbackReason: reason }),
      provider: 'fallback',
      usedFallback: true,
      fallbackReason: reason,
      assistantVersion: ASSISTANT_VERSION
    };
  }

  try {
    const reply = await requestDeepSeek({ messages, profile });
    return { reply, provider: 'deepseek', usedFallback: false, assistantVersion: ASSISTANT_VERSION };
  } catch (err) {
    const reason = String(err?.message || 'provider_error');
    console.error('AI provider failed, using fallback:', reason);
    return {
      reply: buildFallbackReply({ messages, fallbackReason: reason }),
      provider: 'fallback',
      usedFallback: true,
      fallbackReason: reason,
      assistantVersion: ASSISTANT_VERSION
    };
  }
}

module.exports = { createAssistantReply };
