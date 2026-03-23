/**
 * MFA Verification Modal
 *
 * Reusable modal for MFA re-prompt on high-risk actions:
 * - DocuSign sends
 * - Bulk contact exports
 * - Record deletion
 * - Security settings changes
 * - Approval history access
 *
 * Appears as an overlay, requires 6-digit TOTP code.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { createMFAChallenge, verifyMFAChallenge } from '@/lib/auth/mfa';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { BRAND } from '@/lib/brand';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, X } from 'lucide-react';

interface MFAVerifyModalProps {
  isOpen: boolean;
  onVerified: () => void;
  onClose: () => void;
  actionDescription?: string;
}

export function MFAVerifyModal({
  isOpen,
  onVerified,
  onClose,
  actionDescription = 'this action',
}: MFAVerifyModalProps) {
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
      setError(err instanceof Error ? err.message : 'Failed to create MFA challenge');
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      setCode('');
      setError('');
      setAttempts(0);
      initChallenge();
    }
  }, [isOpen, initChallenge]);

  async function handleVerify() {
    if (code.length !== 6) {
      setError('Please enter a 6-digit code.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await verifyMFAChallenge(factorId, challengeId, code);
      onVerified();
    } catch {
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);

      if (newAttempts >= 3) {
        setError('Too many failed attempts. Please try again later.');
        // After 3 failures, close modal and log the event
        setTimeout(onClose, 2000);
      } else {
        setError(`Invalid code. ${3 - newAttempts} attempts remaining.`);
        setCode('');
        // Create a new challenge for the next attempt
        await initChallenge();
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50"
            style={{ backgroundColor: BRAND.colors.navy80 }}
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 z-50 flex items-center justify-center px-4"
          >
            <div className="bg-white dark:bg-dark-card rounded-[16px] shadow-xl w-full max-w-sm p-6 relative">
              {/* Close button */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 text-navy/30 dark:text-white/30 hover:text-navy/60 dark:hover:text-white/60 transition-colors"
              >
                <X size={18} />
              </button>

              {/* Header */}
              <div className="flex items-center gap-2 mb-4">
                <Shield size={20} className="text-gold" />
                <h2 className="text-lg font-montserrat font-semibold text-navy dark:text-white">
                  Verify Identity
                </h2>
              </div>

              <p className="text-sm text-navy/50 dark:text-white/50 font-inter mb-6">
                Enter the 6-digit code from your authenticator app to confirm{' '}
                {actionDescription}.
              </p>

              {/* Code Input */}
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
                  className="!text-center !text-2xl !tracking-[0.5em] !font-mono"
                  error={error || undefined}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && code.length === 6) {
                      handleVerify();
                    }
                  }}
                />

                <Button
                  variant="accent"
                  size="lg"
                  className="w-full"
                  onClick={handleVerify}
                  loading={loading}
                  disabled={code.length !== 6 || attempts >= 3}
                >
                  Verify
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
