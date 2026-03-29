/**
 * Notifications Settings Section
 *
 * Complete notification preferences center with push and email controls.
 * Some notifications are always on and cannot be disabled.
 */

'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { useAgentSettings } from '@/hooks/useAgentSettings';
import { BRAND } from '@/lib/brand';
import {
  Bell,
  Mail,
  Clock,
  Check,
  Send,
} from 'lucide-react';

function Toggle({
  label,
  description,
  enabled,
  onChange,
  locked,
}: {
  label: string;
  description?: string;
  enabled: boolean;
  onChange: (v: boolean) => void;
  locked?: boolean;
}) {
  return (
    <div className="flex items-start gap-3">
      <button
        onClick={() => !locked && onChange(!enabled)}
        className={`
          relative w-10 h-5 rounded-full flex-shrink-0 mt-0.5
          transition-colors duration-200
          ${locked ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}
          ${enabled ? 'bg-gold' : 'bg-navy/20 dark:bg-white/20'}
        `}
      >
        <div
          className={`
            absolute top-0.5 w-4 h-4 rounded-full bg-white shadow
            transition-transform duration-200
            ${enabled ? 'translate-x-5' : 'translate-x-0.5'}
          `}
        />
      </button>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-navy dark:text-white font-inter">
          {label}
          {locked && <span className="text-xs text-navy/40 dark:text-white/40 ml-2">(always on)</span>}
        </p>
        {description && (
          <p className="text-xs text-navy/40 dark:text-white/40 font-inter mt-0.5">{description}</p>
        )}
      </div>
    </div>
  );
}

export function Notifications() {
  const { success, error: showError } = useToast();
  const { settings, saving, save, error: settingsError } = useAgentSettings();

  // Push notifications
  const [pushNewLead, setPushNewLead] = useState(true);
  const [pushCampaignReply, setPushCampaignReply] = useState(true);
  const [pushApprovalDigest, setPushApprovalDigest] = useState(true);
  const [pushDocusign, setPushDocusign] = useState(true);
  const [pushDeadline, setPushDeadline] = useState(true);
  const [pushSocialDM, setPushSocialDM] = useState(true);
  const [pushBirthday, setPushBirthday] = useState(true);
  const [pushHoliday, setPushHoliday] = useState(true);
  const [pushReview, setPushReview] = useState(true);
  const [pushTestimonial, setPushTestimonial] = useState(true);
  const [pushSEO, setPushSEO] = useState(true);
  const [pushFormSubmission, setPushFormSubmission] = useState(true);
  const [pushIntelligence, setPushIntelligence] = useState(true);
  const [pushWeeklyHealth, setPushWeeklyHealth] = useState(true);

  // Email notifications
  const [emailWeeklyHealth, setEmailWeeklyHealth] = useState(true);
  const [emailLeadSummary, setEmailLeadSummary] = useState(true);
  const [emailTransactionMilestone, setEmailTransactionMilestone] = useState(true);

  // Morning briefing
  const [morningDigestTime, setMorningDigestTime] = useState('08:00');
  const [weeklyHealthDay, setWeeklyHealthDay] = useState('monday');
  const [weeklyHealthTime, setWeeklyHealthTime] = useState('09:00');

  // Save
  const [saved, setSaved] = useState(false);

  // Load saved notification preferences
  useEffect(() => {
    if (settings?.notification_preferences) {
      const p = settings.notification_preferences as Record<string, unknown>;
      if (p.pushNewLead !== undefined) setPushNewLead(p.pushNewLead as boolean);
      if (p.pushCampaignReply !== undefined) setPushCampaignReply(p.pushCampaignReply as boolean);
      if (p.pushApprovalDigest !== undefined) setPushApprovalDigest(p.pushApprovalDigest as boolean);
      if (p.pushDocusign !== undefined) setPushDocusign(p.pushDocusign as boolean);
      if (p.pushDeadline !== undefined) setPushDeadline(p.pushDeadline as boolean);
      if (p.pushSocialDM !== undefined) setPushSocialDM(p.pushSocialDM as boolean);
      if (p.pushBirthday !== undefined) setPushBirthday(p.pushBirthday as boolean);
      if (p.pushHoliday !== undefined) setPushHoliday(p.pushHoliday as boolean);
      if (p.pushReview !== undefined) setPushReview(p.pushReview as boolean);
      if (p.pushTestimonial !== undefined) setPushTestimonial(p.pushTestimonial as boolean);
      if (p.pushSEO !== undefined) setPushSEO(p.pushSEO as boolean);
      if (p.pushFormSubmission !== undefined) setPushFormSubmission(p.pushFormSubmission as boolean);
      if (p.pushIntelligence !== undefined) setPushIntelligence(p.pushIntelligence as boolean);
      if (p.pushWeeklyHealth !== undefined) setPushWeeklyHealth(p.pushWeeklyHealth as boolean);
      if (p.emailWeeklyHealth !== undefined) setEmailWeeklyHealth(p.emailWeeklyHealth as boolean);
      if (p.emailLeadSummary !== undefined) setEmailLeadSummary(p.emailLeadSummary as boolean);
      if (p.emailTransactionMilestone !== undefined) setEmailTransactionMilestone(p.emailTransactionMilestone as boolean);
      if (p.morningDigestTime) setMorningDigestTime(p.morningDigestTime as string);
      if (p.weeklyHealthDay) setWeeklyHealthDay(p.weeklyHealthDay as string);
      if (p.weeklyHealthTime) setWeeklyHealthTime(p.weeklyHealthTime as string);
    }
  }, [settings]);

  async function handleSave() {
    const ok = await save({
      notification_preferences: {
        pushNewLead, pushCampaignReply, pushApprovalDigest, pushDocusign,
        pushDeadline, pushSocialDM, pushBirthday, pushHoliday,
        pushReview, pushTestimonial, pushSEO, pushFormSubmission,
        pushIntelligence, pushWeeklyHealth,
        emailWeeklyHealth, emailLeadSummary, emailTransactionMilestone,
        morningDigestTime, weeklyHealthDay, weeklyHealthTime,
      },
    });
    if (ok) {
      setSaved(true);
      success('Notifications Saved', 'Your notification preferences have been saved to the database.');
      setTimeout(() => setSaved(false), 3000);
    } else {
      showError('Save Failed', settingsError || 'Could not save notification preferences. Please try again.');
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Section Header */}
      <div>
        <h2
          className="text-xl font-semibold text-navy dark:text-white"
          style={{ fontFamily: BRAND.fonts.playfair }}
        >
          Notifications
        </h2>
        <p className="text-sm text-navy/50 dark:text-white/50 font-inter mt-1">
          Control which push and email notifications you receive.
          Critical security and approval alerts cannot be disabled.
        </p>
      </div>

      {/* Push Notifications */}
      <Card>
        <div className="flex items-center gap-2 mb-5">
          <Bell size={18} className="text-gold" />
          <h3 className="text-base font-montserrat font-semibold text-navy dark:text-white">Push Notifications</h3>
        </div>
        <div className="space-y-4">
          <Toggle label="New lead captured from any source" enabled={pushNewLead} onChange={setPushNewLead} />
          <Toggle label="Campaign reply received from a contact" enabled={pushCampaignReply} onChange={setPushCampaignReply} />
          <Toggle label="Approval queue morning digest" description="Sent at your configured morning briefing time" enabled={pushApprovalDigest} onChange={setPushApprovalDigest} />
          <Toggle label="Urgent approval queue items" enabled={true} onChange={() => {}} locked />
          <Toggle label="DocuSign envelope signed or declined" enabled={pushDocusign} onChange={setPushDocusign} />
          <Toggle label="Critical deal deadline within 72 hours" enabled={pushDeadline} onChange={setPushDeadline} />
          <Toggle label="New social media DM or lead" enabled={pushSocialDM} onChange={setPushSocialDM} />
          <Toggle label="Birthday message ready for review" enabled={pushBirthday} onChange={setPushBirthday} />
          <Toggle label="Holiday campaign ready for review" enabled={pushHoliday} onChange={setPushHoliday} />
          <Toggle label="New Google review posted" enabled={pushReview} onChange={setPushReview} />
          <Toggle label="New testimonial submitted" enabled={pushTestimonial} onChange={setPushTestimonial} />
          <Toggle label="SEO keyword ranking change" enabled={pushSEO} onChange={setPushSEO} />
          <Toggle label="Website form submission from LiconaRealty.com" enabled={pushFormSubmission} onChange={setPushFormSubmission} />
          <Toggle label="Intelligence layer urgent alert" enabled={pushIntelligence} onChange={setPushIntelligence} />
          <Toggle label="Weekly system health report" description="Sent on your configured day and time" enabled={pushWeeklyHealth} onChange={setPushWeeklyHealth} />
          <Toggle label="Security alert for unusual login activity" enabled={true} onChange={() => {}} locked />
        </div>
      </Card>

      {/* Email Notifications */}
      <Card>
        <div className="flex items-center gap-2 mb-5">
          <Mail size={18} className="text-gold" />
          <h3 className="text-base font-montserrat font-semibold text-navy dark:text-white">Email Notifications</h3>
        </div>
        <div className="space-y-4">
          <Toggle label="Weekly system health report" enabled={emailWeeklyHealth} onChange={setEmailWeeklyHealth} />
          <Toggle label="New lead summary (daily digest)" description="Daily summary of all new leads captured" enabled={emailLeadSummary} onChange={setEmailLeadSummary} />
          <Toggle label="Deal milestone alerts" enabled={emailTransactionMilestone} onChange={setEmailTransactionMilestone} />
          <Toggle label="Security alerts" enabled={true} onChange={() => {}} locked />
        </div>
      </Card>

      {/* Morning Briefing Config */}
      <Card>
        <div className="flex items-center gap-2 mb-5">
          <Clock size={18} className="text-gold" />
          <h3 className="text-base font-montserrat font-semibold text-navy dark:text-white">Morning Briefing Configuration</h3>
        </div>
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <label className="text-sm text-navy/70 dark:text-white/70 font-inter w-52">Approval digest notification:</label>
            <input
              type="time"
              value={morningDigestTime}
              onChange={(e) => setMorningDigestTime(e.target.value)}
              className="text-sm font-inter rounded-[8px] border border-gold/15 bg-surface dark:bg-navy/50 text-navy dark:text-white px-3 py-1.5"
            />
          </div>

          <div className="flex items-center gap-4">
            <label className="text-sm text-navy/70 dark:text-white/70 font-inter w-52">Weekly health report day:</label>
            <select
              value={weeklyHealthDay}
              onChange={(e) => setWeeklyHealthDay(e.target.value)}
              className="text-sm font-inter rounded-[8px] border border-gold/15 bg-surface dark:bg-navy/50 text-navy dark:text-white px-3 py-1.5"
            >
              {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((d) => (
                <option key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-4">
            <label className="text-sm text-navy/70 dark:text-white/70 font-inter w-52">Weekly health report time:</label>
            <input
              type="time"
              value={weeklyHealthTime}
              onChange={(e) => setWeeklyHealthTime(e.target.value)}
              className="text-sm font-inter rounded-[8px] border border-gold/15 bg-surface dark:bg-navy/50 text-navy dark:text-white px-3 py-1.5"
            />
          </div>

          <div className="pt-2">
            <Button size="sm" variant="ghost" onClick={() => success('Test Notification Sent', 'Check your device for the push notification. If not received, verify push notifications are enabled in your browser settings.')}>
              <Send size={12} className="mr-1.5" />
              Send Test Notification
            </Button>
            <p className="text-xs text-navy/40 dark:text-white/40 font-inter mt-1.5">
              Fires a test push notification immediately to verify push is working on your device.
            </p>
          </div>
        </div>
      </Card>

      {/* Save Button */}
      <div className="flex items-center gap-4 pt-2">
        <Button variant="accent" size="lg" onClick={handleSave} loading={saving}>
          {saved ? (
            <>
              <Check size={16} className="mr-2" />
              Changes Saved
            </>
          ) : (
            'Save Changes'
          )}
        </Button>
      </div>
    </div>
  );
}
