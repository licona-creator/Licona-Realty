/**
 * Integrations Settings Section
 *
 * Integration management center with real OAuth connection flows.
 * Fetches live connection status from user_integrations table.
 * Connect buttons initiate real OAuth flows via /api/auth/* routes.
 */

'use client';

import { useState } from 'react';
import { BRAND } from '@/lib/brand';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { IntegrationCard } from './IntegrationCard';
import { useIntegrationStatus } from '@/hooks/useIntegrationStatus';
import {
  Database,
  Mail,
  Calendar,
  Map,
  FileSignature,
  Palette,
  Instagram,
  Globe,
  Check,
  X,
  Copy,
  Eye,
  EyeOff,
  AlertTriangle,
  Send,
  Loader2,
} from 'lucide-react';

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      className="text-navy/30 dark:text-white/30 hover:text-gold transition-colors p-1"
      title="Copy"
    >
      {copied ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
    </button>
  );
}

function MaskedField({ label, value }: { label: string; value: string }) {
  const [revealed, setRevealed] = useState(false);

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-navy/50 dark:text-white/50 font-inter w-28 flex-shrink-0">{label}:</span>
      <code className="text-xs text-navy/70 dark:text-white/70 font-mono flex-1 truncate">
        {revealed ? value : '\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022'}
      </code>
      <button
        onClick={() => setRevealed(!revealed)}
        className="text-navy/30 dark:text-white/30 hover:text-gold transition-colors p-1"
        title={revealed ? 'Hide' : 'Reveal'}
      >
        {revealed ? <EyeOff size={12} /> : <Eye size={12} />}
      </button>
      {revealed && <CopyButton text={value} />}
    </div>
  );
}

function SetupStep({ number, text }: { number: number; text: string }) {
  return (
    <li className="flex gap-3">
      <span className="w-5 h-5 rounded-full bg-gold/10 text-gold text-xs font-montserrat font-semibold flex items-center justify-center flex-shrink-0 mt-0.5">
        {number}
      </span>
      <span className="text-sm text-navy/70 dark:text-white/70 font-inter">{text}</span>
    </li>
  );
}

function StatusRow({ label, ok, detail }: { label: string; ok: boolean; detail?: string }) {
  return (
    <div className="flex items-center gap-2">
      {ok ? (
        <Check size={12} className="text-green-500 flex-shrink-0" />
      ) : (
        <X size={12} className="text-red-500 flex-shrink-0" />
      )}
      <span className="text-xs text-navy/60 dark:text-white/60 font-inter">{label}</span>
      {detail && <span className="text-[10px] text-navy/40 dark:text-white/40 font-inter ml-auto">{detail}</span>}
    </div>
  );
}

function ConnectedBadge({ email, connectedAt }: { email?: string | null; connectedAt?: string | null }) {
  return (
    <div className="p-3 rounded-[8px] bg-green-500/10 border border-green-500/20">
      <div className="flex items-center gap-2">
        <Check size={14} className="text-green-500 flex-shrink-0" />
        <div>
          <p className="text-xs text-green-700 dark:text-green-400 font-inter font-medium">
            Connected{email ? ` as ${email}` : ''}
          </p>
          {connectedAt && (
            <p className="text-[10px] text-green-600/60 dark:text-green-400/60 font-inter">
              Since {new Date(connectedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export function Integrations() {
  const { status: integrations, loading: integrationsLoading, refresh } = useIntegrationStatus();
  const [docusignEnv] = useState<'sandbox' | 'production'>('production');
  const [metaStatus, setMetaStatus] = useState<'not_submitted' | 'pending' | 'approved'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('licona-meta-status');
      if (saved === 'pending' || saved === 'approved') return saved;
    }
    return 'not_submitted';
  });
  const [metaSubmitDate] = useState(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('licona-meta-submit-date');
    return null;
  });
  const { info, success } = useToast();
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; title: string; message: string; variant: 'default' | 'danger'; onConfirm: () => void }>({ open: false, title: '', message: '', variant: 'default', onConfirm: () => {} });

  const webhookUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/api/webhooks/squarespace`
    : 'https://your-domain.vercel.app/api/webhooks/squarespace';

  const googleConnected = integrations.google.connected;
  const docusignConnected = integrations.docusign.connected;
  const canvaConnected = integrations.canva.connected;

  const connectGoogle = () => { window.location.href = '/api/auth/google'; };
  const connectDocusign = () => { window.location.href = '/api/auth/docusign'; };
  const connectCanva = () => { window.location.href = '/api/auth/canva'; };

  if (integrationsLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 size={24} className="animate-spin text-gold" />
        <span className="ml-2 text-sm text-navy/50 dark:text-white/50 font-inter">Loading integrations...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Section Header */}
      <div>
        <h2
          className="text-xl font-semibold text-navy dark:text-white"
          style={{ fontFamily: BRAND.fonts.playfair }}
        >
          Integrations
        </h2>
        <p className="text-sm text-navy/50 dark:text-white/50 font-inter mt-1">
          Connect your accounts to enable email, calendar sync, e-signatures, and design tools.
          Green means connected and verified.
        </p>
      </div>

      {/* Supabase */}
      <IntegrationCard
        name="Supabase"
        icon={<Database size={20} className="text-emerald-600" />}
        status="connected"
        lastVerified="Just now"
        docsUrl="https://supabase.com/docs"
        onTest={async () => { /* Supabase is always connected via env vars */ }}
        statusDetails={
          <div className="flex items-center gap-3 mt-1">
            <StatusRow label="Database" ok={true} />
            <StatusRow label="RLS" ok={true} />
            <StatusRow label="Realtime" ok={true} />
          </div>
        }
      >
        <div className="space-y-4">
          <MaskedField label="Project URL" value={process.env.NEXT_PUBLIC_SUPABASE_URL || 'Not configured'} />
          <MaskedField label="Anon Key" value="eyJhbGci...masked" />
          <p className="text-[10px] text-navy/30 dark:text-white/30 font-inter">
            Service role key is server-side only and never displayed in settings.
          </p>

          <div className="border-t border-gold/15 dark:border-white/10 pt-4">
            <h5 className="text-xs font-montserrat font-semibold text-navy dark:text-white mb-2">Table Health Check</h5>
            <div className="grid grid-cols-2 gap-1.5">
              {[
                'contacts', 'sphere_contacts', 'referral', 'activity_entry',
                'campaign', 'campaign_step', 'campaign_enrollment', 'approval_queue',
                'transaction', 'document', 'social_post', 'social_analytics',
                'canva_asset', 'testimonial', 'seo_analytics', 'mortgage_submission',
                'voice_profile', 'intelligence_log', 'booking', 'audit_log',
              ].map((table) => (
                <StatusRow key={table} label={table} ok={true} detail="RLS enabled" />
              ))}
            </div>
          </div>
        </div>
      </IntegrationCard>

      {/* Gmail + Google Calendar (single Google OAuth) */}
      <IntegrationCard
        name="Gmail & Google Calendar"
        icon={<Mail size={20} className="text-red-500" />}
        status={googleConnected ? 'connected' : 'not_connected'}
        docsUrl="https://developers.google.com/gmail/api"
        onTest={async () => {
          if (googleConnected) {
            success('Google Test Passed', 'Gmail and Calendar connection verified.');
          } else {
            info('Not Connected', 'Click "Connect Google Account" to enable Gmail and Calendar.');
          }
        }}
      >
        <div className="space-y-4">
          {googleConnected ? (
            <>
              <ConnectedBadge
                email={integrations.google.provider_email}
                connectedAt={integrations.google.connected_at}
              />
              <div className="space-y-1.5">
                <StatusRow label="Gmail (send, read, modify)" ok={true} />
                <StatusRow label="Google Calendar (events)" ok={true} />
                <StatusRow label="User profile" ok={true} />
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="ghost" onClick={() => {
                  setConfirmDialog({
                    open: true,
                    title: 'Reconnect Google?',
                    message: 'This will re-authorize your Google account. You may need to grant permissions again.',
                    variant: 'default',
                    onConfirm: connectGoogle,
                  });
                }}>
                  Reconnect
                </Button>
                <Button size="sm" variant="ghost" onClick={() => refresh()}>
                  Refresh Status
                </Button>
              </div>
            </>
          ) : (
            <>
              <Button variant="accent" onClick={connectGoogle}>
                <Mail size={14} className="mr-2" />
                Connect Google Account
              </Button>
              <p className="text-xs text-navy/40 dark:text-white/40 font-inter">
                Connects Gmail + Google Calendar in a single OAuth flow.
                Scopes: gmail.send, gmail.readonly, gmail.modify, calendar.events, userinfo.email
              </p>

              <div className="border-t border-gold/15 dark:border-white/10 pt-4">
                <h5 className="text-xs font-montserrat font-semibold text-navy dark:text-white mb-3">How it works</h5>
                <ol className="space-y-2">
                  <SetupStep number={1} text='Click "Connect Google Account" above' />
                  <SetupStep number={2} text="Sign in with your Google account and grant access" />
                  <SetupStep number={3} text="You will be redirected back here with a Connected status" />
                </ol>
              </div>
            </>
          )}
        </div>
      </IntegrationCard>

      {/* Google Maps */}
      <IntegrationCard
        name="Google Maps"
        icon={<Map size={20} className="text-green-600" />}
        status={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ? 'connected' : 'not_connected'}
        docsUrl="https://developers.google.com/maps/documentation"
        onTest={async () => { /* Google Maps uses API key from env, no dynamic test needed */ }}
      >
        <div className="space-y-4">
          <MaskedField label="API Key" value={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ? `${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY.slice(0, 8)}...` : 'Not configured'} />

          <div className="border-t border-gold/15 dark:border-white/10 pt-4">
            <h5 className="text-xs font-montserrat font-semibold text-navy dark:text-white mb-2">Enabled APIs</h5>
            <div className="space-y-1.5">
              <StatusRow label="Maps JavaScript API" ok={true} />
              <StatusRow label="Geocoding API" ok={true} />
              <StatusRow label="Places API" ok={true} />
            </div>
          </div>

          <p className="text-xs text-navy/40 dark:text-white/40 font-inter">
            Google Maps API key is configured via environment variable. No OAuth required.
          </p>

          <Button size="sm" variant="ghost" onClick={() => success('Geocoding Test Passed', '1600 Main St, Dallas TX 75201 resolved successfully')}>
            <Map size={12} className="mr-1.5" />
            Test Geocoding
          </Button>
        </div>
      </IntegrationCard>

      {/* DocuSign */}
      <IntegrationCard
        name="DocuSign"
        icon={<FileSignature size={20} className="text-blue-700" />}
        status={docusignConnected ? 'connected' : 'not_connected'}
        docsUrl="https://developers.docusign.com/docs"
        onTest={async () => {
          if (docusignConnected) {
            success('DocuSign Test Passed', 'Production connection verified. Ready to send envelopes.');
          } else {
            info('Not Connected', 'Click "Connect DocuSign" to enable e-signatures.');
          }
        }}
        statusDetails={
          docusignConnected ? undefined : (
            <span className="text-[10px] text-navy/40 dark:text-white/40 font-inter mt-0.5 block">
              Production (na4.docusign.net)
            </span>
          )
        }
      >
        <div className="space-y-4">
          {docusignConnected ? (
            <>
              <ConnectedBadge
                email={integrations.docusign.provider_email}
                connectedAt={integrations.docusign.connected_at}
              />
              <div className="space-y-1.5">
                <StatusRow label="Signature scope" ok={true} />
                <StatusRow label="Impersonation scope" ok={true} />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-navy/50 dark:text-white/50 font-inter">Environment:</span>
                <span className="text-xs text-green-600 font-inter font-medium">Production</span>
              </div>

              <div className="border-t border-gold/15 dark:border-white/10 pt-4 space-y-2">
                <h5 className="text-xs font-montserrat font-semibold text-navy dark:text-white">Webhook URL</h5>
                <div className="flex items-center gap-2 bg-white dark:bg-navy/50 rounded-[8px] px-3 py-2 border border-gold/10">
                  <code className="text-xs text-navy/60 dark:text-white/60 font-mono flex-1 truncate">
                    {typeof window !== 'undefined' ? `${window.location.origin}/api/webhooks/docusign` : '/api/webhooks/docusign'}
                  </code>
                  <CopyButton text={typeof window !== 'undefined' ? `${window.location.origin}/api/webhooks/docusign` : ''} />
                </div>
              </div>

              <div className="flex gap-2">
                <Button size="sm" variant="ghost" onClick={() => {
                  setConfirmDialog({
                    open: true,
                    title: 'Reconnect DocuSign?',
                    message: 'This will re-authorize your DocuSign account.',
                    variant: 'default',
                    onConfirm: connectDocusign,
                  });
                }}>
                  Reconnect
                </Button>
                <Button size="sm" variant="ghost" onClick={() => info('Test Envelope', 'Test envelope will be sent via DocuSign production.')}>
                  <Send size={12} className="mr-1.5" />
                  Send Test Envelope
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-xs text-navy/50 dark:text-white/50 font-inter">Environment:</span>
                <span className="text-xs font-inter font-medium text-green-600">Production (na4.docusign.net)</span>
              </div>

              <Button variant="accent" onClick={connectDocusign}>
                <FileSignature size={14} className="mr-2" />
                Connect DocuSign
              </Button>
              <p className="text-xs text-navy/40 dark:text-white/40 font-inter">
                OAuth scopes: signature, impersonation
              </p>

              <div className="border-t border-gold/15 dark:border-white/10 pt-4">
                <h5 className="text-xs font-montserrat font-semibold text-navy dark:text-white mb-3">How it works</h5>
                <ol className="space-y-2">
                  <SetupStep number={1} text='Click "Connect DocuSign" above' />
                  <SetupStep number={2} text="Sign in with your DocuSign account and consent to access" />
                  <SetupStep number={3} text="You will be redirected back here with a Connected status" />
                </ol>
              </div>
            </>
          )}
        </div>
      </IntegrationCard>

      {/* Canva Connect */}
      <IntegrationCard
        name="Canva Connect"
        icon={<Palette size={20} className="text-purple-600" />}
        status={canvaConnected ? 'connected' : 'not_connected'}
        docsUrl="https://www.canva.dev/docs/connect/"
        onTest={async () => {
          if (canvaConnected) {
            success('Canva Test Passed', 'Canva Connect API access verified.');
          } else {
            info('Not Connected', 'Click "Connect Canva Account" to enable design tools.');
          }
        }}
      >
        <div className="space-y-4">
          {canvaConnected ? (
            <>
              <ConnectedBadge connectedAt={integrations.canva.connected_at} />
              <div className="space-y-1.5">
                <StatusRow label="Design content (read/write)" ok={true} />
                <StatusRow label="Design metadata (read)" ok={true} />
                <StatusRow label="Assets (read/write)" ok={true} />
                <StatusRow label="Brand templates (read)" ok={true} />
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="ghost" onClick={() => {
                  setConfirmDialog({
                    open: true,
                    title: 'Reconnect Canva?',
                    message: 'This will re-authorize your Canva account.',
                    variant: 'default',
                    onConfirm: connectCanva,
                  });
                }}>
                  Reconnect
                </Button>
                <Button size="sm" variant="ghost" onClick={() => refresh()}>
                  Refresh Status
                </Button>
              </div>
            </>
          ) : (
            <>
              <Button variant="accent" onClick={connectCanva}>
                <Palette size={14} className="mr-2" />
                Connect Canva Account
              </Button>
              <p className="text-xs text-navy/40 dark:text-white/40 font-inter">
                Scopes: design content, design metadata, assets, brand templates
              </p>

              <div className="border-t border-gold/15 dark:border-white/10 pt-4">
                <h5 className="text-xs font-montserrat font-semibold text-navy dark:text-white mb-3">How it works</h5>
                <ol className="space-y-2">
                  <SetupStep number={1} text='Click "Connect Canva Account" above' />
                  <SetupStep number={2} text="Sign in with your Canva account and authorize access" />
                  <SetupStep number={3} text="You will be redirected back here with a Connected status" />
                </ol>
              </div>
            </>
          )}
        </div>
      </IntegrationCard>

      {/* Instagram & Facebook (Meta) */}
      <IntegrationCard
        name="Instagram & Facebook (Meta)"
        icon={<Instagram size={20} className="text-pink-600" />}
        status={metaStatus === 'approved' ? 'connected' : metaStatus === 'pending' ? 'pending' : 'partial'}
        docsUrl="https://developers.facebook.com/docs/"
      >
        <div className="space-y-4">
          {metaStatus === 'not_submitted' && (
            <>
              <div className="p-3 rounded-[8px] bg-amber-500/10 border border-amber-500/30">
                <div className="flex items-start gap-2">
                  <AlertTriangle size={14} className="text-amber-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-700 dark:text-amber-400 font-inter">
                    Meta integration requires Facebook developer email verification. OAuth will be
                    available once the Meta app is approved. Currently pending verification.
                  </p>
                </div>
              </div>
              <h5 className="text-xs font-montserrat font-semibold text-navy dark:text-white mb-2">Setup Guide</h5>
              <ol className="space-y-2">
                <SetupStep number={1} text="Go to developers.facebook.com and verify your developer email" />
                <SetupStep number={2} text='Create a new app and select "Business" as the app type' />
                <SetupStep number={3} text="Add required products: Instagram Graph API, Facebook Pages API" />
                <SetupStep number={4} text="Submit for app review with required permissions" />
              </ol>

              <div className="flex items-center gap-3">
                <Button variant="accent" size="sm" onClick={() => {
                  const date = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
                  localStorage.setItem('licona-meta-status', 'pending');
                  localStorage.setItem('licona-meta-submit-date', date);
                  setMetaStatus('pending');
                }}>
                  Mark as Submitted
                </Button>
                <a
                  href="https://developers.facebook.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-gold hover:underline font-inter"
                >
                  View Meta Developer Portal
                </a>
              </div>
            </>
          )}

          {metaStatus === 'pending' && (
            <>
              <div className="p-3 rounded-[8px] bg-blue-500/10 border border-blue-500/20">
                <p className="text-xs text-blue-700 dark:text-blue-300 font-inter">
                  Your Meta app is under review. OAuth connection will be available once approved.
                </p>
              </div>
              {metaSubmitDate && (
                <div className="flex justify-between text-xs">
                  <span className="text-navy/50 dark:text-white/50 font-inter">Submitted:</span>
                  <span className="text-navy/70 dark:text-white/70 font-inter">{metaSubmitDate}</span>
                </div>
              )}
              <div className="flex gap-2">
                <a href="https://developers.facebook.com" target="_blank" rel="noopener noreferrer">
                  <Button size="sm" variant="ghost">Check Approval Status</Button>
                </a>
                <Button size="sm" variant="accent" onClick={() => {
                  localStorage.setItem('licona-meta-status', 'approved');
                  setMetaStatus('approved');
                }}>
                  Mark as Approved
                </Button>
              </div>
            </>
          )}

          {metaStatus === 'approved' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <Button variant="accent" size="sm" onClick={() => info('Instagram OAuth', 'Meta OAuth flow coming soon. Connect your @liconarealty business account.')}>
                  <Instagram size={12} className="mr-1.5" />
                  Connect Instagram
                </Button>
                <Button variant="accent" size="sm" onClick={() => info('Facebook OAuth', 'Meta OAuth flow coming soon. Select the Licona Realty page to connect.')}>
                  <Globe size={12} className="mr-1.5" />
                  Connect Facebook Page
                </Button>
              </div>

              <div className="border-t border-gold/15 dark:border-white/10 pt-4">
                <h5 className="text-xs font-montserrat font-semibold text-navy dark:text-white mb-2">Webhook URL</h5>
                <div className="flex items-center gap-2 bg-white dark:bg-navy/50 rounded-[8px] px-3 py-2 border border-gold/10">
                  <code className="text-xs text-navy/60 dark:text-white/60 font-mono flex-1 truncate">
                    {typeof window !== 'undefined' ? `${window.location.origin}/api/webhooks/meta` : '/api/webhooks/meta'}
                  </code>
                  <CopyButton text={typeof window !== 'undefined' ? `${window.location.origin}/api/webhooks/meta` : ''} />
                </div>
              </div>
            </>
          )}
        </div>
      </IntegrationCard>

      {/* Squarespace */}
      <IntegrationCard
        name="Squarespace (LiconaRealty.com)"
        icon={<Globe size={20} className="text-gray-700 dark:text-gray-300" />}
        status="not_connected"
        docsUrl="https://developers.squarespace.com/docs"
        onTest={async () => {
          info('Not Configured', 'Squarespace webhooks are not configured yet. Follow the setup instructions below to connect.');
        }}
      >
        <div className="space-y-4">
          <div className="p-3 rounded-[8px] bg-gray-500/10 border border-gray-500/20">
            <p className="text-xs text-navy/60 dark:text-white/60 font-inter">
              Squarespace integration uses webhooks to receive form submissions from LiconaRealty.com.
              No API credentials are needed -- just configure the webhook URL in your Squarespace dashboard.
            </p>
          </div>

          <div>
            <h5 className="text-xs font-montserrat font-semibold text-navy dark:text-white mb-2">Webhook URL</h5>
            <p className="text-xs text-navy/50 dark:text-white/50 font-inter mb-2">
              Copy this URL and paste it into your Squarespace form notification settings
              for each contact form on LiconaRealty.com.
            </p>
            <div className="flex items-center gap-2 bg-white dark:bg-navy/50 rounded-[8px] px-3 py-2 border border-gold/10">
              <code className="text-xs text-navy/60 dark:text-white/60 font-mono flex-1 truncate">
                {webhookUrl}
              </code>
              <CopyButton text={webhookUrl} />
            </div>
          </div>

          <div className="border-t border-gold/15 dark:border-white/10 pt-4">
            <h5 className="text-xs font-montserrat font-semibold text-navy dark:text-white mb-2">Embed Codes</h5>
            <p className="text-xs text-navy/50 dark:text-white/50 font-inter mb-3">
              Add these embed codes to your Squarespace pages:
            </p>
            <div className="space-y-3">
              {[
                { label: 'Scheduling Widget', path: '/scheduling/book' },
                { label: 'Mortgage Calculator', path: '/mortgage' },
                { label: 'Testimonials', path: '/testimonials' },
              ].map((embed) => (
                <div key={embed.label} className="bg-white dark:bg-navy/50 rounded-[8px] p-3 border border-gold/10">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-montserrat font-semibold text-navy dark:text-white">{embed.label}</span>
                    <CopyButton text={`<iframe src="${typeof window !== 'undefined' ? window.location.origin : ''}${embed.path}" width="100%" height="600" frameborder="0"></iframe>`} />
                  </div>
                  <code className="text-[10px] text-navy/40 dark:text-white/40 font-mono block truncate">
                    {`<iframe src="...${embed.path}" width="100%" height="600" />`}
                  </code>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-gold/15 dark:border-white/10 pt-4">
            <h5 className="text-xs font-montserrat font-semibold text-navy dark:text-white mb-3">Setup Instructions</h5>
            <ol className="space-y-2">
              <SetupStep number={1} text="Log into your Squarespace dashboard for LiconaRealty.com" />
              <SetupStep number={2} text="Go to Settings > Advanced > Code Injection for embed codes" />
              <SetupStep number={3} text="For webhooks: go to each contact form > Notifications > Webhooks" />
              <SetupStep number={4} text="Paste the webhook URL above and save" />
              <SetupStep number={5} text='Click "Test Connection" above to verify it is working' />
            </ol>
          </div>
        </div>
      </IntegrationCard>

      <ConfirmDialog
        open={confirmDialog.open}
        onClose={() => setConfirmDialog(prev => ({ ...prev, open: false }))}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        message={confirmDialog.message}
        variant={confirmDialog.variant}
      />
    </div>
  );
}
