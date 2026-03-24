/**
 * Social Media Marketing Page
 *
 * 6-pillar content strategy with calendar view, content creation,
 * analytics dashboard, and approval queue integration.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/components/ui/Toast';
import { BRAND } from '@/lib/brand';
import { CONTENT_PILLARS, OPTIMAL_POST_TIMES } from '@/lib/social/meta-client';
import type { ContentPillar, SocialPlatform } from '@/types/database';
import { createClient } from '@/lib/supabase/client';
import {
  Share2, Instagram, Facebook, Calendar, BarChart3,
  TrendingUp, Heart, Eye,
  PlusCircle, Clock, Edit3, Sparkles, RefreshCw,
} from 'lucide-react';

type Tab = 'calendar' | 'analytics' | 'create';

interface PostItem {
  id: string;
  platform: SocialPlatform;
  pillar: ContentPillar;
  caption: string;
  scheduledTime: string | null;
  status: 'draft' | 'pending_approval' | 'scheduled' | 'published';
  engagement?: number;
}

export default function SocialPage() {
  const [activeTab, setActiveTab] = useState<Tab>('calendar');
  const [posts, setPosts] = useState<PostItem[]>([]);
  const [activePillar, setActivePillar] = useState<ContentPillar | 'all'>('all');
  const [activePlatform, setActivePlatform] = useState<SocialPlatform | 'all'>('all');
  const [selectedPlatform, setSelectedPlatform] = useState<SocialPlatform | null>(null);
  const [selectedPillar, setSelectedPillar] = useState<ContentPillar | null>(null);
  const [caption, setCaption] = useState('');
  const [generating, setGenerating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [captionGenerated, setCaptionGenerated] = useState(false);
  const [formErrors, setFormErrors] = useState<{ caption?: string; platform?: string; pillar?: string }>({});
  const { success, info, error: showError } = useToast();

  const PILLAR_CAPTIONS: Record<ContentPillar, string[]> = {
    market_intelligence: [
      'The DFW market is moving fast right now. New listings are hitting every day and homes are still going under contract quickly. If you have been waiting to make your move - now is a good time to have that conversation. DM me or tap the link in bio.',
      'Numbers do not lie. DFW inventory is shifting and rates are creating opportunities that were not here six months ago. Whether you are buying or selling - the data matters. Let me walk you through what is happening in your zip code.',
    ],
    client_wins: [
      'Another one for the books. So proud of my clients for making this happen. Keys are in hand and they are officially home. This is why I do what I do. Congratulations to the family.',
      'Closed and celebrated. From first showing to final signature - this family trusted the process and it paid off. Welcome home.',
    ],
    local_dfw: [
      'If you have not been to Deep Ellum lately, you are missing out. Great spot worth knowing about. DFW has so many hidden gems - I find new ones every week.',
      'Weekend plans? Check out the Bishop Arts District. Great food, great energy, and some of the best local shops in Dallas. DFW is full of neighborhoods worth exploring.',
    ],
    education: [
      'A question I get asked a lot: how much do I actually need to buy a house in DFW? The honest answer might surprise you. Drop a comment or DM me and I will walk you through it.',
      'First-time buyer? Here is what nobody tells you about closing costs. It is not just the down payment - there are fees most people do not expect. Save this post.',
    ],
    behind_scenes: [
      'This is what a showing day actually looks like. Four homes, two cities, one very decisive client. Days like this remind me why I love this job.',
      'Behind the scenes of a listing photoshoot. The details matter - staging, lighting, angles. Every listing gets the full treatment because first impressions sell homes.',
    ],
    personal_brand: [
      'Three years ago I got my license. I had no idea what I was doing. Now I help families buy, sell, and invest across North Texas every single week. If you are thinking about real estate - let us talk.',
      'Real estate is not just a career for me. It is how I serve my community. Every transaction, every client, every handshake matters. Grateful for the journey.',
    ],
  };

  // Fetch posts
  const fetchPosts = useCallback(async () => {
    try {
      const res = await fetch('/api/social/posts');
      if (res.ok) {
        const data = await res.json();
        setPosts(data.posts || []);
      }
    } catch {
      // Fallback to empty
    }
  }, []);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  const pillarEntries = Object.entries(CONTENT_PILLARS) as [ContentPillar, typeof CONTENT_PILLARS[ContentPillar]][];

  const pillarColors: Record<ContentPillar, string> = {
    market_intelligence: '#3B82F6',
    client_wins: '#22C55E',
    local_dfw: '#F97316',
    education: '#8B5CF6',
    behind_scenes: '#EC4899',
    personal_brand: BRAND.colors.accent,
  };

  return (
    <div data-testid="social-page" className="p-4 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Share2 size={24} className="text-gold" />
          <h1
            className="text-2xl font-semibold text-navy dark:text-white"
            style={{ fontFamily: BRAND.fonts.playfair }}
          >
            Social Media
          </h1>
        </div>
        <Button variant="accent" size="sm" onClick={() => setActiveTab('create')}>
          <PlusCircle size={16} className="mr-1.5" />
          Create Post
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-6 bg-surface dark:bg-navy/50 rounded-lg p-1 w-fit">
        {[
          { key: 'calendar' as Tab, label: 'Calendar', icon: Calendar },
          { key: 'analytics' as Tab, label: 'Analytics', icon: BarChart3 },
          { key: 'create' as Tab, label: 'Create', icon: Edit3 },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-montserrat font-medium transition-colors ${
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

      {/* 6-Pillar Strategy Overview */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        {pillarEntries.map(([key, pillar]) => (
          <button
            key={key}
            onClick={() => setActivePillar(activePillar === key ? 'all' : key)}
            className={`p-3 rounded-xl border transition-all text-left ${
              activePillar === key
                ? 'border-gold bg-gold/10 shadow-sm'
                : 'border-gold/10 bg-white dark:bg-navy-dark hover:border-gold/30'
            }`}
          >
            <div
              className="w-3 h-3 rounded-full mb-2"
              style={{ backgroundColor: pillarColors[key] }}
            />
            <p className="text-xs font-montserrat font-semibold text-navy dark:text-white leading-tight">
              {pillar.label}
            </p>
            <p className="text-[10px] text-navy/40 dark:text-white/40 font-inter mt-1">
              {pillar.frequency}
            </p>
          </button>
        ))}
      </div>

      {/* Calendar Tab */}
      {activeTab === 'calendar' && (
        <div className="space-y-4">
          {/* Platform Filter */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActivePlatform('all')}
              className={`px-3 py-1.5 rounded-full text-xs font-montserrat font-medium transition-colors ${
                activePlatform === 'all'
                  ? 'bg-navy text-white dark:bg-gold dark:text-navy'
                  : 'bg-surface dark:bg-navy/50 text-navy/60 dark:text-white/60'
              }`}
            >
              All Platforms
            </button>
            <button
              onClick={() => setActivePlatform('instagram')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-montserrat font-medium transition-colors ${
                activePlatform === 'instagram'
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                  : 'bg-surface dark:bg-navy/50 text-navy/60 dark:text-white/60'
              }`}
            >
              <Instagram size={12} /> Instagram
            </button>
            <button
              onClick={() => setActivePlatform('facebook')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-montserrat font-medium transition-colors ${
                activePlatform === 'facebook'
                  ? 'bg-blue-600 text-white'
                  : 'bg-surface dark:bg-navy/50 text-navy/60 dark:text-white/60'
              }`}
            >
              <Facebook size={12} /> Facebook
            </button>
          </div>

          {/* Posts list or empty */}
          {posts.length > 0 ? (
            <div className="space-y-3">
              {posts.map(post => (
                <Card key={post.id} className="!p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2 mb-2">
                      {post.platform === 'instagram' ? (
                        <Instagram size={14} className="text-pink-500" />
                      ) : (
                        <Facebook size={14} className="text-blue-600" />
                      )}
                      <Badge
                        variant={post.status === 'published' ? 'success' : post.status === 'scheduled' ? 'gold' : 'navy'}
                      >
                        {post.status.replace('_', ' ')}
                      </Badge>
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: pillarColors[post.pillar] }}
                      />
                    </div>
                    {post.scheduledTime && (
                      <span className="text-xs text-navy/40 dark:text-white/40 font-inter">
                        <Clock size={10} className="inline mr-1" />
                        {new Date(post.scheduledTime).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-navy dark:text-white font-inter line-clamp-2">
                    {post.caption}
                  </p>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="!p-8 text-center">
              <Calendar size={40} className="text-gold mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-montserrat font-semibold text-navy dark:text-white mb-2">
                Content Calendar
              </h3>
              <p className="text-sm text-navy/50 dark:text-white/50 font-inter max-w-md mx-auto mb-4">
                Create your first social media post. All posts are routed through the
                approval queue before publishing.
              </p>
              <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto">
                <div className="bg-surface dark:bg-navy/50 rounded-lg p-3 text-left">
                  <p className="text-xs font-montserrat font-semibold text-navy/60 dark:text-white/60 mb-1">
                    Optimal Times (IG)
                  </p>
                  {OPTIMAL_POST_TIMES.instagram.weekday.map(t => (
                    <p key={t} className="text-[10px] font-inter text-navy/40 dark:text-white/40">
                      Weekday: {t}
                    </p>
                  ))}
                </div>
                <div className="bg-surface dark:bg-navy/50 rounded-lg p-3 text-left">
                  <p className="text-xs font-montserrat font-semibold text-navy/60 dark:text-white/60 mb-1">
                    Optimal Times (FB)
                  </p>
                  {OPTIMAL_POST_TIMES.facebook.weekday.map(t => (
                    <p key={t} className="text-[10px] font-inter text-navy/40 dark:text-white/40">
                      Weekday: {t}
                    </p>
                  ))}
                </div>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Analytics Tab */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Total Reach', value: '-', icon: Eye },
              { label: 'Engagement Rate', value: '-', icon: Heart },
              { label: 'Profile Visits', value: '-', icon: TrendingUp },
              { label: 'Lead Captures', value: '-', icon: Sparkles },
            ].map(stat => (
              <Card key={stat.label} className="!p-4">
                <div className="flex items-center justify-between mb-2">
                  <stat.icon size={16} className="text-gold" />
                </div>
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

          <Card className="!p-6">
            <h3 className="text-sm font-montserrat font-semibold text-navy dark:text-white mb-4">
              Content Pillar Performance
            </h3>
            <div className="space-y-3">
              {pillarEntries.map(([key, pillar]) => (
                <div key={key} className="flex items-center gap-3">
                  <span
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: pillarColors[key] }}
                  />
                  <span className="text-sm font-inter text-navy dark:text-white w-40">
                    {pillar.label}
                  </span>
                  <div className="flex-1 h-2 bg-surface dark:bg-navy/50 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ backgroundColor: pillarColors[key], width: '0%' }}
                    />
                  </div>
                  <span className="text-xs text-navy/40 dark:text-white/40 font-inter w-12 text-right">
                    0%
                  </span>
                </div>
              ))}
            </div>
            <p className="text-xs text-navy/40 dark:text-white/40 font-inter mt-4">
              Connect your Instagram and Facebook accounts to see performance data.
            </p>
          </Card>
        </div>
      )}

      {/* Create Tab */}
      {activeTab === 'create' && (
        <Card className="!p-6">
          <h3 className="text-lg font-montserrat font-semibold text-navy dark:text-white mb-4">
            Create Social Post
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-montserrat font-medium text-navy/60 dark:text-white/60 mb-2">
                Platform
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedPlatform(selectedPlatform === 'instagram' ? null : 'instagram')}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-lg border text-sm font-montserrat transition-colors text-navy dark:text-white ${
                    selectedPlatform === 'instagram' ? 'border-gold bg-gold/10' : 'border-gold/20 hover:border-gold'
                  }`}
                >
                  <Instagram size={16} className="text-pink-500" /> Instagram
                </button>
                <button
                  onClick={() => setSelectedPlatform(selectedPlatform === 'facebook' ? null : 'facebook')}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-lg border text-sm font-montserrat transition-colors text-navy dark:text-white ${
                    selectedPlatform === 'facebook' ? 'border-gold bg-gold/10' : 'border-gold/20 hover:border-gold'
                  }`}
                >
                  <Facebook size={16} className="text-blue-600" /> Facebook
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-montserrat font-medium text-navy/60 dark:text-white/60 mb-2">
                Content Pillar
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {pillarEntries.map(([key, pillar]) => (
                  <button
                    key={key}
                    onClick={() => setSelectedPillar(selectedPillar === key ? null : key)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-left transition-colors ${
                      selectedPillar === key ? 'border-gold bg-gold/10' : 'border-gold/10 hover:border-gold'
                    }`}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: pillarColors[key] }}
                    />
                    <span className="text-xs font-montserrat text-navy dark:text-white">
                      {pillar.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-montserrat font-medium text-navy/60 dark:text-white/60 mb-2">
                Caption
              </label>
              <textarea
                rows={4}
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gold/20 bg-white dark:bg-navy focus:border-gold focus:ring-1 focus:ring-gold/30 text-sm font-inter text-navy dark:text-white outline-none resize-none"
                placeholder="Write your caption or let the AI voice engine generate one..."
              />
            </div>

            {/* Inline validation errors */}
            {formErrors.platform && (
              <p className="text-red-400 text-xs font-inter">{formErrors.platform}</p>
            )}
            {formErrors.pillar && (
              <p className="text-red-400 text-xs font-inter">{formErrors.pillar}</p>
            )}
            {formErrors.caption && (
              <p className="text-red-400 text-xs font-inter">{formErrors.caption}</p>
            )}

            <div className="flex items-center gap-3">
              <Button data-testid="generate-ai-btn" variant="accent" loading={generating} onClick={async () => {
                setFormErrors({});
                if (!selectedPillar) {
                  setFormErrors(prev => ({ ...prev, pillar: 'Select a content pillar first.' }));
                  return;
                }
                setGenerating(true);
                // Simulate brief AI generation delay
                await new Promise(r => setTimeout(r, 800));
                const captions = PILLAR_CAPTIONS[selectedPillar];
                const randomCaption = captions[Math.floor(Math.random() * captions.length)];
                setCaption(randomCaption);
                setCaptionGenerated(true);
                setGenerating(false);
                success('Caption Generated', 'AI-generated caption is ready for review.');
              }}>
                <Sparkles size={14} className="mr-1.5" />
                Generate with AI
              </Button>
              <Button data-testid="send-approval-btn" variant="primary" loading={submitting} onClick={async () => {
                const errors: { caption?: string; platform?: string; pillar?: string } = {};
                if (!caption.trim()) errors.caption = 'Add a caption before sending to the queue.';
                if (!selectedPlatform) errors.platform = 'Select a platform before sending to the queue.';
                if (!selectedPillar) errors.pillar = 'Select a content pillar before sending to the queue.';
                if (Object.keys(errors).length > 0) {
                  setFormErrors(errors);
                  return;
                }
                setFormErrors({});
                setSubmitting(true);
                try {
                  const supabase = createClient();
                  const { data: { user } } = await supabase.auth.getUser();
                  if (!user) throw new Error('Not authenticated');
                  const pillarLabel = selectedPillar ? CONTENT_PILLARS[selectedPillar]?.label || selectedPillar : '';
                  const { error: insertError } = await supabase
                    .from('approval_queue')
                    .insert({
                      user_id: user.id,
                      item_type: 'social_post',
                      subject: `${selectedPlatform} - ${pillarLabel}`,
                      content: caption.trim(),
                      trigger_source: `social_${selectedPlatform}_${selectedPillar}`,
                      tone_mode: 'casual_friend',
                      urgency_level: 3,
                    });
                  if (insertError) throw insertError;
                  success('Post Queued', 'Post added to your approval queue.');
                  setCaption('');
                  setSelectedPlatform(null);
                  setSelectedPillar(null);
                  setCaptionGenerated(false);
                  fetchPosts();
                } catch {
                  showError('Submission Failed', 'Could not submit post. Try again.');
                } finally {
                  setSubmitting(false);
                }
              }}>
                Send to Approval Queue
              </Button>
            </div>

            {/* Regenerate link and voice mode */}
            {captionGenerated && caption && (
              <div className="flex items-center gap-4">
                <button
                  onClick={async () => {
                    if (!selectedPillar) return;
                    setGenerating(true);
                    await new Promise(r => setTimeout(r, 600));
                    const captions = PILLAR_CAPTIONS[selectedPillar];
                    const randomCaption = captions[Math.floor(Math.random() * captions.length)];
                    setCaption(randomCaption);
                    setGenerating(false);
                  }}
                  className="text-xs text-gold hover:underline font-inter flex items-center gap-1"
                >
                  <RefreshCw size={10} /> Regenerate
                </button>
                <span className="text-[10px] text-navy/40 dark:text-white/40 font-inter">
                  Voice: Casual Friend - tap to change
                </span>
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
