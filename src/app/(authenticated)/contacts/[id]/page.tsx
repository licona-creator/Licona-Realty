'use client';

import { useState, useEffect, useCallback, type FormEvent } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/Toast';
import { BRAND } from '@/lib/brand';
import type { TrackType, PipelineStage } from '@/types/database';
import {
  ArrowLeft, Edit3, Trash2, Phone, Mail, MapPin, DollarSign,
  Tag, Globe, Briefcase, MessageSquare, Clock, PhoneCall,
  MessageCircle, FileText, Eye, Users, CalendarDays, Plus, Sparkles,
} from 'lucide-react';
import { AIAssistantPanel } from '@/components/ai/AIAssistantPanel';
import { AddressAutocomplete } from '@/components/shared/AddressAutocomplete';
import { calculateLeadScore, getScoreTailwind } from '@/lib/ai/lead-scoring';

interface ContactData {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  track_type: TrackType;
  pipeline_stage: PipelineStage;
  lead_source: string | null;
  language_preference: string;
  address_line_1: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  budget: string | null;
  location_preference: string | null;
  notes: string | null;
  lead_score: number;
  referral_partner_id: string | null;
  next_follow_up_date: string | null;
  last_contact_date: string | null;
  follow_up_notes: string | null;
  created_at: string;
  updated_at: string;
}

interface LinkedTransaction {
  id: string;
  property_address: string;
  status: string;
  contract_price: number | null;
  closing_date: string | null;
}

interface Activity {
  id: string;
  activity_type: string;
  direction: string | null;
  subject: string | null;
  description: string;
  activity_date: string;
  created_at: string;
}

const TRACK_OPTIONS: { value: TrackType; label: string }[] = [
  { value: 'buyer', label: 'Buyer' }, { value: 'seller', label: 'Seller' },
  { value: 'landlord', label: 'Landlord' }, { value: 'tenant', label: 'Tenant' },
  { value: 'investor', label: 'Investor' }, { value: 'sphere', label: 'Sphere' },
];

const PIPELINE_STAGES: { value: PipelineStage; label: string }[] = [
  { value: 'new', label: 'New' }, { value: 'contacted', label: 'Contacted' },
  { value: 'qualifying', label: 'Qualifying' }, { value: 'nurturing', label: 'Nurturing' },
  { value: 'showing', label: 'Showing' }, { value: 'offer', label: 'Offer' },
  { value: 'under_contract', label: 'Under Contract' }, { value: 'closing', label: 'Closing' },
  { value: 'closed', label: 'Closed' }, { value: 'lost', label: 'Lost' },
  { value: 'on_hold', label: 'On Hold' },
];

const LEAD_SOURCES = ['Qazzoo', 'Referral', 'Social Media', 'Website', 'Sphere', 'Other'];
const LANGUAGES = [
  { value: 'en', label: 'English' }, { value: 'es', label: 'Spanish' }, { value: 'bilingual', label: 'Bilingual' },
];

const ACTIVITY_TYPES = [
  { value: 'call', label: 'Call', icon: PhoneCall },
  { value: 'text', label: 'Text', icon: MessageCircle },
  { value: 'email', label: 'Email', icon: Mail },
  { value: 'note', label: 'Note', icon: FileText },
  { value: 'showing', label: 'Showing', icon: Eye },
  { value: 'meeting', label: 'Meeting', icon: Users },
  { value: 'other', label: 'Other', icon: Clock },
];

const ACTIVITY_ICONS: Record<string, typeof PhoneCall> = {
  call: PhoneCall, text: MessageCircle, email: Mail, note: FileText,
  showing: Eye, meeting: Users, status_change: Tag, document: FileText, other: Clock,
};

const STAGE_COLORS: Record<string, string> = {
  new: 'bg-blue-500/10 text-blue-600', contacted: 'bg-purple-500/10 text-purple-600',
  qualifying: 'bg-amber-500/10 text-amber-600', nurturing: 'bg-teal-500/10 text-teal-600',
  showing: 'bg-orange-500/10 text-orange-600', offer: 'bg-pink-500/10 text-pink-600',
  under_contract: 'bg-green-500/10 text-green-600', closing: 'bg-gold/10 text-gold',
  closed: 'bg-emerald-500/10 text-emerald-600', lost: 'bg-red-500/10 text-red-600',
  on_hold: 'bg-gray-500/10 text-gray-600',
};

const selectClassName = `w-full px-4 py-2.5 rounded-[8px] bg-white dark:bg-dark-card border border-gold/15 text-navy dark:text-white font-inter text-sm focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold transition-all duration-200 ease-in-out appearance-none`;

export default function ContactDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();

  const [contact, setContact] = useState<ContactData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<Record<string, string | null>>({});
  const [saving, setSaving] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [transactions, setTransactions] = useState<LinkedTransaction[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [showLogActivity, setShowLogActivity] = useState(false);
  const [activityForm, setActivityForm] = useState({ activity_type: 'call', direction: 'outbound', description: '', activity_date: '' });
  const [logSaving, setLogSaving] = useState(false);
  const [partners, setPartners] = useState<Array<{ id: string; first_name: string; last_name: string | null }>>([]);
  const [deleteActivityTarget, setDeleteActivityTarget] = useState<Activity | null>(null);
  const [showAI, setShowAI] = useState(false);
  const [insights, setInsights] = useState<Array<{ id: string; content: string; insight_type: string; is_pinned: boolean; created_at: string }>>([]);

  const fetchInsights = useCallback(async () => {
    try {
      const res = await fetch(`/api/ai/insights?contact_id=${id}&limit=10`);
      if (res.ok) {
        const data = await res.json();
        setInsights(data.insights || []);
      }
    } catch { /* empty */ }
  }, [id]);

  const fetchContact = useCallback(async () => {
    try {
      const res = await fetch(`/api/contacts/${id}`);
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error || 'Failed to load contact'); }
      const data = await res.json();
      setContact(data.contact);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load contact');
    } finally { setLoading(false); }
  }, [id]);

  const fetchRelatedData = useCallback(async () => {
    try {
      const res = await fetch('/api/transactions');
      if (res.ok) {
        const data = await res.json();
        setTransactions((data.transactions || []).filter((t: LinkedTransaction & { contact_id: string }) => t.contact_id === id));
      }
    } catch { /* empty */ }
    try {
      const res = await fetch(`/api/activities?contact_id=${id}&limit=20`);
      if (res.ok) {
        const data = await res.json();
        setActivities(data.activities || []);
      }
    } catch { /* empty */ }
  }, [id]);

  useEffect(() => { fetchContact(); fetchRelatedData(); fetchInsights(); }, [fetchContact, fetchRelatedData, fetchInsights]);

  function startEdit() {
    if (!contact) return;
    setEditForm({
      first_name: contact.first_name, last_name: contact.last_name,
      email: contact.email, phone: contact.phone,
      track_type: contact.track_type, pipeline_stage: contact.pipeline_stage,
      lead_source: contact.lead_source, language_preference: contact.language_preference,
      address_line_1: contact.address_line_1, city: contact.city, state: contact.state,
      zip_code: contact.zip_code, budget: contact.budget,
      location_preference: contact.location_preference, notes: contact.notes,
      next_follow_up_date: contact.next_follow_up_date, follow_up_notes: contact.follow_up_notes,
      referral_partner_id: contact.referral_partner_id,
    });
    setEditing(true);
    fetch('/api/referral-partners').then(r => r.json()).then(d => setPartners(d.partners || [])).catch(() => {});
  }

  async function handleSave() {
    if (!editForm.first_name?.trim() || !editForm.last_name?.trim()) {
      toast.error('Validation Error', 'First name and last name are required.'); return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/contacts/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first_name: editForm.first_name?.trim(), last_name: editForm.last_name?.trim(),
          email: editForm.email?.trim() || null, phone: editForm.phone?.trim() || null,
          track_type: editForm.track_type, pipeline_stage: editForm.pipeline_stage,
          lead_source: editForm.lead_source || null, language_preference: editForm.language_preference,
          address_line_1: editForm.address_line_1?.trim() || null, city: editForm.city?.trim() || null,
          state: editForm.state?.trim() || null, zip_code: editForm.zip_code?.trim() || null,
          budget: editForm.budget?.trim() || null, location_preference: editForm.location_preference?.trim() || null,
          notes: editForm.notes?.trim() || null, next_follow_up_date: editForm.next_follow_up_date || null,
          follow_up_notes: editForm.follow_up_notes?.trim() || null,
          referral_partner_id: editForm.referral_partner_id || null,
        }),
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error || 'Failed to update'); }
      const data = await res.json();
      setContact(data.contact);
      setEditing(false);
      toast.success('Contact Updated', `${data.contact.first_name} ${data.contact.last_name} has been updated.`);
      router.refresh();
    } catch (err) {
      toast.error('Update Failed', err instanceof Error ? err.message : 'Something went wrong.');
    } finally { setSaving(false); }
  }

  async function handleDelete() {
    try {
      const res = await fetch(`/api/contacts/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      toast.success('Contact Deleted', 'The contact has been removed.');
      router.push('/contacts');
    } catch (err) { toast.error('Delete Failed', err instanceof Error ? err.message : 'Something went wrong.'); }
    setShowDelete(false);
  }

  async function handleLogActivity(e: FormEvent) {
    e.preventDefault();
    if (!activityForm.description.trim()) { toast.error('Validation', 'Description is required.'); return; }
    setLogSaving(true);
    try {
      const res = await fetch('/api/activities', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contact_id: id, activity_type: activityForm.activity_type,
          direction: activityForm.direction || null, description: activityForm.description.trim(),
          activity_date: activityForm.activity_date || new Date().toISOString(),
        }),
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error || 'Failed to log activity'); }
      toast.success('Activity Logged', 'Activity has been recorded.');
      setActivityForm({ activity_type: 'call', direction: 'outbound', description: '', activity_date: '' });
      setShowLogActivity(false);
      fetchRelatedData();
      fetchContact();
      router.refresh();
    } catch (err) {
      toast.error('Error', err instanceof Error ? err.message : 'Something went wrong.');
    } finally { setLogSaving(false); }
  }

  async function handleDeleteActivity(activity: Activity) {
    try {
      const res = await fetch(`/api/activities/${activity.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete activity');
      toast.success('Activity Deleted', 'The activity has been removed.');
      setActivities(prev => prev.filter(a => a.id !== activity.id));
    } catch (err) {
      toast.error('Error', err instanceof Error ? err.message : 'Something went wrong.');
    }
    setDeleteActivityTarget(null);
  }

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><div className="w-6 h-6 border-2 border-gold border-t-transparent rounded-full animate-spin" /><span className="ml-2 text-sm text-navy/50 dark:text-white/50 font-inter">Loading contact...</span></div>;
  if (error || !contact) return <div className="p-4 lg:p-8 max-w-4xl mx-auto"><button onClick={() => router.push('/contacts')} className="flex items-center gap-2 text-sm text-gold font-montserrat font-medium mb-6 hover:underline"><ArrowLeft size={16} /> Back to Contacts</button><Card className="!p-8 text-center"><p className="text-red-500 font-inter">{error || 'Contact not found'}</p></Card></div>;

  const stageColor = STAGE_COLORS[contact.pipeline_stage] || STAGE_COLORS.new;

  return (
    <div className="p-3 pt-2 lg:p-8 max-w-4xl mx-auto">
      <button onClick={() => router.push('/contacts')} className="flex items-center gap-2 text-sm text-gold font-montserrat font-medium mb-6 hover:underline">
        <ArrowLeft size={16} /> Back to Contacts
      </button>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-gold/10 flex items-center justify-center flex-shrink-0">
            <span className="text-xl font-montserrat font-bold text-gold">{contact.first_name[0]}{contact.last_name[0]}</span>
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-navy dark:text-white" style={{ fontFamily: BRAND.fonts.playfair }}>{contact.first_name} {contact.last_name}</h1>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="text-[10px] font-montserrat font-semibold uppercase px-2 py-0.5 rounded-full bg-gold/10 text-gold">{contact.track_type}</span>
              <span className={`text-[10px] font-montserrat font-semibold px-2 py-0.5 rounded-full ${stageColor}`}>{contact.pipeline_stage.replace(/_/g, ' ')}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setShowAI(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-montserrat font-semibold text-white transition-colors hover:opacity-90"
            style={{ backgroundColor: '#1D9E75' }}
          >
            <Sparkles size={12} />
            <span className="hidden sm:inline">Ask Contact AI</span>
            <span className="sm:hidden">AI</span>
          </button>
          <Button variant="accent" size="sm" onClick={() => setShowLogActivity(true)}><Plus size={14} /><span className="hidden sm:inline ml-1">Log</span></Button>
          <Button variant="ghost" size="sm" onClick={startEdit}><Edit3 size={14} /><span className="hidden sm:inline ml-1">Edit</span></Button>
          <Button variant="ghost" size="sm" onClick={() => setShowDelete(true)} className="!text-red-500 hover:!bg-red-500/10"><Trash2 size={14} /></Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
        <div className="lg:col-span-2 space-y-4">
          {/* Contact Info */}
          <Card className="!p-5">
            <h3 className="text-sm font-montserrat font-semibold text-navy/70 dark:text-white/70 mb-4">Contact Information</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {contact.phone && <div className="flex items-center gap-3"><Phone size={14} className="text-gold flex-shrink-0" /><div><p className="text-xs text-navy/40 dark:text-white/40 font-inter">Phone</p><p className="text-sm font-inter text-navy dark:text-white">{contact.phone}</p></div></div>}
              {contact.email && <div className="flex items-center gap-3"><Mail size={14} className="text-gold flex-shrink-0" /><div><p className="text-xs text-navy/40 dark:text-white/40 font-inter">Email</p><p className="text-sm font-inter text-navy dark:text-white">{contact.email}</p></div></div>}
              {(contact.address_line_1 || contact.city) && <div className="flex items-center gap-3"><MapPin size={14} className="text-gold flex-shrink-0" /><div><p className="text-xs text-navy/40 dark:text-white/40 font-inter">Address</p><p className="text-sm font-inter text-navy dark:text-white">{contact.address_line_1 && <>{contact.address_line_1}<br /></>}{contact.city}{contact.state ? `, ${contact.state}` : ''} {contact.zip_code || ''}</p></div></div>}
              {contact.language_preference && <div className="flex items-center gap-3"><Globe size={14} className="text-gold flex-shrink-0" /><div><p className="text-xs text-navy/40 dark:text-white/40 font-inter">Language</p><p className="text-sm font-inter text-navy dark:text-white capitalize">{contact.language_preference === 'en' ? 'English' : contact.language_preference === 'es' ? 'Spanish' : 'Bilingual'}</p></div></div>}
              {contact.budget && <div className="flex items-center gap-3"><DollarSign size={14} className="text-gold flex-shrink-0" /><div><p className="text-xs text-navy/40 dark:text-white/40 font-inter">Budget</p><p className="text-sm font-inter text-navy dark:text-white">{contact.budget}</p></div></div>}
              {contact.location_preference && <div className="flex items-center gap-3"><MapPin size={14} className="text-gold flex-shrink-0" /><div><p className="text-xs text-navy/40 dark:text-white/40 font-inter">Location Preference</p><p className="text-sm font-inter text-navy dark:text-white">{contact.location_preference}</p></div></div>}
              {contact.lead_source && <div className="flex items-center gap-3"><Tag size={14} className="text-gold flex-shrink-0" /><div><p className="text-xs text-navy/40 dark:text-white/40 font-inter">Lead Source</p><p className="text-sm font-inter text-navy dark:text-white">{contact.lead_source}</p></div></div>}
            </div>
          </Card>

          {contact.notes && (
            <Card className="!p-5">
              <h3 className="text-sm font-montserrat font-semibold text-navy/70 dark:text-white/70 mb-3"><MessageSquare size={14} className="inline mr-2 text-gold" />Notes</h3>
              <p className="text-sm font-inter text-navy/70 dark:text-white/70 whitespace-pre-wrap">{contact.notes}</p>
            </Card>
          )}

          {/* Activity Timeline */}
          <Card className="!p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-montserrat font-semibold text-navy/70 dark:text-white/70 flex items-center gap-2">
                <Clock size={14} className="text-gold" /> Activity Timeline
              </h3>
              <Button variant="ghost" size="sm" onClick={() => setShowLogActivity(true)}><Plus size={12} /> Log</Button>
            </div>
            {activities.length > 0 ? (
              <div className="space-y-3">
                {activities.map(activity => {
                  const Icon = ACTIVITY_ICONS[activity.activity_type] || Clock;
                  return (
                    <div key={activity.id} className="group flex gap-3 p-3 rounded-lg bg-surface dark:bg-navy/30">
                      <div className="w-8 h-8 rounded-full bg-gold/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Icon size={14} className="text-gold" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                          <span className="text-xs font-montserrat font-semibold text-navy dark:text-white capitalize">{activity.activity_type}</span>
                          {activity.direction && (
                            <span className={`text-[10px] font-montserrat font-medium px-1.5 py-0.5 rounded-full ${activity.direction === 'outbound' ? 'bg-blue-500/10 text-blue-600' : 'bg-green-500/10 text-green-600'}`}>
                              {activity.direction}
                            </span>
                          )}
                        </div>
                        <p className="text-sm font-inter text-navy/70 dark:text-white/70 whitespace-pre-wrap">{activity.description}</p>
                        <p className="text-[10px] text-navy/30 dark:text-white/30 font-inter mt-1">
                          {new Date(activity.activity_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} at {new Date(activity.activity_date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                        </p>
                      </div>
                      <button
                        onClick={() => setDeleteActivityTarget(activity)}
                        className="p-1.5 rounded hover:bg-red-500/10 text-navy/20 dark:text-white/20 hover:text-red-500 transition-colors opacity-100 sm:opacity-0 sm:group-hover:opacity-100 flex-shrink-0 self-start"
                        title="Delete activity"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-navy/40 dark:text-white/40 font-inter">No activities logged yet. Use the Log Activity button to start tracking interactions.</p>
            )}
          </Card>

          {/* AI Insights */}
          {insights.length > 0 && (
            <Card className="!p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-montserrat font-semibold text-navy/70 dark:text-white/70 flex items-center gap-2">
                  <Sparkles size={14} className="text-gold" /> AI Insights
                </h3>
                <span className="text-[10px] text-navy/30 dark:text-white/30 font-inter">{insights.length} saved</span>
              </div>
              <div className="space-y-2">
                {insights.map(insight => (
                  <div key={insight.id} className={`p-3 rounded-lg bg-surface dark:bg-navy/30 ${insight.is_pinned ? 'border border-gold/20' : ''}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-montserrat font-semibold text-gold uppercase">{insight.insight_type.replace(/_/g, ' ')}</span>
                      {insight.is_pinned && <span className="text-[9px] text-gold font-inter">Pinned</span>}
                    </div>
                    <p className="text-xs font-inter text-navy/70 dark:text-white/70 whitespace-pre-wrap line-clamp-4">{insight.content}</p>
                    <p className="text-[10px] text-navy/30 dark:text-white/30 font-inter mt-1">
                      {new Date(insight.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Linked Transactions */}
          <Card className="!p-5">
            <h3 className="text-sm font-montserrat font-semibold text-navy/70 dark:text-white/70 mb-3"><Briefcase size={14} className="inline mr-2 text-gold" />Deals</h3>
            {transactions.length > 0 ? (
              <div className="space-y-2">
                {transactions.map(tx => (
                  <button key={tx.id} onClick={() => router.push(`/transactions/${tx.id}`)} className="w-full flex items-center justify-between p-3 rounded-lg bg-surface dark:bg-navy/30 hover:bg-gold/5 transition-colors text-left">
                    <div>
                      <p className="text-sm font-montserrat font-medium text-navy dark:text-white">{tx.property_address}</p>
                      <p className="text-xs text-navy/40 dark:text-white/40 font-inter">{tx.contract_price ? `$${tx.contract_price.toLocaleString()}` : 'No price set'}{tx.closing_date ? ` - Closes ${new Date(tx.closing_date + 'T00:00:00').toLocaleDateString()}` : ''}</p>
                    </div>
                    <Badge variant={tx.status === 'closed' ? 'success' : tx.status === 'lost' ? 'danger' : 'gold'}>{tx.status}</Badge>
                  </button>
                ))}
              </div>
            ) : <p className="text-sm text-navy/40 dark:text-white/40 font-inter">No deals linked.</p>}
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Follow-up */}
          {contact.next_follow_up_date && (
            <Card className={`!p-5 ${new Date(contact.next_follow_up_date + 'T00:00:00') < new Date(new Date().toISOString().split('T')[0] + 'T00:00:00') ? '!border-red-500/30 !bg-red-500/5' : ''}`}>
              <h3 className="text-sm font-montserrat font-semibold text-navy/70 dark:text-white/70 mb-2 flex items-center gap-2"><CalendarDays size={14} className="text-gold" />Follow-Up</h3>
              <p className={`text-sm font-inter font-medium ${new Date(contact.next_follow_up_date + 'T00:00:00') < new Date(new Date().toISOString().split('T')[0] + 'T00:00:00') ? 'text-red-500' : 'text-navy dark:text-white'}`}>
                {new Date(contact.next_follow_up_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </p>
              {new Date(contact.next_follow_up_date + 'T00:00:00') < new Date(new Date().toISOString().split('T')[0] + 'T00:00:00') && (
                <p className="text-xs text-red-500 font-inter mt-1">Overdue</p>
              )}
              {contact.follow_up_notes && <p className="text-xs text-navy/50 dark:text-white/50 font-inter mt-2">{contact.follow_up_notes}</p>}
            </Card>
          )}

          <Card className="!p-5">
            <h3 className="text-sm font-montserrat font-semibold text-navy/70 dark:text-white/70 mb-3">Details</h3>
            <div className="space-y-3">
              <div><p className="text-xs text-navy/40 dark:text-white/40 font-inter">Track Type</p><p className="text-sm font-inter text-navy dark:text-white capitalize">{contact.track_type}</p></div>
              <div><p className="text-xs text-navy/40 dark:text-white/40 font-inter">Pipeline Stage</p><p className="text-sm font-inter text-navy dark:text-white capitalize">{contact.pipeline_stage.replace(/_/g, ' ')}</p></div>
              {(() => {
                const inboundCount = activities.filter(a => a.direction === 'inbound').length;
                const hasActiveTx = transactions.some(t => !['closed', 'cancelled', 'lost'].includes(t.status));
                const scoreData = calculateLeadScore({
                  phone: contact.phone,
                  email: contact.email,
                  budget: contact.budget,
                  pipeline_stage: contact.pipeline_stage,
                  referral_partner_id: contact.referral_partner_id,
                  last_contact_date: contact.last_contact_date,
                  inbound_activity_count: inboundCount,
                  has_active_transaction: hasActiveTx,
                });
                const colors = getScoreTailwind(scoreData.score);
                return (
                  <div>
                    <p className="text-xs text-navy/40 dark:text-white/40 font-inter mb-2">Lead Score</p>
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-full ${colors.bg} ${colors.text} flex items-center justify-center font-montserrat font-bold text-lg ring-2 ${colors.ring}`}>
                        {scoreData.score}
                      </div>
                      <div className="flex-1 space-y-0.5">
                        {scoreData.factors.slice(0, 4).map((f, fi) => (
                          <p key={fi} className={`text-[10px] font-inter ${f.points >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                            {f.points >= 0 ? '+' : ''}{f.points} {f.label}
                          </p>
                        ))}
                        {scoreData.factors.length > 4 && (
                          <p className="text-[10px] font-inter text-navy/30 dark:text-white/30">+{scoreData.factors.length - 4} more factors</p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()}
              {contact.last_contact_date && <div><p className="text-xs text-navy/40 dark:text-white/40 font-inter">Last Contact</p><p className="text-sm font-inter text-navy dark:text-white">{new Date(contact.last_contact_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p></div>}
              <div><p className="text-xs text-navy/40 dark:text-white/40 font-inter">Date Added</p><p className="text-sm font-inter text-navy dark:text-white">{new Date(contact.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p></div>
            </div>
          </Card>

          {/* Quick Actions */}
          <Card className="!p-5">
            <h3 className="text-sm font-montserrat font-semibold text-navy/70 dark:text-white/70 mb-3">Quick Actions</h3>
            <div className="space-y-2">
              {contact.phone && <a href={`tel:${contact.phone}`} className="flex items-center gap-3 p-2.5 rounded-lg bg-surface dark:bg-navy/30 hover:bg-gold/5 transition-colors text-sm font-inter text-navy dark:text-white"><PhoneCall size={14} className="text-gold" />Call {contact.first_name}</a>}
              {contact.phone && <a href={`sms:${contact.phone}`} className="flex items-center gap-3 p-2.5 rounded-lg bg-surface dark:bg-navy/30 hover:bg-gold/5 transition-colors text-sm font-inter text-navy dark:text-white"><MessageCircle size={14} className="text-gold" />Text {contact.first_name}</a>}
              <button onClick={() => setShowLogActivity(true)} className="w-full flex items-center gap-3 p-2.5 rounded-lg bg-surface dark:bg-navy/30 hover:bg-gold/5 transition-colors text-sm font-inter text-navy dark:text-white text-left"><FileText size={14} className="text-gold" />Log Activity</button>
            </div>
          </Card>
        </div>
      </div>

      {/* End of contact details */}
      <div className="mt-8 pb-12 flex justify-center">
        <span className="text-[10px] text-navy/20 dark:text-white/20 font-inter">End of contact details</span>
      </div>

      {/* Edit Modal */}
      <Modal open={editing} onClose={() => !saving && setEditing(false)} title="Edit Contact" size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input label="First Name *" value={editForm.first_name || ''} onChange={e => setEditForm(p => ({ ...p, first_name: e.target.value }))} disabled={saving} />
            <Input label="Last Name *" value={editForm.last_name || ''} onChange={e => setEditForm(p => ({ ...p, last_name: e.target.value }))} disabled={saving} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input label="Email" type="email" value={editForm.email || ''} onChange={e => setEditForm(p => ({ ...p, email: e.target.value }))} disabled={saving} />
            <Input label="Phone" type="tel" value={editForm.phone || ''} onChange={e => setEditForm(p => ({ ...p, phone: e.target.value }))} disabled={saving} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><label className="block text-sm font-montserrat font-medium text-navy dark:text-white mb-1.5">Track Type</label><select value={editForm.track_type || 'buyer'} onChange={e => setEditForm(p => ({ ...p, track_type: e.target.value }))} className={selectClassName} disabled={saving}>{TRACK_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select></div>
            <div><label className="block text-sm font-montserrat font-medium text-navy dark:text-white mb-1.5">Pipeline Stage</label><select value={editForm.pipeline_stage || 'new'} onChange={e => setEditForm(p => ({ ...p, pipeline_stage: e.target.value }))} className={selectClassName} disabled={saving}>{PIPELINE_STAGES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select></div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><label className="block text-sm font-montserrat font-medium text-navy dark:text-white mb-1.5">Lead Source</label><select value={editForm.lead_source || ''} onChange={e => setEditForm(p => ({ ...p, lead_source: e.target.value }))} className={selectClassName} disabled={saving}><option value="">None</option>{LEAD_SOURCES.map(s => <option key={s} value={s.toLowerCase()}>{s}</option>)}</select></div>
            <div><label className="block text-sm font-montserrat font-medium text-navy dark:text-white mb-1.5">Language</label><select value={editForm.language_preference || 'en'} onChange={e => setEditForm(p => ({ ...p, language_preference: e.target.value }))} className={selectClassName} disabled={saving}>{LANGUAGES.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}</select></div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input label="Budget" placeholder="$300k - $450k" value={editForm.budget || ''} onChange={e => setEditForm(p => ({ ...p, budget: e.target.value }))} disabled={saving} />
            <Input label="Location Preference" placeholder="Denton County" value={editForm.location_preference || ''} onChange={e => setEditForm(p => ({ ...p, location_preference: e.target.value }))} disabled={saving} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input label="Next Follow-Up Date" type="date" value={editForm.next_follow_up_date || ''} onChange={e => setEditForm(p => ({ ...p, next_follow_up_date: e.target.value }))} disabled={saving} />
            <div><label className="block text-sm font-montserrat font-medium text-navy dark:text-white mb-1.5">Referral Partner</label><select value={editForm.referral_partner_id || ''} onChange={e => setEditForm(p => ({ ...p, referral_partner_id: e.target.value }))} className={selectClassName} disabled={saving}><option value="">None</option>{partners.map(p => <option key={p.id} value={p.id}>{p.first_name} {p.last_name || ''}</option>)}</select></div>
          </div>
          <Input label="Follow-Up Notes" placeholder="Reminder notes for follow-up..." value={editForm.follow_up_notes || ''} onChange={e => setEditForm(p => ({ ...p, follow_up_notes: e.target.value }))} disabled={saving} />
          <AddressAutocomplete
            label="Address"
            placeholder="Start typing an address..."
            value={editForm.address_line_1 || ''}
            onRawChange={val => setEditForm(p => ({ ...p, address_line_1: val }))}
            onChange={({ street, city, state, zip }) => {
              setEditForm(p => ({
                ...p,
                address_line_1: street,
                city: city || p.city,
                state: state || p.state,
                zip_code: zip || p.zip_code,
              }));
            }}
            disabled={saving}
          />
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
            <div className="col-span-3"><Input label="City" value={editForm.city || ''} onChange={e => setEditForm(p => ({ ...p, city: e.target.value }))} disabled={saving} /></div>
            <div className="col-span-1"><Input label="State" value={editForm.state || ''} onChange={e => setEditForm(p => ({ ...p, state: e.target.value }))} disabled={saving} /></div>
            <div className="col-span-2"><Input label="Zip" value={editForm.zip_code || ''} onChange={e => setEditForm(p => ({ ...p, zip_code: e.target.value }))} disabled={saving} /></div>
          </div>
          <div><label className="block text-sm font-montserrat font-medium text-navy dark:text-white mb-1.5">Notes</label><textarea rows={3} value={editForm.notes || ''} onChange={e => setEditForm(p => ({ ...p, notes: e.target.value }))} disabled={saving} className={`${selectClassName} resize-none`} placeholder="Additional notes..." /></div>
          <div className="h-4" />
        </div>
        <div className="flex justify-end gap-3 pt-3 border-t border-gold/10 mt-2">
          <Button variant="ghost" onClick={() => setEditing(false)} disabled={saving}>Cancel</Button>
          <Button variant="accent" onClick={handleSave} loading={saving}>{saving ? 'Saving...' : 'Save Changes'}</Button>
        </div>
      </Modal>

      {/* Log Activity Modal */}
      <Modal open={showLogActivity} onClose={() => !logSaving && setShowLogActivity(false)} title="Log Activity" size="md">
        <form onSubmit={handleLogActivity} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-sm font-montserrat font-medium text-navy dark:text-white mb-1.5">Activity Type *</label><select value={activityForm.activity_type} onChange={e => setActivityForm(p => ({ ...p, activity_type: e.target.value }))} className={selectClassName} disabled={logSaving}>{ACTIVITY_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}</select></div>
            <div><label className="block text-sm font-montserrat font-medium text-navy dark:text-white mb-1.5">Direction</label><select value={activityForm.direction} onChange={e => setActivityForm(p => ({ ...p, direction: e.target.value }))} className={selectClassName} disabled={logSaving}><option value="outbound">Outbound</option><option value="inbound">Inbound</option></select></div>
          </div>
          <div><label className="block text-sm font-montserrat font-medium text-navy dark:text-white mb-1.5">Description *</label><textarea rows={4} value={activityForm.description} onChange={e => setActivityForm(p => ({ ...p, description: e.target.value }))} className={`${selectClassName} resize-none`} placeholder="What happened?" disabled={logSaving} /></div>
          <Input label="Date" type="datetime-local" value={activityForm.activity_date} onChange={e => setActivityForm(p => ({ ...p, activity_date: e.target.value }))} disabled={logSaving} />
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => setShowLogActivity(false)} disabled={logSaving}>Cancel</Button>
            <Button type="submit" variant="accent" loading={logSaving}>{logSaving ? 'Saving...' : 'Log Activity'}</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog open={showDelete} onClose={() => setShowDelete(false)} onConfirm={handleDelete} title="Delete Contact?" message={`Are you sure you want to delete ${contact.first_name} ${contact.last_name}? This action cannot be undone.`} variant="danger" />
      <ConfirmDialog open={!!deleteActivityTarget} onClose={() => setDeleteActivityTarget(null)} onConfirm={() => deleteActivityTarget && handleDeleteActivity(deleteActivityTarget)} title="Delete this activity?" message="This activity will be permanently removed." variant="danger" />
      <AIAssistantPanel
        open={showAI}
        onClose={() => setShowAI(false)}
        mode="contact"
        contactId={id}
        contactName={`${contact.first_name} ${contact.last_name}`}
        contactStage={contact.pipeline_stage}
      />
    </div>
  );
}
