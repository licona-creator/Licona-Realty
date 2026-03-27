/**
 * Marketing Hub Page
 *
 * Unified marketing command center merging Social and SEO functionality.
 * 4 tabs: Create, Calendar, Analytics, Library.
 * All posts route through the approval queue before publishing.
 */

'use client';

import React, { useState, useCallback, useEffect, type ChangeEvent } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/components/ui/Toast';
import { BRAND } from '@/lib/brand';
import type { ContentPillar, SocialPlatform } from '@/types/database';
import {
  Megaphone,
  PenLine,
  CalendarDays,
  BarChart3,
  BookOpen,
  Instagram,
  Facebook,
  TrendingUp,
  GraduationCap,
  PartyPopper,
  MapPin,
  Clapperboard,
  UserCircle,
  Sparkles,
  Send,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Edit3,
  Lightbulb,
  Search,
  Globe,
  Target,
  FileText,
  CheckCircle,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type TabKey = 'create' | 'calendar' | 'analytics' | 'library';

interface ScheduledPost {
  id: string;
  date: string;
  platform: SocialPlatform;
  pillar: ContentPillar;
  caption: string;
}

interface LibraryIdea {
  id: string;
  pillar: ContentPillar;
  caption: string;
}

// ---------------------------------------------------------------------------
// Content pillar definitions
// ---------------------------------------------------------------------------

interface PillarInfo {
  label: string;
  description: string;
  icon: React.ElementType;
  color: string;
}

const PILLAR_MAP: Record<ContentPillar, PillarInfo> = {
  market_intelligence: {
    label: 'Market Intelligence',
    description: 'DFW market data, trends, pricing analysis',
    icon: TrendingUp,
    color: '#3B82F6',
  },
  client_wins: {
    label: 'Client Wins',
    description: 'Closings, testimonials, milestones',
    icon: PartyPopper,
    color: '#22C55E',
  },
  local_dfw: {
    label: 'Local DFW',
    description: 'Neighborhood spotlights, restaurants, events',
    icon: MapPin,
    color: '#F97316',
  },
  education: {
    label: 'Education',
    description: 'Home buying tips, market education, investment advice',
    icon: GraduationCap,
    color: '#8B5CF6',
  },
  behind_scenes: {
    label: 'Behind the Scenes',
    description: 'Day in the life, process transparency',
    icon: Clapperboard,
    color: '#EC4899',
  },
  personal_brand: {
    label: 'Personal Brand',
    description: "Anthony's story, values, bilingual content",
    icon: UserCircle,
    color: BRAND.colors.gold,
  },
};

const ALL_PILLARS = Object.keys(PILLAR_MAP) as ContentPillar[];

// ---------------------------------------------------------------------------
// Placeholder caption templates per pillar
// ---------------------------------------------------------------------------

const PILLAR_CAPTIONS: Record<ContentPillar, string[]> = {
  market_intelligence: [
    'The DFW market is moving fast right now. New listings are hitting every day and homes are still going under contract quickly. If you have been waiting to make your move, now is a good time to have that conversation. DM me or tap the link in bio.',
    'Numbers do not lie. DFW inventory is shifting and rates are creating opportunities that were not here six months ago. Whether you are buying or selling, the data matters. Let me walk you through what is happening in your zip code.',
  ],
  client_wins: [
    'Another one for the books. So proud of my clients for making this happen. Keys are in hand and they are officially home. This is why I do what I do. Congratulations to the family.',
    'Closed and celebrated. From first showing to final signature, this family trusted the process and it paid off. Welcome home.',
  ],
  local_dfw: [
    'If you have not been to Deep Ellum lately, you are missing out. Great spot worth knowing about. DFW has so many hidden gems and I find new ones every week.',
    'Weekend plans? Check out the Bishop Arts District. Great food, great energy, and some of the best local shops in Dallas. DFW is full of neighborhoods worth exploring.',
  ],
  education: [
    'A question I get asked a lot: how much do I actually need to buy a house in DFW? The honest answer might surprise you. Drop a comment or DM me and I will walk you through it.',
    'First-time buyer? Here is what nobody tells you about closing costs. It is not just the down payment. There are fees most people do not expect. Save this post.',
  ],
  behind_scenes: [
    'This is what a showing day actually looks like. Four homes, two cities, one very decisive client. Days like this remind me why I love this job.',
    'Behind the scenes of a listing photoshoot. The details matter: staging, lighting, angles. Every listing gets the full treatment because first impressions sell homes.',
  ],
  personal_brand: [
    'Three years ago I got my license. I had no idea what I was doing. Now I help families buy, sell, and invest across North Texas every single week. If you are thinking about real estate, let us talk.',
    'Real estate is not just a career for me. It is how I serve my community. Every transaction, every client, every handshake matters. Grateful for the journey.',
  ],
};

// ---------------------------------------------------------------------------
// Calendar helpers
// ---------------------------------------------------------------------------

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

// ---------------------------------------------------------------------------
// AI placeholder ideas
// ---------------------------------------------------------------------------

const AI_IDEAS: string[] = [
  'Share a DFW market snapshot comparing this month vs. last month.',
  'Post a client win story with a photo in front of their new home.',
  'Highlight a local DFW restaurant or coffee shop you visited this week.',
  'Create a short reel explaining what earnest money is for first-time buyers.',
  'Share a personal reflection on what real estate means to you and your community.',
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function MarketingPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('create');
  const toast = useToast();

  // ---- Create tab state ----
  const [selectedPlatform, setSelectedPlatform] = useState<SocialPlatform | null>(null);
  const [selectedPillar, setSelectedPillar] = useState<ContentPillar | null>(null);
  const [caption, setCaption] = useState('');
  const [generating, setGenerating] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // ---- Calendar tab state ----
  const now = new Date();
  const [calYear, setCalYear] = useState(now.getFullYear());
  const [calMonth, setCalMonth] = useState(now.getMonth());
  const [calPosts, setCalPosts] = useState<ScheduledPost[]>([]);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  // ---- Analytics tab state ----
  const [postsCreated, setPostsCreated] = useState(0);
  const [postsApproved, setPostsApproved] = useState(0);
  const [igCount, setIgCount] = useState(0);
  const [fbCount, setFbCount] = useState(0);

  // ---- Library tab state ----
  const [libraryIdeas, setLibraryIdeas] = useState<LibraryIdea[]>([]);
  const [newIdeaPillar, setNewIdeaPillar] = useState<ContentPillar>('market_intelligence');
  const [newIdeaText, setNewIdeaText] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [showAiIdeas, setShowAiIdeas] = useState(false);

  // ---- Fetch calendar posts ----
  const fetchCalendarPosts = useCallback(async () => {
    try {
      const startDate = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-01`;
      const endDay = getDaysInMonth(calYear, calMonth);
      const endDate = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(endDay).padStart(2, '0')}`;
      const res = await fetch(`/api/social/posts?start=${startDate}&end=${endDate}`);
      if (res.ok) {
        const data: { posts?: ScheduledPost[] } = await res.json();
        setCalPosts(data.posts ?? []);
      }
    } catch {
      // keep existing state
    }
  }, [calYear, calMonth]);

  useEffect(() => {
    fetchCalendarPosts();
  }, [fetchCalendarPosts]);

  // ---- Fetch analytics counts ----
  const fetchAnalytics = useCallback(async () => {
    try {
      const res = await fetch('/api/social/posts');
      if (res.ok) {
        const data: { posts?: ScheduledPost[] } = await res.json();
        const posts = data.posts ?? [];
        setPostsCreated(posts.length);
        setIgCount(posts.filter(p => p.platform === 'instagram').length);
        setFbCount(posts.filter(p => p.platform === 'facebook').length);
      }
    } catch {
      // placeholder
    }
    try {
      const res = await fetch('/api/approval-queue?status=approved&item_type=social_post');
      if (res.ok) {
        const data: { items?: unknown[] } = await res.json();
        setPostsApproved((data.items ?? []).length);
      }
    } catch {
      // placeholder
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'analytics') fetchAnalytics();
  }, [activeTab, fetchAnalytics]);

  // ---- Handlers ----

  const handleGenerateCaption = async () => {
    if (!selectedPillar) {
      toast.warning('Select a pillar', 'Choose a content pillar before generating a caption.');
      return;
    }
    const pillar: ContentPillar = selectedPillar;
    setGenerating(true);
    try {
      const res = await fetch('/api/ai/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `Write a short Instagram caption for a real estate agent in DFW about ${PILLAR_MAP[pillar].label}.`,
        }),
      });
      if (res.ok) {
        const data: { text?: string } = await res.json();
        if (data.text) {
          setCaption(data.text);
          toast.success('Caption generated', 'AI caption ready. Edit it to match your voice.');
          return;
        }
      }
      // Fallback to template
      const templates = PILLAR_CAPTIONS[pillar];
      setCaption(templates[Math.floor(Math.random() * templates.length)]);
      toast.info('Template loaded', 'Using a template caption. Edit before sending.');
    } catch {
      const templates = PILLAR_CAPTIONS[pillar];
      setCaption(templates[Math.floor(Math.random() * templates.length)]);
      toast.info('Template loaded', 'Using a template caption. Edit before sending.');
    } finally {
      setGenerating(false);
    }
  };

  const handleSendToApproval = async () => {
    if (!selectedPlatform) {
      toast.warning('Select a platform', 'Choose Instagram or Facebook first.');
      return;
    }
    if (!selectedPillar) {
      toast.warning('Select a pillar', 'Choose a content pillar first.');
      return;
    }
    if (!caption.trim()) {
      toast.warning('Add a caption', 'Write or generate a caption before submitting.');
      return;
    }
    const pillar: ContentPillar = selectedPillar;
    const platform: SocialPlatform = selectedPlatform;
    setSubmitting(true);
    try {
      const res = await fetch('/api/approval-queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          item_type: 'social_post',
          subject: `${platform} - ${PILLAR_MAP[pillar].label}`,
          content: caption.trim(),
        }),
      });
      if (!res.ok) throw new Error('Failed to submit');
      toast.success('Post queued', 'Sent to your approval queue for review.');
      setCaption('');
      setSelectedPlatform(null);
      setSelectedPillar(null);
    } catch {
      toast.error('Submission failed', 'Could not send post to approval queue. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Calendar navigation
  const prevMonth = () => {
    if (calMonth === 0) { setCalMonth(11); setCalYear((y: number) => y - 1); }
    else setCalMonth((m: number) => m - 1);
    setSelectedDay(null);
  };
  const nextMonth = () => {
    if (calMonth === 11) { setCalMonth(0); setCalYear((y: number) => y + 1); }
    else setCalMonth((m: number) => m + 1);
    setSelectedDay(null);
  };

  // Library helpers
  const addIdea = () => {
    if (!newIdeaText.trim()) return;
    const idea: LibraryIdea = {
      id: `idea-${Date.now()}`,
      pillar: newIdeaPillar,
      caption: newIdeaText.trim(),
    };
    setLibraryIdeas((prev: LibraryIdea[]) => [idea, ...prev]);
    setNewIdeaText('');
    toast.success('Idea saved', 'Added to your content library.');
  };

  const deleteIdea = (id: string) => {
    setLibraryIdeas((prev: LibraryIdea[]) => prev.filter((i: LibraryIdea) => i.id !== id));
    toast.info('Idea removed');
  };

  const startEdit = (idea: LibraryIdea) => {
    setEditingId(idea.id);
    setEditingText(idea.caption);
  };

  const saveEdit = (id: string) => {
    setLibraryIdeas((prev: LibraryIdea[]) =>
      prev.map((i: LibraryIdea) => (i.id === id ? { ...i, caption: editingText.trim() } : i))
    );
    setEditingId(null);
    setEditingText('');
    toast.success('Idea updated');
  };

  // Calendar grid data
  const daysInMonth = getDaysInMonth(calYear, calMonth);
  const firstDay = getFirstDayOfMonth(calYear, calMonth);
  const calendarCells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) calendarCells.push(null);
  for (let d = 1; d <= daysInMonth; d++) calendarCells.push(d);
  while (calendarCells.length < 35) calendarCells.push(null);

  const postsForDay = (day: number): ScheduledPost[] => {
    const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return calPosts.filter((p: ScheduledPost) => p.date?.startsWith(dateStr));
  };

  // ---------------------------------------------------------------------------
  // Tabs config
  // ---------------------------------------------------------------------------

  const tabs: { key: TabKey; label: string; icon: React.ElementType }[] = [
    { key: 'create', label: 'Create', icon: PenLine },
    { key: 'calendar', label: 'Calendar', icon: CalendarDays },
    { key: 'analytics', label: 'Analytics', icon: BarChart3 },
    { key: 'library', label: 'Library', icon: BookOpen },
  ];

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto">
      {/* Page header */}
      <div className="flex items-center gap-3 mb-6">
        <Megaphone size={24} className="text-gold" />
        <h1
          className="text-2xl font-semibold text-navy dark:text-white"
          style={{ fontFamily: BRAND.fonts.playfair }}
        >
          Marketing Hub
        </h1>
      </div>

      {/* Tab bar */}
      <div className="flex items-center gap-1 mb-6 bg-surface dark:bg-navy/50 rounded-lg p-1 overflow-x-auto w-fit max-w-full">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-montserrat font-medium transition-colors whitespace-nowrap ${
              activeTab === tab.key
                ? 'bg-navy text-white dark:bg-gold dark:text-navy'
                : 'text-navy/60 dark:text-white/60 hover:text-navy dark:hover:text-white'
            }`}
          >
            <tab.icon size={14} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ================================================================= */}
      {/* CREATE TAB                                                        */}
      {/* ================================================================= */}
      {activeTab === 'create' && (
        <div className="space-y-6">
          {/* Platform selector */}
          <div>
            <label className="block text-xs font-montserrat font-medium text-navy/60 dark:text-white/60 mb-2">
              Platform
            </label>
            <div className="flex gap-2">
              {(['instagram', 'facebook'] as SocialPlatform[]).map(p => {
                const Icon = p === 'instagram' ? Instagram : Facebook;
                const active = selectedPlatform === p;
                return (
                  <button
                    key={p}
                    onClick={() => setSelectedPlatform(active ? null : p)}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-lg border text-sm font-montserrat transition-colors text-navy dark:text-white ${
                      active ? 'border-gold bg-gold/10' : 'border-gold/20 hover:border-gold'
                    }`}
                  >
                    <Icon size={16} className={p === 'instagram' ? 'text-pink-500' : 'text-blue-600'} />
                    {p === 'instagram' ? 'Instagram' : 'Facebook'}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Content pillar cards */}
          <div>
            <label className="block text-xs font-montserrat font-medium text-navy/60 dark:text-white/60 mb-2">
              Content Pillar
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {ALL_PILLARS.map(key => {
                const pillar = PILLAR_MAP[key];
                const PillarIcon = pillar.icon;
                const active = selectedPillar === key;
                return (
                  <button
                    key={key}
                    onClick={() => setSelectedPillar(active ? null : key)}
                    className={`flex items-start gap-2.5 p-3 rounded-xl border text-left transition-all ${
                      active
                        ? 'border-gold bg-gold/10 shadow-sm'
                        : 'border-gold/10 bg-white dark:bg-dark-card hover:border-gold/30'
                    }`}
                  >
                    <PillarIcon size={18} style={{ color: pillar.color }} className="flex-shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <p className="text-xs font-montserrat font-semibold text-navy dark:text-white leading-tight">
                        {pillar.label}
                      </p>
                      <p className="text-[10px] text-navy/40 dark:text-white/40 font-inter mt-0.5 line-clamp-2">
                        {pillar.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Caption textarea */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-montserrat font-medium text-navy/60 dark:text-white/60">
                Caption
              </label>
              <span className="text-[10px] font-inter text-navy/40 dark:text-white/40">
                {caption.length} characters
              </span>
            </div>
            <textarea
              rows={5}
              value={caption}
              onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setCaption(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gold/20 bg-white dark:bg-navy focus:border-gold focus:ring-1 focus:ring-gold/30 text-sm font-inter text-navy dark:text-white outline-none resize-none"
              placeholder="Write your caption or generate one with AI..."
            />
            <p className="text-[10px] text-navy/40 dark:text-white/40 font-inter mt-1">
              Variables: {'{first_name}'}, {'{property_address}'}, {'{market_stat}'}
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-3">
            <Button variant="accent" loading={generating} onClick={handleGenerateCaption}>
              <Sparkles size={14} />
              Generate Caption
            </Button>
            <Button variant="primary" loading={submitting} onClick={handleSendToApproval}>
              <Send size={14} />
              Send to Approval Queue
            </Button>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* CALENDAR TAB                                                      */}
      {/* ================================================================= */}
      {activeTab === 'calendar' && (
        <div className="space-y-4">
          {/* Month navigation */}
          <div className="flex items-center justify-between">
            <button
              onClick={prevMonth}
              className="p-2 rounded-lg hover:bg-gold/10 transition-colors text-navy dark:text-white"
              aria-label="Previous month"
            >
              <ChevronLeft size={20} />
            </button>
            <h2
              className="text-lg font-semibold text-navy dark:text-white"
              style={{ fontFamily: BRAND.fonts.playfair }}
            >
              {MONTH_NAMES[calMonth]} {calYear}
            </h2>
            <button
              onClick={nextMonth}
              className="p-2 rounded-lg hover:bg-gold/10 transition-colors text-navy dark:text-white"
              aria-label="Next month"
            >
              <ChevronRight size={20} />
            </button>
          </div>

          {/* Calendar grid */}
          <Card className="!p-3 sm:!p-4 overflow-x-auto">
            {/* Day headers */}
            <div className="grid grid-cols-7 gap-1 mb-1 min-w-[300px]">
              {DAY_LABELS.map(d => (
                <div
                  key={d}
                  className="text-center text-[10px] font-montserrat font-semibold text-navy/50 dark:text-white/50 py-1"
                >
                  {d}
                </div>
              ))}
            </div>
            {/* Day cells */}
            <div className="grid grid-cols-7 gap-1 min-w-[300px]">
              {calendarCells.map((day, idx) => {
                if (day === null) {
                  return <div key={`empty-${idx}`} className="h-12 sm:h-16" />;
                }
                const dayPosts = postsForDay(day);
                const isSelected = selectedDay === day;
                const isToday =
                  day === now.getDate() &&
                  calMonth === now.getMonth() &&
                  calYear === now.getFullYear();
                return (
                  <button
                    key={day}
                    onClick={() => setSelectedDay(isSelected ? null : day)}
                    className={`relative h-12 sm:h-16 rounded-lg text-xs font-inter transition-colors text-navy dark:text-white ${
                      isSelected
                        ? 'bg-gold/15 border border-gold'
                        : isToday
                          ? 'bg-navy/5 dark:bg-white/5 border border-gold/30'
                          : 'hover:bg-gold/5 border border-transparent'
                    }`}
                  >
                    <span className={`block text-center pt-1 ${isToday ? 'font-bold' : ''}`}>
                      {day}
                    </span>
                    {dayPosts.length > 0 && (
                      <span
                        className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full"
                        style={{ backgroundColor: BRAND.colors.gold }}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </Card>

          {/* Selected day detail */}
          {selectedDay !== null && (
            <Card className="!p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-montserrat font-semibold text-navy dark:text-white">
                  {MONTH_NAMES[calMonth]} {selectedDay}, {calYear}
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setActiveTab('create');
                    setSelectedDay(null);
                  }}
                >
                  <Plus size={14} />
                  Add Content
                </Button>
              </div>
              {postsForDay(selectedDay).length > 0 ? (
                <div className="space-y-2">
                  {postsForDay(selectedDay).map(post => (
                    <div
                      key={post.id}
                      className="flex items-start gap-2 p-2 rounded-lg bg-surface dark:bg-navy/50"
                    >
                      {post.platform === 'instagram' ? (
                        <Instagram size={14} className="text-pink-500 mt-0.5 flex-shrink-0" />
                      ) : (
                        <Facebook size={14} className="text-blue-600 mt-0.5 flex-shrink-0" />
                      )}
                      <p className="text-xs font-inter text-navy dark:text-white line-clamp-2">
                        {post.caption}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-navy/40 dark:text-white/40 font-inter">
                  No posts scheduled for this day.
                </p>
              )}
            </Card>
          )}
        </div>
      )}

      {/* ================================================================= */}
      {/* ANALYTICS TAB                                                     */}
      {/* ================================================================= */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          {/* Content metrics */}
          <div>
            <h3 className="text-sm font-montserrat font-semibold text-navy dark:text-white mb-3">
              Content Metrics
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Posts Created This Month', value: String(postsCreated), icon: FileText, color: 'text-gold' },
                { label: 'Posts Approved', value: String(postsApproved), icon: CheckCircle, color: 'text-green-500' },
                { label: 'Instagram Posts', value: String(igCount), icon: Instagram, color: 'text-pink-500' },
                { label: 'Facebook Posts', value: String(fbCount), icon: Facebook, color: 'text-blue-600' },
              ].map(stat => (
                <Card key={stat.label} className="!p-4">
                  <stat.icon size={16} className={`${stat.color} mb-2`} />
                  <p
                    className="text-2xl font-bold text-navy dark:text-white"
                    style={{ fontFamily: BRAND.fonts.dmSerif }}
                  >
                    {stat.value}
                  </p>
                  <p className="text-xs text-navy/50 dark:text-white/50 font-inter">
                    {stat.label}
                  </p>
                </Card>
              ))}
            </div>
          </div>

          {/* SEO metrics */}
          <div>
            <h3 className="text-sm font-montserrat font-semibold text-navy dark:text-white mb-3">
              SEO Metrics
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[
                { label: 'Tracked Keywords', value: '10', icon: Search, color: 'text-purple-500' },
                { label: 'Organic Visits', value: '0', icon: Globe, color: 'text-blue-500' },
                { label: 'Conversion Rate', value: '0%', icon: Target, color: 'text-green-500' },
              ].map(stat => (
                <Card key={stat.label} className="!p-4">
                  <stat.icon size={16} className={`${stat.color} mb-2`} />
                  <p
                    className="text-2xl font-bold text-navy dark:text-white"
                    style={{ fontFamily: BRAND.fonts.dmSerif }}
                  >
                    {stat.value}
                  </p>
                  <p className="text-xs text-navy/50 dark:text-white/50 font-inter">
                    {stat.label}
                  </p>
                </Card>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* LIBRARY TAB                                                       */}
      {/* ================================================================= */}
      {activeTab === 'library' && (
        <div className="space-y-6">
          {/* Add new idea */}
          <Card className="!p-4">
            <h3 className="text-sm font-montserrat font-semibold text-navy dark:text-white mb-3">
              Save a Content Idea
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-montserrat font-medium text-navy/60 dark:text-white/60 mb-1">
                  Pillar
                </label>
                <select
                  value={newIdeaPillar}
                  onChange={(e: ChangeEvent<HTMLSelectElement>) => setNewIdeaPillar(e.target.value as ContentPillar)}
                  className="w-full px-3 py-2 rounded-lg border border-gold/20 bg-white dark:bg-navy text-sm font-inter text-navy dark:text-white outline-none focus:border-gold"
                >
                  {ALL_PILLARS.map(k => (
                    <option key={k} value={k}>{PILLAR_MAP[k].label}</option>
                  ))}
                </select>
              </div>
              <textarea
                rows={3}
                value={newIdeaText}
                onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setNewIdeaText(e.target.value)}
                placeholder="Write your content idea or caption template..."
                className="w-full px-3 py-2 rounded-lg border border-gold/20 bg-white dark:bg-navy text-sm font-inter text-navy dark:text-white outline-none resize-none focus:border-gold"
              />
              <Button variant="accent" size="sm" onClick={addIdea} disabled={!newIdeaText.trim()}>
                <Plus size={14} />
                Save Idea
              </Button>
            </div>
          </Card>

          {/* AI ideas */}
          <div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAiIdeas(!showAiIdeas)}
            >
              <Lightbulb size={14} />
              {showAiIdeas ? 'Hide AI Ideas' : 'AI Content Ideas'}
            </Button>
            {showAiIdeas && (
              <Card className="!p-4 mt-3">
                <h4 className="text-xs font-montserrat font-semibold text-navy dark:text-white mb-3">
                  AI-Generated Post Ideas
                </h4>
                <div className="space-y-2">
                  {AI_IDEAS.map((idea, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-2 p-2 rounded-lg bg-surface dark:bg-navy/50"
                    >
                      <Sparkles size={12} className="text-gold mt-0.5 flex-shrink-0" />
                      <p className="text-xs font-inter text-navy dark:text-white">{idea}</p>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>

          {/* Caption templates by pillar */}
          <div>
            <h3 className="text-sm font-montserrat font-semibold text-navy dark:text-white mb-3">
              Pre-Built Caption Templates
            </h3>
            <div className="space-y-4">
              {ALL_PILLARS.map(pillarKey => {
                const pillar = PILLAR_MAP[pillarKey];
                const PillarIcon = pillar.icon;
                return (
                  <Card key={pillarKey} className="!p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <PillarIcon size={14} style={{ color: pillar.color }} />
                      <span className="text-xs font-montserrat font-semibold text-navy dark:text-white">
                        {pillar.label}
                      </span>
                    </div>
                    <div className="space-y-2">
                      {PILLAR_CAPTIONS[pillarKey].map((tmpl, i) => (
                        <p
                          key={i}
                          className="text-xs font-inter text-navy/70 dark:text-white/70 p-2 rounded-lg bg-surface dark:bg-navy/50 leading-relaxed"
                        >
                          {tmpl}
                        </p>
                      ))}
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Saved ideas */}
          {libraryIdeas.length > 0 && (
            <div>
              <h3 className="text-sm font-montserrat font-semibold text-navy dark:text-white mb-3">
                Your Saved Ideas
              </h3>
              <div className="space-y-3">
                {libraryIdeas.map((idea: LibraryIdea) => (
                  <Card key={idea.id} className="!p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="navy">{PILLAR_MAP[idea.pillar].label}</Badge>
                    </div>
                    {editingId === idea.id ? (
                      <div className="space-y-2">
                        <textarea
                          rows={3}
                          value={editingText}
                          onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setEditingText(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-gold/20 bg-white dark:bg-navy text-sm font-inter text-navy dark:text-white outline-none resize-none focus:border-gold"
                        />
                        <div className="flex gap-2">
                          <Button variant="accent" size="sm" onClick={() => saveEdit(idea.id)}>
                            Save
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => setEditingId(null)}>
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="text-xs font-inter text-navy/70 dark:text-white/70 mb-2 leading-relaxed">
                          {idea.caption}
                        </p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => startEdit(idea)}
                            className="text-xs text-gold hover:underline font-inter flex items-center gap-1"
                          >
                            <Edit3 size={10} /> Edit
                          </button>
                          <button
                            onClick={() => deleteIdea(idea.id)}
                            className="text-xs text-red-400 hover:underline font-inter flex items-center gap-1"
                          >
                            <Trash2 size={10} /> Delete
                          </button>
                        </div>
                      </>
                    )}
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
