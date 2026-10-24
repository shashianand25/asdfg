import { useState, useRef, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import { MessageCircle, X, Send, Zap, Maximize2, Minimize2, Sparkles, ArrowUpRight } from 'lucide-react'
import { sendChatMessage } from '../api/client'

const INITIAL_MESSAGE = {
  role: 'model',
  content:
    "Hello! I'm the GridSight assistant. Ask me about the January 2026 wind generation forecasts, historical accuracy metrics, or how to interpret the analysis.",
}

const SUGGESTIONS = [
  'Explain the current forecast bias',
  'Which lead-time has the highest error?',
  'How should I interpret MAE?',
  'Compare latest vs day-ahead forecasts',
]

function TypingIndicator() {
  return (
    <div className="flex items-center gap-2 px-1 py-1 text-xs text-content-tertiary" role="status" aria-label="Assistant is thinking">
      <span className="flex items-center gap-1">
        {[0, 150, 300].map((delay) => (
          <span key={delay} className="w-1.5 h-1.5 bg-electric-500 rounded-full animate-bounce" style={{ animationDelay: `${delay}ms` }} />
        ))}
      </span>
      Thinking through the forecast…
    </div>
  )
}

export default function Chatbot({ selectedDate = '2026-01-15' }) {
  const [open, setOpen] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)
  const [history, setHistory] = useState([INITIAL_MESSAGE])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesContainerRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    const textarea = inputRef.current
    if (!textarea) return
    textarea.style.height = '0px'
    const nextHeight = Math.min(textarea.scrollHeight, 144)
    textarea.style.height = `${nextHeight}px`
    textarea.style.overflowY = textarea.scrollHeight > 144 ? 'auto' : 'hidden'
  }, [input, open, fullscreen])

  useEffect(() => {
    if (open) {
      const container = messagesContainerRef.current
      if (container) {
        container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' })
      }
    }
  }, [history, open, loading, fullscreen])

  useEffect(() => {
    if (!open || !fullscreen) return undefined
    const handleEscape = (event) => {
      if (event.key === 'Escape') setFullscreen(false)
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [open, fullscreen])

  const handleSend = async (msg = input.trim()) => {
    if (!msg || loading) return

    const userMessage = { role: 'user', content: msg }
    const newHistory = [...history, userMessage]
    setHistory(newHistory)
    setInput('')
    setLoading(true)

    try {
      const res = await sendChatMessage(msg, history, selectedDate)
      setHistory([
        ...newHistory,
        {
          role: 'model',
          content: res.response || res.message || 'Sorry, I could not generate a response.',
        },
      ])
    } catch {
      setHistory([
        ...newHistory,
        {
          role: 'model',
          content: '⚠️ Unable to connect to the backend. Please ensure the server is running on port 8000.',
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const showSuggestions = history.length === 1

  return (
    <>
      {/* Floating launcher */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="chat-launcher fixed bottom-6 right-6 flex items-center justify-center transition-all z-50"
          style={{ width: 52, height: 52 }}
          aria-label="Open GridSight Assistant"
        >
          <MessageCircle size={20} strokeWidth={1.75} />
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <div
          className={`chat-panel fixed z-50 flex min-h-0 flex-col overflow-hidden bg-white ${fullscreen ? 'inset-0 rounded-none' : ''}`}
          style={{
            width: fullscreen ? '100vw' : 'min(420px, calc(100vw - 2rem))',
            height: fullscreen ? '100dvh' : 'min(660px, calc(100dvh - 2rem))',
            right: fullscreen ? 0 : 16,
            bottom: fullscreen ? 0 : 16,
            boxShadow: fullscreen ? 'none' : '0 20px 25px -5px rgba(16, 29, 54, 0.15), 0 10px 10px -5px rgba(16, 29, 54, 0.08)',
          }}
          role="dialog"
          aria-modal={fullscreen}
          aria-label="GridSight Assistant"
        >
          {/* Header */}
          <div className="chat-header flex items-center justify-between px-5 py-4 flex-shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="chat-avatar w-9 h-9 rounded-xl flex items-center justify-center">
                <Zap size={14} className="text-white" strokeWidth={2.5} />
              </div>
              <div>
                <p className="text-white text-sm font-semibold leading-tight">GridSight Assistant</p>
                <p className="mt-1 flex items-center gap-1.5 text-[10px] leading-tight text-indigo-100/80"><span className="chat-status-dot" /> January 2026 · Elexon wind data</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setFullscreen((value) => !value)}
                className="chat-header-action transition-colors p-2 rounded-lg"
                aria-label={fullscreen ? 'Exit full screen' : 'Enter full screen'}
                title={fullscreen ? 'Exit full screen' : 'Full screen'}
              >
                {fullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
              </button>
              <button
                onClick={() => { setOpen(false); setFullscreen(false) }}
                className="chat-header-action transition-colors p-2 rounded-lg"
                aria-label="Close chat"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div ref={messagesContainerRef} className="chat-messages min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-5 space-y-4">
            {history.map((msg, i) => (
              <div key={i} className={`flex items-end gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role !== 'user' && <span className="chat-message-avatar"><Zap size={12} /></span>}
                <div
                  className={`max-w-[86%] rounded-2xl px-4 py-3 text-[13px] leading-relaxed ${
                    msg.role === 'user'
                      ? 'chat-user-bubble text-white rounded-br-md'
                      : 'chat-assistant-bubble text-content-primary rounded-bl-md'
                  }`}
                >
                  {msg.role === 'model' ? (
                    <div className="prose prose-sm max-w-none [&_p]:mb-2 [&_p:last-child]:mb-0 [&_ul]:my-2 [&_ol]:my-2 [&_li]:my-1 [&_a]:text-electric-600">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  ) : (
                    msg.content
                  )}
                </div>
              </div>
            ))}

            {/* Suggestion chips */}
            {showSuggestions && (
              <div className="chat-suggestions pt-2">
                <p className="mb-2.5 flex items-center gap-1.5 px-1 text-[10px] font-semibold uppercase tracking-[0.13em] text-content-tertiary"><Sparkles size={12} className="text-electric-500" /> Try asking</p>
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => handleSend(s)}
                    className="chat-suggestion block w-full text-left text-xs px-3.5 py-2.5 rounded-xl transition-all"
                  >
                    <span>{s}</span><ArrowUpRight size={13} />
                  </button>
                ))}
              </div>
            )}

            {loading && (
              <div className="flex items-end gap-2 justify-start">
                <span className="chat-message-avatar"><Zap size={12} /></span>
                <div className="chat-assistant-bubble rounded-2xl rounded-bl-md px-3 py-2.5">
                  <TypingIndicator />
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="chat-composer flex items-end gap-2 px-4 py-3 flex-shrink-0">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about wind forecasts…"
              disabled={loading}
              rows={1}
              aria-label="Message GridSight Assistant"
              className="chat-composer-input flex-1"
            />
            <button
              onClick={() => handleSend()}
              disabled={loading || !input.trim()}
              className="chat-send flex items-center justify-center flex-shrink-0"
              aria-label="Send message"
            >
              <Send size={16} />
            </button>
          </div>
          <div className="chat-composer-hint px-5 pb-2.5 -mt-1 flex-shrink-0">Enter to send <span>·</span> Shift + Enter for a new line</div>
        </div>
      )}
    </>
  )
}
