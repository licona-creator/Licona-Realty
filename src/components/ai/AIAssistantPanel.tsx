'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { X, Send, Sparkles, Trash2 } from 'lucide-react';
import { BRAND } from '@/lib/brand';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface AIAssistantPanelProps {
  open: boolean;
  onClose: () => void;
  contactId?: string | null;
  contactName?: string | null;
  contactStage?: string | null;
}

const STAGE_COLORS: Record<string, string> = {
  new: 'bg-blue-500/10 text-blue-600',
  contacted: 'bg-purple-500/10 text-purple-600',
  qualifying: 'bg-amber-500/10 text-amber-600',
  nurturing: 'bg-teal-500/10 text-teal-600',
  showing: 'bg-orange-500/10 text-orange-600',
  offer: 'bg-pink-500/10 text-pink-600',
  under_contract: 'bg-green-500/10 text-green-600',
  closing: 'bg-gold/10 text-gold',
  closed: 'bg-emerald-500/10 text-emerald-600',
  lost: 'bg-red-500/10 text-red-600',
  on_hold: 'bg-gray-500/10 text-gray-600',
};

const CONTACT_QUICK_ACTIONS = [
  'Draft follow-up message',
  'What should I do next?',
  'Market data for their area',
  'Analyze this deal',
];

const DASHBOARD_QUICK_ACTIONS = [
  'Review my full pipeline',
  'DFW market update',
  'Who should I focus on today?',
  'Help me plan this week',
];

export function AIAssistantPanel({ open, onClose, contactId, contactName, contactStage }: AIAssistantPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pipelineLoaded, setPipelineLoaded] = useState(false);
  const [pipelineSummary, setPipelineSummary] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load pipeline summary for dashboard mode
  useEffect(() => {
    if (open && !contactId && !pipelineLoaded) {
      setPipelineLoaded(true);
      fetch('/api/ai/pipeline')
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (data?.summary) setPipelineSummary(data.summary);
        })
        .catch(() => {});
    }
  }, [open, contactId, pipelineLoaded]);

  // Auto-scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, thinking]);

  // Focus input when panel opens
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [open]);

  // Clear state when panel closes
  useEffect(() => {
    if (!open) {
      setError(null);
    }
  }, [open]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || thinking) return;

    const userMsg: ChatMessage = { role: 'user', content: text.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setThinking(true);
    setError(null);

    try {
      // Build conversation history for context
      const history = messages.map(m => ({ role: m.role, content: m.content }));

      // If dashboard mode with pipeline data, prepend it to first message
      let fullMessage = text.trim();
      if (!contactId && pipelineSummary && messages.length === 0) {
        fullMessage = `[Pipeline context for your reference - do not repeat this back to me, just use it to inform your answers]\n${pipelineSummary}\n\n${text.trim()}`;
      }

      const res = await fetch('/api/ai/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contactId: contactId || undefined,
          message: fullMessage,
          conversationHistory: history,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Something went wrong.');
        setThinking(false);
        return;
      }

      const aiMsg: ChatMessage = { role: 'assistant', content: data.response };
      setMessages(prev => [...prev, aiMsg]);
    } catch {
      setError('Network error. Please check your connection.');
    } finally {
      setThinking(false);
    }
  }, [thinking, messages, contactId, pipelineSummary]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  }

  function clearChat() {
    setMessages([]);
    setError(null);
  }

  const quickActions = contactId ? CONTACT_QUICK_ACTIONS : DASHBOARD_QUICK_ACTIONS;
  const stageColor = contactStage ? (STAGE_COLORS[contactStage] || STAGE_COLORS.new) : '';

  if (!open) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/40 z-[60] lg:bg-black/20"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className="fixed top-0 right-0 bottom-0 z-[61] w-full sm:w-[420px] bg-white dark:bg-dark-card flex flex-col shadow-2xl animate-in slide-in-from-right duration-300"
      >
        {/* Header */}
        <div className="flex items-start justify-between p-4 border-b border-gold/15">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-full bg-gold/10 flex items-center justify-center flex-shrink-0">
              <Sparkles size={16} className="text-gold" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm font-montserrat font-semibold text-navy dark:text-white">
                  AI Assistant
                  {contactName && <span className="text-gold"> - {contactName}</span>}
                </h2>
                {contactStage && (
                  <span className={`text-[9px] font-montserrat font-semibold px-1.5 py-0.5 rounded-full capitalize ${stageColor}`}>
                    {contactStage.replace(/_/g, ' ')}
                  </span>
                )}
              </div>
              <p className="text-[10px] text-navy/40 dark:text-white/40 font-inter">
                Powered by Claude - searches the web for live market data
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded hover:bg-navy/5 dark:hover:bg-white/5 text-navy/40 dark:text-white/40 hover:text-navy dark:hover:text-white transition-colors flex-shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        {/* Quick Actions */}
        {messages.length === 0 && (
          <div className="px-4 py-3 border-b border-gold/10">
            <div className="grid grid-cols-2 gap-1.5">
              {quickActions.map(action => (
                <button
                  key={action}
                  onClick={() => sendMessage(action)}
                  disabled={thinking}
                  className="text-[11px] font-inter text-left px-2.5 py-2 rounded-lg border border-gold/20 text-navy/70 dark:text-white/70 hover:bg-gold/5 hover:border-gold/40 transition-colors disabled:opacity-50 min-h-[44px] flex items-center"
                >
                  {action}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {messages.length === 0 && !error && (
            <div className="text-center py-8">
              <Sparkles size={32} className="text-gold/40 mx-auto mb-3" />
              <p className="text-sm text-navy/40 dark:text-white/40 font-inter">
                {contactId
                  ? `Ask me about ${contactName || 'this contact'}, or pick a quick action above.`
                  : 'Ask about your pipeline, the DFW market, or pick a quick action above.'}
              </p>
            </div>
          )}

          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm font-inter whitespace-pre-wrap break-words ${
                  msg.role === 'user'
                    ? 'bg-gold text-navy rounded-br-md'
                    : 'bg-[#f4f4f4] dark:bg-navy/40 text-navy dark:text-white rounded-bl-md'
                }`}
              >
                {msg.role === 'assistant' ? renderMarkdown(msg.content) : msg.content}
              </div>
            </div>
          ))}

          {/* Thinking indicator */}
          {thinking && (
            <div className="flex justify-start">
              <div className="bg-[#f4f4f4] dark:bg-navy/40 rounded-2xl rounded-bl-md px-4 py-3">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 bg-gold/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-gold/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-gold/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
              <p className="text-xs text-red-600 dark:text-red-400 font-inter">{error}</p>
              {error.includes('API key') && (
                <p className="text-[10px] text-red-500/70 font-inter mt-1">
                  To enable your AI assistant, add your Anthropic API key in Vercel. Go to Vercel &gt; Settings &gt; Environment Variables &gt; Add ANTHROPIC_API_KEY
                </p>
              )}
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Input Area */}
        <div className="border-t border-gold/15 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about this lead, the market, or your pipeline..."
              disabled={thinking}
              className="flex-1 px-3 py-2.5 rounded-lg bg-surface dark:bg-navy/30 border border-gold/15 text-sm font-inter text-navy dark:text-white placeholder:text-navy/30 dark:placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-gold/50 disabled:opacity-50 min-h-[44px]"
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={thinking || !input.trim()}
              className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors disabled:opacity-30"
              style={{ backgroundColor: BRAND.colors.gold }}
            >
              <Send size={16} color={BRAND.colors.navy} />
            </button>
          </div>
          {messages.length > 0 && (
            <button
              onClick={clearChat}
              className="flex items-center gap-1 text-[10px] text-navy/30 dark:text-white/30 hover:text-navy/50 dark:hover:text-white/50 font-inter mt-1.5 ml-1 transition-colors"
            >
              <Trash2 size={10} />
              Clear Chat
            </button>
          )}
        </div>
      </div>
    </>
  );
}

function renderMarkdown(text: string): React.ReactNode {
  // Simple markdown rendering for bold, lists, and line breaks
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    if (line.trim() === '') {
      elements.push(<br key={`br-${i}`} />);
      continue;
    }

    // Bold (**text**)
    const parts: React.ReactNode[] = [];
    const boldRegex = /\*\*(.+?)\*\*/g;
    let lastIndex = 0;
    let match;

    while ((match = boldRegex.exec(line)) !== null) {
      if (match.index > lastIndex) {
        parts.push(line.slice(lastIndex, match.index));
      }
      parts.push(<strong key={`b-${i}-${match.index}`}>{match[1]}</strong>);
      lastIndex = match.index + match[0].length;
    }
    if (lastIndex < line.length) {
      parts.push(line.slice(lastIndex));
    }

    const content = parts.length > 0 ? parts : line;

    // Bullet lists
    if (line.match(/^\s*[-*]\s/)) {
      const indent = line.match(/^\s*/)?.[0].length || 0;
      elements.push(
        <div key={`li-${i}`} className={`flex gap-1.5 ${indent > 0 ? 'ml-3' : ''}`}>
          <span className="text-gold flex-shrink-0 mt-0.5">&#8226;</span>
          <span>{content}</span>
        </div>
      );
    } else if (line.match(/^\d+\.\s/)) {
      // Numbered list
      const num = line.match(/^(\d+)\./)?.[1];
      elements.push(
        <div key={`ol-${i}`} className="flex gap-1.5">
          <span className="text-gold flex-shrink-0 font-semibold">{num}.</span>
          <span>{typeof content === 'string' ? content.replace(/^\d+\.\s*/, '') : content}</span>
        </div>
      );
    } else {
      elements.push(<div key={`p-${i}`}>{content}</div>);
    }
  }

  return <>{elements}</>;
}
