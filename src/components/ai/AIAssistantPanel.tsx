'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { X, Send, Sparkles, Trash2, Bookmark, Pin, LayoutDashboard, FileText, User } from 'lucide-react';
import { BRAND } from '@/lib/brand';
import ReactMarkdown from 'react-markdown';

type AIMode = 'system' | 'deal' | 'contact';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  saved?: boolean;
}

interface AIAssistantPanelProps {
  open: boolean;
  onClose: () => void;
  mode?: AIMode;
  contactId?: string | null;
  contactName?: string | null;
  contactStage?: string | null;
  transactionId?: string | null;
}

const MODE_CONFIG = {
  system: {
    label: 'System AI',
    description: 'Your business overview and strategy assistant',
    color: '#d3a971',
    icon: LayoutDashboard,
  },
  deal: {
    label: 'Deal AI',
    description: 'Focused on this specific deal',
    color: '#3B8BD4',
    icon: FileText,
  },
  contact: {
    label: 'Contact AI',
    description: 'Focused on this specific person',
    color: '#1D9E75',
    icon: User,
  },
} as const;

const SYSTEM_QUICK_ACTIONS = [
  'Who should I focus on today?',
  'Review my full pipeline',
  'DFW market update',
  'Help me plan this week',
];

const DEAL_QUICK_ACTIONS = [
  'What documents am I missing?',
  'What needs to happen before closing?',
  'Draft a message to the other agent',
  'Summarize this deal',
];

const CONTACT_QUICK_ACTIONS = [
  'Draft a follow-up message',
  'What should I do next with this person?',
  'Market data for their area',
  'Draft a referral ask',
];

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

function sanitizeAIText(text: string): string {
  return text
    .replace(/\u2014/g, '-')       // em dash to hyphen
    .replace(/\u2013/g, '-')       // en dash to hyphen
    .replace(/\u201C/g, '"')       // left double smart quote
    .replace(/\u201D/g, '"')       // right double smart quote
    .replace(/\u2018/g, "'")       // left single smart quote
    .replace(/\u2019/g, "'")       // right single smart quote
    .replace(/^\*\*\s*/gm, '**')   // clean up double bold at line start
    .replace(/\u2022\u2022/g, '-'); // double bullets to single hyphen
}

export function AIAssistantPanel({ open, onClose, mode = 'system', contactId, contactName, contactStage, transactionId }: AIAssistantPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pipelineLoaded, setPipelineLoaded] = useState(false);
  const [pipelineSummary, setPipelineSummary] = useState<string | null>(null);
  const [savingIndex, setSavingIndex] = useState<number | null>(null);
  const [lastMode, setLastMode] = useState<AIMode>(mode);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Clear conversation when mode changes
  useEffect(() => {
    if (mode !== lastMode) {
      setMessages([]);
      setError(null);
      setPipelineLoaded(false);
      setPipelineSummary(null);
      setLastMode(mode);
    }
  }, [mode, lastMode]);

  // Load pipeline summary for system mode
  useEffect(() => {
    if (open && mode === 'system' && !pipelineLoaded) {
      setPipelineLoaded(true);
      fetch('/api/ai/pipeline')
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (data?.summary) setPipelineSummary(data.summary);
        })
        .catch(() => {});
    }
  }, [open, mode, pipelineLoaded]);

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
      const history = messages.map(m => ({ role: m.role, content: m.content }));

      let fullMessage = text.trim();
      if (mode === 'system' && pipelineSummary && messages.length === 0) {
        fullMessage = `[Pipeline context for your reference - do not repeat this back to me, just use it to inform your answers]\n${pipelineSummary}\n\n${text.trim()}`;
      }

      const res = await fetch('/api/ai/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode,
          contactId: contactId || undefined,
          transactionId: transactionId || undefined,
          message: fullMessage,
          conversationHistory: history,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        const errorMsg = data.error || 'Something went wrong.';
        const details = data.details ? `\n\nDetails: ${data.details}` : '';
        setError(errorMsg + details);
        setThinking(false);
        return;
      }

      const sanitized = sanitizeAIText(data.response || '');
      const aiMsg: ChatMessage = { role: 'assistant', content: sanitized };
      setMessages(prev => [...prev, aiMsg]);
    } catch {
      setError('Network error. Please check your connection.');
    } finally {
      setThinking(false);
    }
  }, [thinking, messages, mode, contactId, transactionId, pipelineSummary]);

  async function saveInsight(index: number) {
    const msg = messages[index];
    if (!msg || msg.role !== 'assistant' || msg.saved) return;

    setSavingIndex(index);
    try {
      const res = await fetch('/api/ai/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contact_id: contactId || null,
          insight_type: 'suggestion',
          content: msg.content,
        }),
      });

      if (res.ok) {
        setMessages(prev => prev.map((m, i) => i === index ? { ...m, saved: true } : m));
      }
    } catch {
      // silent fail
    } finally {
      setSavingIndex(null);
    }
  }

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

  const modeConfig = MODE_CONFIG[mode];
  const ModeIcon = modeConfig.icon;

  const quickActions = mode === 'deal'
    ? DEAL_QUICK_ACTIONS
    : mode === 'contact'
    ? CONTACT_QUICK_ACTIONS
    : SYSTEM_QUICK_ACTIONS;

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
        style={{ maxHeight: '100vh' }}
      >
        {/* Header - sticky */}
        <div className="flex items-start justify-between p-4 border-b border-gold/15 sticky top-0 z-10 bg-white dark:bg-dark-card" style={{ paddingTop: 'max(env(safe-area-inset-top, 12px), 12px)' }}>
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-full bg-gold/10 flex items-center justify-center flex-shrink-0">
              <Sparkles size={16} className="text-gold" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm font-montserrat font-semibold text-navy dark:text-white">
                  AI Assistant
                  {mode === 'contact' && contactName && <span className="text-gold"> - {contactName}</span>}
                </h2>
                {mode === 'contact' && contactStage && (
                  <span className={`text-[9px] font-montserrat font-semibold px-1.5 py-0.5 rounded-full capitalize ${stageColor}`}>
                    {contactStage.replace(/_/g, ' ')}
                  </span>
                )}
              </div>
              {/* Mode Badge */}
              <div className="flex items-center gap-2 mt-1.5">
                <span
                  className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-montserrat font-semibold text-white"
                  style={{ backgroundColor: modeConfig.color, height: '28px' }}
                >
                  <ModeIcon size={12} />
                  {modeConfig.label}
                </span>
              </div>
              <p className="text-[10px] text-navy/40 dark:text-white/40 font-inter mt-1">
                {modeConfig.description}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded hover:bg-navy/5 dark:hover:bg-white/5 text-navy/40 dark:text-white/40 hover:text-navy dark:hover:text-white transition-colors flex-shrink-0"
            style={{ marginTop: 'max(env(safe-area-inset-top, 0px), 0px)' }}
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
                  type="button"
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
                {mode === 'contact'
                  ? `Ask me about ${contactName || 'this contact'}, or pick a quick action above.`
                  : mode === 'deal'
                  ? 'Ask about this deal, documents, timeline, or pick a quick action above.'
                  : 'Ask about your pipeline, the DFW market, or pick a quick action above.'}
              </p>
            </div>
          )}

          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className="max-w-[85%]">
                <div
                  className={`rounded-2xl px-3.5 py-2.5 text-sm font-inter break-words ${
                    msg.role === 'user'
                      ? 'bg-gold text-navy rounded-br-md'
                      : 'bg-[#f4f4f4] dark:bg-navy/40 text-navy dark:text-white rounded-bl-md'
                  }`}
                >
                  {msg.role === 'assistant' ? (
                    <div className="ai-markdown prose prose-sm max-w-none dark:prose-invert prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5 prose-headings:text-navy dark:prose-headings:text-white prose-strong:text-navy dark:prose-strong:text-white">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  ) : (
                    <span className="whitespace-pre-wrap">{msg.content}</span>
                  )}
                </div>
                {/* Save Insight button for assistant messages */}
                {msg.role === 'assistant' && (
                  <div className="flex items-center gap-1 mt-1 ml-1">
                    <button
                      type="button"
                      onClick={() => saveInsight(i)}
                      disabled={msg.saved || savingIndex === i}
                      className={`flex items-center gap-1 text-[10px] font-inter transition-colors ${
                        msg.saved
                          ? 'text-gold'
                          : 'text-navy/25 dark:text-white/25 hover:text-gold'
                      }`}
                      title={msg.saved ? 'Insight saved' : 'Save insight'}
                    >
                      {msg.saved ? <Pin size={10} /> : <Bookmark size={10} />}
                      {msg.saved ? 'Saved' : savingIndex === i ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                )}
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
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 overflow-x-auto">
              <p className="text-xs text-red-600 dark:text-red-400 font-inter whitespace-pre-wrap break-words">{error}</p>
              {error.includes('API key') && (
                <p className="text-[10px] text-red-500/70 font-inter mt-1">
                  To enable your AI assistant, add your Anthropic API key in Vercel. Go to Vercel &gt; Settings &gt; Environment Variables &gt; Add ANTHROPIC_API_KEY
                </p>
              )}
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Input Area - sticky bottom */}
        <div className="border-t border-gold/15 p-3 sticky bottom-0 z-10 bg-white dark:bg-dark-card" style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}>
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                mode === 'deal'
                  ? 'Ask about this deal, documents, or timeline...'
                  : mode === 'contact'
                  ? 'Ask about this contact, draft a message...'
                  : 'Ask about your pipeline, the market, or strategy...'
              }
              disabled={thinking}
              className="flex-1 px-3 py-2.5 rounded-lg bg-surface dark:bg-navy/30 border border-gold/15 text-sm font-inter text-navy dark:text-white placeholder:text-navy/30 dark:placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-gold/50 disabled:opacity-50 min-h-[44px]"
            />
            <button
              type="button"
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
              type="button"
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
