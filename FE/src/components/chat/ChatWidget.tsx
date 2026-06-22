import { FormEvent, useEffect, useRef, useState } from 'react';
import { ChatMessage, sendChatMessage } from '../../api/chatApi';
import './ChatWidget.css';

const WELCOME: ChatMessage = {
  role: 'assistant',
  content:
    'Xin chào! Mình là trợ lý ConcertGo. Bạn có thể hỏi về concert, địa điểm tổ chức, ghế còn trống, cách đặt vé hoặc đơn hàng (nếu đã đăng nhập).',
};

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading, open]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || loading) return;

    const nextMessages: ChatMessage[] = [...messages, { role: 'user', content: text }];
    setMessages(nextMessages);
    setInput('');
    setError(null);
    setLoading(true);

    try {
      const reply = await sendChatMessage(
        nextMessages.filter((m) => m.role === 'user' || (m.role === 'assistant' && m !== WELCOME))
      );
      setMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Không gửi được tin nhắn';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {open && (
        <div className="chat-panel" role="dialog" aria-label="Chat hỗ trợ">
          <div className="chat-panel__header">
            <div>
              <p className="chat-panel__title">Trợ lý ConcertGo</p>
              <p className="chat-panel__subtitle">Hỏi concert, địa điểm, ghế, đặt vé</p>
            </div>
            <button
              type="button"
              className="chat-panel__close"
              onClick={() => setOpen(false)}
              aria-label="Đóng chat"
            >
              ×
            </button>
          </div>

          <div className="chat-panel__messages">
            {messages.map((m, i) => (
              <div key={`${m.role}-${i}`} className={`chat-bubble chat-bubble--${m.role}`}>
                {m.content}
              </div>
            ))}
            {loading && <div className="chat-bubble chat-bubble--assistant chat-bubble--typing">Đang trả lời…</div>}
            {error && <div className="chat-bubble chat-bubble--assistant chat-bubble--typing">{error}</div>}
            <div ref={bottomRef} />
          </div>

          <form className="chat-panel__form" onSubmit={handleSubmit}>
            <textarea
              className="chat-panel__input"
              rows={1}
              placeholder="Ví dụ: Concert X tổ chức ở đâu?"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  void handleSubmit(e);
                }
              }}
              disabled={loading}
            />
            <button type="submit" className="chat-panel__send" disabled={loading || !input.trim()}>
              Gửi
            </button>
          </form>
        </div>
      )}

      <button
        type="button"
        className={`chat-fab ${open ? 'chat-fab--open' : ''}`}
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? 'Đóng chat' : 'Mở chat hỗ trợ'}
      >
        {open ? '×' : '💬'}
      </button>
    </>
  );
}
