import { useEffect, useMemo, useRef, useState } from 'react';
import Layout from '../components/Layout.jsx';
import api from '../api/client.js';

const starterMessage = {
  role: 'assistant',
  content:
    'Merhaba. RATEFLIX AI olarak favori ve watched listene gore kibar bir dille oneriler sunabilirim. Istersen hemen baslayalim.'
};

const quickPrompts = [
  'Favorilerime gore bu aksam bir film oner.',
  'Watched listeme benzer 5 dizi onerir misin?',
  'Puani yuksek ama temposu dusuk icerikler oner.',
  'Watchlist icinden once hangilerini izlemeliyim?'
];

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
          content: reply || 'Su an yanit uretemedim. Lutfen tekrar dener misin?'
        }
      ]);
    } catch (err) {
      setError(err.response?.data?.message || 'AI yaniti alinamadi. Lutfen tekrar deneyin.');
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
              Favori ve watched gecmisine gore kisisellestirilmis film/dizi onerileri al.
            </p>
          </div>
          <button className="btn ghost" type="button" onClick={handleReset} disabled={loading}>
            Yeni Sohbet
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
                  {message.role === 'user' ? 'Sen' : 'RATEFLIX AI'}
                </div>
                <div className="ai-msg-bubble">{message.content}</div>
              </article>
            ))}

            {loading && (
              <article className="ai-msg assistant">
                <div className="ai-msg-role">RATEFLIX AI</div>
                <div className="ai-msg-bubble ai-msg-thinking">Yanit hazirlaniyor...</div>
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
              placeholder="Ornek: Favorilerime benzer 3 bilim kurgu oner."
              maxLength={500}
              disabled={loading}
            />
            <button className="btn primary" type="submit" disabled={!canSend}>
              {loading ? 'Bekleyin...' : 'Gonder'}
            </button>
          </form>

          {error && <div className="alert">{error}</div>}
        </section>
      </section>
    </Layout>
  );
}
