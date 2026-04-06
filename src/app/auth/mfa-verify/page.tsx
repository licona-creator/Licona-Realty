/**
 * MFA Verify Page - Post-Login
 *
 * After email/password login, if MFA is enrolled, user is
 * redirected here to complete the second factor.
 * Cannot access CRM data without completing MFA verification.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createMFAChallenge, verifyMFAChallenge } from '@/lib/auth/mfa';
import { LRMonogram } from '@/components/ui/LRMonogram';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { BRAND } from '@/lib/brand';
import { motion } from 'framer-motion';
import { Shield } from 'lucide-react';

export default function MFAVerifyPage() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [factorId, setFactorId] = useState('');
  const [challengeId, setChallengeId] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [attempts, setAttempts] = useState(0);

  const initChallenge = useCallback(async () => {
    try {
      const challenge = await createMFAChallenge();
      setFactorId(challenge.factorId);
      setChallengeId(challenge.challengeId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initialize MFA');
    }
  }, []);

  useEffect(() => {
    initChallenge();
  }, [initChallenge]);

  async function handleVerify() {
    if (code.length !== 6) {
      setError('Please enter a 6-digit code.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await verifyMFAChallenge(factorId, challengeId, code);
      // Set MFA grace period cookie (4 hours) - client-readable timestamp
      document.cookie = `mfa_verified_at=${Date.now()};path=/;max-age=${4 * 60 * 60};SameSite=Strict${window.location.protocol === 'https:' ? ';Secure' : ''}`;
      router.push('/today');
      router.refresh();
    } catch {
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);

      if (newAttempts >= 5) {
        setError('Account temporarily locked. Please try again in 15 minutes.');
      } else {
        setError(`Invalid code. ${5 - newAttempts} attempts remaining.`);
        setCode('');
        await initChallenge();
      }
    } finally {
      setLoading(false);
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
        className="w-full max-w-sm"
      >
        <div className="flex justify-center mb-6">
          <LRMonogram size="xl" />
        </div>

        <div className="flex items-center justify-center gap-2 mb-2">
          <Shield size={20} className="text-gold" />
          <h1
            className="text-2xl font-semibold text-white"
            style={{ fontFamily: BRAND.fonts.playfair }}
          >
            Two-Factor Verification
          </h1>
        </div>

        <p className="text-center text-sm text-white/50 font-inter mb-8">
          Enter the 6-digit code from your authenticator app.
        </p>

        <div className="space-y-4">
          <Input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            placeholder="000000"
            autoComplete="one-time-code"
            autoFocus
            className="!bg-white/10 !border-white/20 !text-white !placeholder:text-white/30 !text-center !text-2xl !tracking-[0.5em] !font-mono"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && code.length === 6) {
                handleVerify();
              }
            }}
          />

          {error && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-red-400 text-sm text-center font-inter"
            >
              {error}
            </motion.p>
          )}

          <Button
            variant="accent"
            size="lg"
            className="w-full"
            onClick={handleVerify}
            loading={loading}
            disabled={code.length !== 6 || attempts >= 5}
          >
            Verify
          </Button>
        </div>

        <div className="mt-6 text-center">
          <button
            className="text-sm text-white/40 hover:text-gold transition-colors font-inter"
            onClick={() => {
              // In production: allow using backup code
              setError('Backup code support coming soon.');
            }}
          >
            Use a backup code
          </button>
        </div>
      </motion.div>
    </div>
  );
}
