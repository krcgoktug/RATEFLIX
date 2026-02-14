import { useEffect, useMemo, useRef, useState } from 'react';
import Layout from '../components/Layout.jsx';
import api from '../api/client.js';

const starterMessage = {
  role: 'assistant',
  content:
    'Hi. I am RATEFLIX AI. Ask me anything. I switch to recommendations only when you explicitly ask for suggestions.'
};

const quickPrompts = [
  'Can we chat in Turkish?',
  'What is 2 plus 2?',
  'Tell me a short history of Hollywood.',
  'Recommend 3 titles from my favorites.'
];

const legacyRecommendationPatterns = [
  /a quick pick for you right now/i,
  /here are personalized picks from your library patterns/i,
  /tell me your mood and i will narrow these further/i,
  /strong taste signal:/i,
  /recommended picks:/i
];

function isLegacyRecommendationSpam(text) {
  const value = String(text || '');
  return legacyRecommendationPatterns.some((pattern) => pattern.test(value));
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

  return {
    asksTurkish: /(turkce|speak turkish|turkish konu[s\u015f]|turkce konu[s\u015f]|t[\u00fcu]rk[\u00e7c]e konu[s\u015f])/.test(lower),
    asksEnglish: /(english|ingilizce|speak english)/.test(lower),
    asksHistory: /(history|tarih|teach|explain|timeline|hollywood|industry|how did|sinema tarihi|turkish cinema|turk sinemasi)/.test(lower),
    asksRecommendation: recommendationRegex.test(lower),
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

async function buildLocalFallbackReply(userMessage) {
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
    return t(
      lang,
      'Sorunu aldim. Simdi local fallback moddayim ama yardim etmeye calisiyorum.',
      'I got your question. I am currently in local fallback mode, but I will still try to help.'
    );
  }

  return t(
    lang,
    'Buradayim. Istegini yaz, sohbet ederek devam edelim.',
    'I am here. Send your message and we can continue in chat mode.'
  );
}

export default function AIAssistant() {
  const [messages, setMessages] = useState([starterMessage]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [modeInfo, setModeInfo] = useState('');
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
      const rawReply = String(response.data?.reply || '').trim();
      const provider = String(response.data?.provider || '').toLowerCase();
      const usedFallback = Boolean(response.data?.usedFallback);
      const fallbackReason = String(response.data?.fallbackReason || '').trim();
      const assistantVersion = String(response.data?.assistantVersion || '').trim();
      const legacySpam = isLegacyRecommendationSpam(rawReply);

      const reply = legacySpam
        ? await buildLocalFallbackReply(userMessage)
        : rawReply;

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: reply || 'I could not generate a response just now. Please try again.'
        }
      ]);

      if (legacySpam) {
        setModeInfo('Mode: Local override (legacy backend response filtered)');
      } else if (usedFallback || provider === 'fallback') {
        const base = `Mode: Fallback (${fallbackReason || 'provider unavailable'})`;
        setModeInfo(assistantVersion ? `${base} | ${assistantVersion}` : base);
      } else if (provider) {
        setModeInfo(assistantVersion ? `Mode: ${provider} | ${assistantVersion}` : `Mode: ${provider}`);
      } else {
        setModeInfo('');
      }
      setError('');
    } catch (err) {
      try {
        const localReply = await buildLocalFallbackReply(userMessage);
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: localReply }
        ]);
        setModeInfo('Mode: Local fallback (API request failed)');
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
    setModeInfo('');
  };

  return (
    <Layout>
      <section className="ai-page">
        <div className="page-header">
          <div>
            <h2>AI Assistant</h2>
            <p className="muted">
              Chat freely. Recommendation mode is used only when you explicitly ask for suggestions.
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
                <div className="ai-msg-bubble ai-msg-thinking">Thinking...</div>
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
              placeholder="Ask anything. If you want suggestions, explicitly write recommend/oner."
              maxLength={500}
              disabled={loading}
            />
            <button className="btn primary" type="submit" disabled={!canSend}>
              {loading ? 'Please wait...' : 'Send'}
            </button>
          </form>

          {error && <div className="alert">{error}</div>}
          {modeInfo && <div className="muted">{modeInfo}</div>}
        </section>
      </section>
    </Layout>
  );
}
