/**
 * Account & Security Settings Section
 *
 * Profile management, MFA controls, session management,
 * audit log, login notifications, and data/privacy controls.
 * Every sensitive action requires MFA re-prompt.
 */

'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { BRAND } from '@/lib/brand';
import {
  User,
  Shield,
  Monitor,
  ScrollText,
  Bell,
  Database,
  Upload,
  Check,
  Key,
  Smartphone,
  RefreshCw,
  LogOut,
  Download,
  Trash2,
  Search,
  AlertTriangle,
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
          ${enabled ? 'bg-gold' : 'bg-text/20'}
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
        <p className="text-sm text-text font-inter">
          {label}
          {locked && <span className="text-xs text-text/40 ml-2">(always on)</span>}
        </p>
        {description && (
          <p className="text-xs text-text/40 font-inter mt-0.5">{description}</p>
        )}
      </div>
    </div>
  );
}

export function AccountSecurity() {
  // Profile
  const [displayName, setDisplayName] = useState<string>(BRAND.agent.name);
  const [loginEmail, setLoginEmail] = useState<string>(BRAND.agent.email);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);

  // Session
  const [sessionExpiry, setSessionExpiry] = useState(8);

  // Login notifications
  const [notifyNewLogin, setNotifyNewLogin] = useState(true);
  const [notifyNewDevice, setNotifyNewDevice] = useState(true);
  const [notifyFailedLogin, setNotifyFailedLogin] = useState(true);

  // Save
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Audit log
  const [auditFilter, setAuditFilter] = useState('');

  const mockSessions = [
    { device: 'iPhone 15 Pro', browser: 'Safari', location: 'Dallas, TX', ip: '192.168.•••.•••', time: 'Active now', current: true },
    { device: 'MacBook Pro', browser: 'Chrome', location: 'Dallas, TX', ip: '192.168.•••.•••', time: '2 hours ago', current: false },
  ];

  const mockAuditLog = [
    { event: 'Login', detail: 'Successful login from iPhone', time: 'Today 9:15 AM', ip: '192.168.•••.•••' },
    { event: 'Settings Change', detail: 'Updated agent phone number', time: 'Yesterday 3:42 PM', ip: '192.168.•••.•••' },
    { event: 'MFA Verified', detail: 'TOTP verification passed', time: 'Yesterday 3:41 PM', ip: '192.168.•••.•••' },
    { event: 'Data Export', detail: 'Full CRM export downloaded', time: 'Mar 20, 2026 11:00 AM', ip: '192.168.•••.•••' },
    { event: 'Failed Login', detail: 'Invalid password attempt', time: 'Mar 19, 2026 8:22 PM', ip: '74.125.•••.•••' },
    { event: 'Document Sent', detail: 'DocuSign envelope to buyer', time: 'Mar 18, 2026 2:15 PM', ip: '192.168.•••.•••' },
  ];

  async function handleSave() {
    setSaving(true);
    await new Promise((r) => setTimeout(r, 1000));
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Section Header */}
      <div>
        <h2
          className="text-xl font-semibold text-text"
          style={{ fontFamily: BRAND.fonts.playfair }}
        >
          Account & Security
        </h2>
        <p className="text-sm text-text/50 font-inter mt-1">
          Manage your profile, MFA, sessions, and security settings.
          Sensitive changes require MFA verification.
        </p>
      </div>

      {/* Profile */}
      <Card>
        <div className="flex items-center gap-2 mb-5">
          <User size={18} className="text-gold" />
          <h3 className="text-base font-montserrat font-semibold text-text">Profile</h3>
        </div>
        <div className="space-y-4">
          {/* Photo */}
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-navy/10 flex items-center justify-center overflow-hidden border-2 border-gold/30">
              {profilePhoto ? (
                <img src={profilePhoto} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <User size={24} className="text-text/30" />
              )}
            </div>
            <div>
              <label className="cursor-pointer">
                <Button size="sm" variant="ghost" className="pointer-events-none">
                  <Upload size={12} className="mr-1.5" />
                  Upload Photo
                </Button>
                <input
                  type="file"
                  accept=".jpg,.jpeg,.png"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = (ev) => setProfilePhoto(ev.target?.result as string);
                      reader.readAsDataURL(file);
                    }
                  }}
                />
              </label>
              <p className="text-[10px] text-text/30 font-inter mt-1">JPG or PNG, used as your platform avatar</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Display Name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
            <Input
              label="Login Email"
              type="email"
              value={loginEmail}
              onChange={(e) => setLoginEmail(e.target.value)}
              helperText="Changing email requires verification to the new address"
            />
          </div>

          <div className="border-t border-gold-15 pt-4">
            <h4 className="text-sm font-montserrat font-semibold text-text mb-3">Change Password</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Current Password"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                autoComplete="current-password"
              />
              <Input
                label="New Password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
                helperText="Minimum 12 characters with mixed case, numbers, and symbols"
              />
            </div>
          </div>
        </div>
      </Card>

      {/* MFA Management */}
      <Card>
        <div className="flex items-center gap-2 mb-5">
          <Shield size={18} className="text-gold" />
          <h3 className="text-base font-montserrat font-semibold text-text">Two-Factor Authentication</h3>
        </div>
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-sm text-green-600 font-inter font-medium">TOTP Active</span>
            </div>
            <span className="text-xs text-text/30 font-inter">via Authenticator App</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Button variant="ghost" size="sm">
              <Key size={14} className="mr-1.5" />
              View Backup Codes
            </Button>
            <Button variant="ghost" size="sm">
              <RefreshCw size={14} className="mr-1.5" />
              Regenerate Codes
            </Button>
            <Button variant="ghost" size="sm">
              <Smartphone size={14} className="mr-1.5" />
              Reset MFA Device
            </Button>
          </div>

          <p className="text-xs text-text/40 font-inter">
            All MFA actions require re-verification. Backup codes are shown only once per
            generation. MFA is required for this account and cannot be disabled.
            This protects the sensitive client information stored in your platform.
          </p>
        </div>
      </Card>

      {/* Session Management */}
      <Card>
        <div className="flex items-center gap-2 mb-5">
          <Monitor size={18} className="text-gold" />
          <h3 className="text-base font-montserrat font-semibold text-text">Active Sessions</h3>
        </div>
        <div className="space-y-3">
          {mockSessions.map((session, i) => (
            <div
              key={i}
              className="flex items-center gap-4 p-3 rounded-[8px] border border-gold-15"
            >
              <Monitor size={16} className="text-text/30 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-text font-inter">
                  {session.device} / {session.browser}
                  {session.current && (
                    <span className="text-xs text-green-600 ml-2">(this session)</span>
                  )}
                </p>
                <p className="text-xs text-text/40 font-inter">
                  {session.location} / {session.ip} / {session.time}
                </p>
              </div>
              {!session.current && (
                <Button size="sm" variant="ghost">
                  <LogOut size={12} className="mr-1" />
                  End
                </Button>
              )}
            </div>
          ))}
        </div>

        <div className="mt-4 flex items-center gap-4">
          <Button size="sm" variant="danger">
            <LogOut size={12} className="mr-1.5" />
            End All Other Sessions
          </Button>
          <div className="flex items-center gap-2">
            <span className="text-xs text-text/50 font-inter">Session timeout:</span>
            <select
              value={sessionExpiry}
              onChange={(e) => setSessionExpiry(Number(e.target.value))}
              className="text-xs font-inter rounded-[8px] border border-gold-15 bg-surface px-2 py-1.5"
            >
              <option value={4}>4 hours</option>
              <option value={8}>8 hours</option>
              <option value={12}>12 hours</option>
              <option value={24}>24 hours</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Audit Log */}
      <Card>
        <div className="flex items-center gap-2 mb-5">
          <ScrollText size={18} className="text-gold" />
          <h3 className="text-base font-montserrat font-semibold text-text">Audit Log</h3>
        </div>
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text/30" />
            <input
              type="text"
              placeholder="Search events..."
              value={auditFilter}
              onChange={(e) => setAuditFilter(e.target.value)}
              className="w-full text-xs font-inter rounded-[8px] border border-gold-15 bg-surface pl-9 pr-3 py-2 focus:outline-none focus:ring-1 focus:ring-gold"
            />
          </div>
          <select className="text-xs font-inter rounded-[8px] border border-gold-15 bg-surface px-2 py-2">
            <option>All Events</option>
            <option>Logins</option>
            <option>Settings Changes</option>
            <option>Security Events</option>
            <option>Data Exports</option>
          </select>
          <Button size="sm" variant="ghost">
            <Download size={12} className="mr-1" />
            Export CSV
          </Button>
        </div>

        <div className="space-y-1">
          {mockAuditLog
            .filter((log) =>
              !auditFilter || log.event.toLowerCase().includes(auditFilter.toLowerCase()) ||
              log.detail.toLowerCase().includes(auditFilter.toLowerCase())
            )
            .map((log, i) => (
              <div
                key={i}
                className="flex items-center gap-3 py-2 px-3 rounded-[8px] hover:bg-surface/50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-montserrat font-semibold text-text">{log.event}</span>
                    <span className="text-xs text-text/50 font-inter">{log.detail}</span>
                  </div>
                </div>
                <span className="text-[10px] text-text/30 font-inter flex-shrink-0">{log.time}</span>
                <span className="text-[10px] text-text/20 font-mono flex-shrink-0">{log.ip}</span>
              </div>
            ))}
        </div>

        <p className="text-[10px] text-text/30 font-inter mt-4">
          Audit logs are retained for 2 years in compliance with security best practices.
        </p>
      </Card>

      {/* Login Notifications */}
      <Card>
        <div className="flex items-center gap-2 mb-5">
          <Bell size={18} className="text-gold" />
          <h3 className="text-base font-montserrat font-semibold text-text">Login Notifications</h3>
        </div>
        <div className="space-y-4">
          <Toggle
            label="Email notification on every new login"
            enabled={notifyNewLogin}
            onChange={setNotifyNewLogin}
          />
          <Toggle
            label="Push notification on login from new device or location"
            enabled={notifyNewDevice}
            onChange={setNotifyNewDevice}
          />
          <Toggle
            label="Alert on failed login attempts"
            enabled={notifyFailedLogin}
            onChange={setNotifyFailedLogin}
            locked
          />
        </div>
      </Card>

      {/* Data & Privacy */}
      <Card>
        <div className="flex items-center gap-2 mb-5">
          <Database size={18} className="text-gold" />
          <h3 className="text-base font-montserrat font-semibold text-text">Data & Privacy</h3>
        </div>
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="flex-1">
              <p className="text-sm text-text font-inter">Export all my data</p>
              <p className="text-xs text-text/40 font-inter mt-0.5">
                Download all contacts, transactions, campaigns, and documents as JSON.
                MFA verification required.
              </p>
            </div>
            <Button size="sm" variant="ghost">
              <Download size={12} className="mr-1.5" />
              Export Data
            </Button>
          </div>

          <div className="border-t border-gold-15 pt-4">
            <div className="flex items-start gap-3">
              <div className="flex-1">
                <p className="text-sm text-red-600 font-inter font-medium">Request Data Deletion</p>
                <p className="text-xs text-text/40 font-inter mt-0.5">
                  This permanently deletes all your data including contacts, transactions,
                  campaigns, documents, and audit logs. This action cannot be undone.
                  Requires MFA verification and typing "DELETE MY DATA" to confirm.
                </p>
              </div>
              <Button size="sm" variant="danger">
                <Trash2 size={12} className="mr-1.5" />
                Delete Data
              </Button>
            </div>
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
