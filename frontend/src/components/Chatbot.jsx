import { useState, useRef, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import { MessageCircle, X, Send, Zap, Maximize2, Minimize2 } from 'lucide-react'
import { sendChatMessage } from '../api/client'

const INITIAL_MESSAGE = {
  role: 'model',
  content:
    "Hello! I'm the WindTrader assistant. Ask me about the January 2026 wind generation forecasts, historical accuracy metrics, or how to interpret the analysis.",
}

const SUGGESTIONS = [
  'Explain the current forecast bias',
  'Which lead-time has the highest error?',
  'How should I interpret MAE?',
  'Compare latest vs day-ahead forecasts',
]

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-1 py-1">
      {[0, 150, 300].map((delay) => (
        <span
          key={delay}
          className="w-1.5 h-1.5 bg-content-secondary rounded-full animate-bounce"
          style={{ animationDelay: `${delay}ms` }}
        />
      ))}
    </div>
  )
}

export default function Chatbot({ selectedDate = '2026-01-15' }) {
  const [open, setOpen] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)
  const [history, setHistory] = useState([INITIAL_MESSAGE])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const messagesContainerRef = useRef(null)

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
    setError(null)

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
      setError('Could not reach the backend. Please ensure the server is running.')
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
          className="fixed bottom-6 right-6 w-13 h-13 bg-navy-900 hover:bg-navy-800 text-white rounded-full shadow-card-lg flex items-center justify-center transition-all z-50 border border-navy-700"
          style={{ width: 52, height: 52 }}
          aria-label="Open WindTrader Assistant"
        >
          <MessageCircle size={20} strokeWidth={1.75} />
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <div
          className={`fixed z-50 flex min-h-0 flex-col overflow-hidden bg-white border border-surface-border ${fullscreen ? 'inset-0 rounded-none' : 'rounded-card-lg'}`}
          style={{
            width: fullscreen ? '100vw' : 'min(380px, calc(100vw - 2rem))',
            height: fullscreen ? '100dvh' : 'min(600px, calc(100dvh - 2rem))',
            right: fullscreen ? 0 : 16,
            bottom: fullscreen ? 0 : 16,
            boxShadow: fullscreen ? 'none' : '0 20px 25px -5px rgba(16, 29, 54, 0.15), 0 10px 10px -5px rgba(16, 29, 54, 0.08)',
          }}
          role="dialog"
          aria-modal={fullscreen}
          aria-label="WindTrader Assistant"
        >
          {/* Header */}
          <div className={`flex items-center justify-between px-4 py-3 bg-navy-900 border-b border-navy-800 flex-shrink-0 ${fullscreen ? '' : 'rounded-t-card-lg'}`}>
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 bg-electric-500 rounded-lg flex items-center justify-center">
                <Zap size={14} className="text-white" strokeWidth={2.5} />
              </div>
              <div>
                <p className="text-white text-sm font-semibold leading-tight">WindTrader Assistant</p>
                <p className="text-blue-400 text-[10px] leading-tight">January 2026 Analysis Context</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setFullscreen((value) => !value)}
                className="text-blue-300 hover:text-white transition-colors p-2 rounded"
                aria-label={fullscreen ? 'Exit full screen' : 'Enter full screen'}
                title={fullscreen ? 'Exit full screen' : 'Full screen'}
              >
                {fullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
              </button>
              <button
                onClick={() => { setOpen(false); setFullscreen(false) }}
                className="text-blue-300 hover:text-white transition-colors p-2 rounded"
                aria-label="Close chat"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div ref={messagesContainerRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-3 space-y-3 bg-surface-bg">
            {history.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] rounded-xl px-3.5 py-2.5 text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-electric-500 text-white rounded-br-sm'
                      : 'bg-white text-content-primary border border-surface-border rounded-bl-sm shadow-card'
                  }`}
                >
                  {msg.role === 'model' ? (
                    <div className="prose prose-sm max-w-none [&_p]:mb-1 [&_p:last-child]:mb-0">
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
              <div className="space-y-1.5 pt-1">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => handleSend(s)}
                    className="block w-full text-left text-xs px-3 py-2 bg-white border border-surface-border rounded-lg text-content-secondary hover:text-content-primary hover:border-electric-300 transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-white border border-surface-border rounded-xl rounded-bl-sm shadow-card px-3 py-2">
                  <TypingIndicator />
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="flex items-center gap-2 px-3 py-3 border-t border-surface-border bg-white rounded-b-card-lg flex-shrink-0">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about January 2026 wind forecasts…"
              disabled={loading}
              className="wt-input flex-1 py-1.5 text-xs"
            />
            <button
              onClick={() => handleSend()}
              disabled={loading || !input.trim()}
              className="btn-primary flex items-center justify-center w-8 h-8 p-0 rounded-lg flex-shrink-0"
              aria-label="Send message"
            >
              <Send size={14} />
            </button>
          </div>
        </div>
      )}
    </>
  )
}
