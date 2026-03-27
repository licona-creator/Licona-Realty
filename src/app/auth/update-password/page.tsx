/**
 * Update Password Page
 *
 * Allows users to set a new password after clicking a recovery link.
 * Features real-time password strength indicator, requirements checklist,
 * and confirmation matching. Handles both PKCE and implicit auth flows.
 */

'use client';

import { useState, useEffect, useRef, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { LRMonogram } from '@/components/ui/LRMonogram';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import {
  PasswordStrengthBar,
  PasswordRequirements,
  PasswordMatchIndicator,
  usePasswordValid,
} from '@/components/auth/PasswordStrength';
import { BRAND } from '@/lib/brand';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { CheckCircle } from 'lucide-react';

export default function UpdatePasswordPage() {
  const router = useRouter();
  const toast = useToast();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasSession, setHasSession] = useState<boolean | null>(null);
  const [success, setSuccess] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const checkedRef = useRef(false);
  const isPasswordValid = usePasswordValid(password);
  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;
  const canSubmit = isPasswordValid && passwordsMatch;

  useEffect(() => {
    if (checkedRef.current) return;
    checkedRef.current = true;

    const supabase = createClient();

    // Listen for PASSWORD_RECOVERY event (implicit flow with hash tokens)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setHasSession(true);
      }
    });

    // Check for existing session (PKCE flow where callback already exchanged the code)
    const timer = setTimeout(async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setHasSession((prev) => (prev === true ? true : !!user));
    }, 500);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timer);
    };
  }, []);

  // Countdown after success
  useEffect(() => {
    if (!success) return;
    if (countdown <= 0) {
      router.push('/auth/login');
      return;
    }
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [success, countdown, router]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');

    if (!canSubmit) return;

    setLoading(true);

    try {
      const supabase = createClient();
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });

      if (updateError) {
        toast.error(updateError.message);
        return;
      }

      toast.success('Password updated successfully');
      setSuccess(true);
    } catch {
      toast.error('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  // Loading state
  if (hasSession === null) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: BRAND.colors.heroGradient }}
      >
        <div className="animate-spin h-8 w-8 border-2 border-gold border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-6"
      style={{ background: BRAND.colors.heroGradient }}
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="w-full max-w-sm"
      >
        <div className="flex justify-center mb-8">
          <LRMonogram size="xl" />
        </div>

        {hasSession ? (
          success ? (
            /* Success state with countdown */
            <div className="text-center space-y-4">
              <CheckCircle size={48} className="mx-auto" style={{ color: '#22c55e' }} />
              <h1
                className="text-2xl font-semibold"
                style={{
                  fontFamily: BRAND.fonts.playfair,
                  color: BRAND.colors.white,
                }}
              >
                Password Updated
              </h1>
              <p className="text-white/60 text-sm font-inter">
                Your password has been updated successfully.
              </p>
              <Button
                variant="accent"
                size="lg"
                className="w-full"
                onClick={() => router.push('/auth/login')}
              >
                Go to Login
              </Button>
              <p className="text-white/40 text-xs font-inter">
                Redirecting to login in {countdown}...
              </p>
            </div>
          ) : (
            /* Password form */
            <>
              <h1
                className="text-center text-2xl font-semibold mb-2"
                style={{
                  fontFamily: BRAND.fonts.playfair,
                  color: BRAND.colors.white,
                }}
              >
                Set New Password
              </h1>
              <p className="text-center text-sm text-white/40 font-inter mb-8">
                Enter your new password below.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label
                    className="block text-sm font-montserrat font-medium mb-1.5"
                    style={{ color: BRAND.colors.surface }}
                  >
                    New Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    autoComplete="new-password"
                    required
                    className="w-full px-4 py-2.5 rounded-[8px] text-sm font-inter outline-none transition-all duration-200"
                    style={{
                      backgroundColor: 'rgba(255,255,255,0.08)',
                      border: '1px solid rgba(255,255,255,0.3)',
                      color: '#ffffff',
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = BRAND.colors.accent;
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = 'rgba(255,255,255,0.3)';
                    }}
                  />
                  <PasswordStrengthBar password={password} />
                  <PasswordRequirements password={password} />
                </div>

                <div>
                  <label
                    className="block text-sm font-montserrat font-medium mb-1.5"
                    style={{ color: BRAND.colors.surface }}
                  >
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter your new password"
                    autoComplete="new-password"
                    required
                    className="w-full px-4 py-2.5 rounded-[8px] text-sm font-inter outline-none transition-all duration-200"
                    style={{
                      backgroundColor: 'rgba(255,255,255,0.08)',
                      border: '1px solid rgba(255,255,255,0.3)',
                      color: '#ffffff',
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = BRAND.colors.accent;
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = 'rgba(255,255,255,0.3)';
                    }}
                  />
                  <PasswordMatchIndicator
                    password={password}
                    confirmPassword={confirmPassword}
                  />
                </div>

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
                  type="submit"
                  variant="accent"
                  size="lg"
                  loading={loading}
                  disabled={!canSubmit}
                  className="w-full"
                >
                  Update Password
                </Button>
              </form>
            </>
          )
        ) : (
          /* No session - link expired */
          <div className="text-center">
            <h1
              className="text-2xl font-semibold mb-4"
              style={{
                fontFamily: BRAND.fonts.playfair,
                color: BRAND.colors.white,
              }}
            >
              Link Expired
            </h1>
            <p className="text-white/60 text-sm font-inter mb-6">
              This reset link has expired. Please request a new one.
            </p>
            <Link href="/auth/reset-password">
              <Button variant="accent">Request New Link</Button>
            </Link>
          </div>
        )}
      </motion.div>
    </div>
  );
}
