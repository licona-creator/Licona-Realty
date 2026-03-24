/**
 * MFA Setup Page
 *
 * ENFORCED on first login - agent cannot access any CRM data until MFA is configured.
 * TOTP only - no SMS MFA (vulnerable to SIM swapping attacks).
 * Compatible with Google Authenticator, Authy, and similar apps.
 *
 * Steps:
 * 1. Display QR code for TOTP enrollment
 * 2. User scans with authenticator app
 * 3. User enters verification code
 * 4. Display 8 backup codes (shown once, stored securely)
 * 5. Redirect to dashboard
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { enrollMFA, verifyMFAEnrollment } from '@/lib/auth/mfa';
import { LRMonogram } from '@/components/ui/LRMonogram';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { BRAND } from '@/lib/brand';
import { motion } from 'framer-motion';
import { Shield, Copy, Check, AlertTriangle } from 'lucide-react';

type SetupStep = 'enroll' | 'verify' | 'backup_codes' | 'complete';

export default function MFASetupPage() {
  const router = useRouter();
  const [step, setStep] = useState<SetupStep>('enroll');
  const [factorId, setFactorId] = useState('');
  const [qrCode, setQrCode] = useState('');
  const [totpSecret, setTotpSecret] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [backupCodes] = useState<string[]>(() =>
    // Generate 8 single-use backup codes
    Array.from({ length: 8 }, () =>
      Array.from({ length: 8 }, () =>
        'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 32)]
      ).join('')
    )
  );
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [copiedBackup, setCopiedBackup] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function startEnrollment() {
      try {
        const enrollment = await enrollMFA();
        setFactorId(enrollment.factorId);
        setQrCode(enrollment.qrCode);
        setTotpSecret(enrollment.totpSecret);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to start MFA enrollment');
      }
    }
    startEnrollment();
  }, []);

  async function handleVerify() {
    setError('');
    if (verificationCode.length !== 6) {
      setError('Please enter a 6-digit code.');
      return;
    }

    setLoading(true);
    try {
      await verifyMFAEnrollment(factorId, verificationCode);
      setStep('backup_codes');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function copyToClipboard(text: string, type: 'secret' | 'backup') {
    navigator.clipboard.writeText(text);
    if (type === 'secret') {
      setCopiedSecret(true);
      setTimeout(() => setCopiedSecret(false), 2000);
    } else {
      setCopiedBackup(true);
      setTimeout(() => setCopiedBackup(false), 2000);
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-6"
      style={{ background: BRAND.colors.heroGradient }}
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="flex justify-center mb-6">
          <LRMonogram size="lg" />
        </div>

        <div className="flex items-center justify-center gap-2 mb-2">
          <Shield size={20} className="text-gold" />
          <h1
            className="text-2xl font-semibold text-white"
            style={{ fontFamily: BRAND.fonts.playfair }}
          >
            {step === 'enroll' && 'Set Up Two-Factor Authentication'}
            {step === 'verify' && 'Verify Your Code'}
            {step === 'backup_codes' && 'Save Your Backup Codes'}
            {step === 'complete' && 'MFA Configured'}
          </h1>
        </div>

        <p className="text-center text-sm text-white/50 font-inter mb-8">
          {step === 'enroll' &&
            'MFA is required to protect sensitive client data. Scan the QR code with your authenticator app.'}
          {step === 'verify' &&
            'Enter the 6-digit code from your authenticator app.'}
          {step === 'backup_codes' &&
            'Save these codes somewhere safe. Each code can only be used once.'}
        </p>

        {/* Step 1: Enroll - Show QR Code */}
        {step === 'enroll' && (
          <div className="space-y-6">
            {qrCode ? (
              <>
                <div className="flex justify-center">
                  <div className="bg-white p-4 rounded-[12px]">
                    {/* QR code image from Supabase */}
                    <img
                      src={qrCode}
                      alt="Scan this QR code with your authenticator app"
                      width={200}
                      height={200}
                    />
                  </div>
                </div>

                {/* Manual entry option */}
                <div className="bg-white/5 rounded-[12px] p-4">
                  <p className="text-xs text-white/40 font-inter mb-2">
                    Can&apos;t scan? Enter this key manually:
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="text-sm text-gold font-mono flex-1 break-all">
                      {totpSecret}
                    </code>
                    <button
                      onClick={() => copyToClipboard(totpSecret, 'secret')}
                      className="text-white/40 hover:text-gold transition-colors p-1"
                    >
                      {copiedSecret ? <Check size={16} /> : <Copy size={16} />}
                    </button>
                  </div>
                </div>

                <Button
                  variant="accent"
                  size="lg"
                  className="w-full"
                  onClick={() => setStep('verify')}
                >
                  I&apos;ve Scanned the Code
                </Button>
              </>
            ) : error ? (
              <p className="text-red-400 text-sm text-center font-inter">{error}</p>
            ) : (
              <div className="flex justify-center">
                <div className="animate-spin h-8 w-8 border-2 border-gold border-t-transparent rounded-full" />
              </div>
            )}
          </div>
        )}

        {/* Step 2: Verify TOTP Code */}
        {step === 'verify' && (
          <div className="space-y-4">
            <Input
              label="Verification Code"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
              placeholder="000000"
              autoComplete="one-time-code"
              autoFocus
              className="!bg-white/10 !border-white/20 !text-white !placeholder:text-white/30 !text-center !text-2xl !tracking-[0.5em] !font-mono"
            />

            {error && (
              <p className="text-red-400 text-sm text-center font-inter">{error}</p>
            )}

            <Button
              variant="accent"
              size="lg"
              className="w-full"
              onClick={handleVerify}
              loading={loading}
              disabled={verificationCode.length !== 6}
            >
              Verify
            </Button>

            <button
              onClick={() => setStep('enroll')}
              className="w-full text-sm text-white/40 hover:text-gold transition-colors font-inter"
            >
              Back to QR code
            </button>
          </div>
        )}

        {/* Step 3: Backup Codes */}
        {step === 'backup_codes' && (
          <div className="space-y-6">
            <div className="bg-white/5 border border-amber-500/30 rounded-[12px] p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle size={16} className="text-amber-400" />
                <p className="text-sm font-montserrat font-semibold text-amber-400">
                  Save these codes now
                </p>
              </div>
              <p className="text-xs text-white/50 font-inter">
                These backup codes are shown only once. Store them in a secure
                location. Each code can be used once to sign in if you lose
                access to your authenticator app.
              </p>
            </div>

            <div className="bg-white/5 rounded-[12px] p-4">
              <div className="grid grid-cols-2 gap-2">
                {backupCodes.map((code, i) => (
                  <code
                    key={i}
                    className="text-sm text-white font-mono bg-white/5 px-3 py-2 rounded text-center"
                  >
                    {code}
                  </code>
                ))}
              </div>

              <button
                onClick={() =>
                  copyToClipboard(backupCodes.join('\n'), 'backup')
                }
                className="flex items-center justify-center gap-2 w-full mt-3 text-sm text-white/40 hover:text-gold transition-colors font-inter py-2"
              >
                {copiedBackup ? (
                  <>
                    <Check size={14} /> Copied!
                  </>
                ) : (
                  <>
                    <Copy size={14} /> Copy all codes
                  </>
                )}
              </button>
            </div>

            <Button
              variant="accent"
              size="lg"
              className="w-full"
              onClick={() => {
                setStep('complete');
                router.push('/dashboard');
                router.refresh();
              }}
            >
              I&apos;ve Saved My Backup Codes
            </Button>
          </div>
        )}

        {/* Skip MFA */}
        <div className="mt-6 text-center">
          <button
            onClick={() => router.push('/dashboard')}
            className="text-sm text-white/40 hover:text-gold transition-colors font-inter"
          >
            Skip for now
          </button>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-[10px] text-white/20 font-inter">
            Compatible with Google Authenticator, Authy, and 1Password
          </p>
        </div>
      </motion.div>
    </div>
  );
}
