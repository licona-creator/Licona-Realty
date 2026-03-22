/**
 * Password Reset Page
 *
 * Secure password reset flow with time-limited single-use reset link.
 * Styled in full Licona Realty brand.
 */

'use client';

import { useState, type FormEvent } from 'react';
import { createClient } from '@/lib/supabase/client';
import { LRMonogram } from '@/components/ui/LRMonogram';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { validateEmail } from '@/lib/security/validation';
import { BRAND } from '@/lib/brand';
import Link from 'next/link';
import { motion } from 'framer-motion';

export default function ResetPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleReset(e: FormEvent) {
    e.preventDefault();
    setError('');

    const emailValidation = validateEmail(email);
    if (!emailValidation.valid) {
      setError('Please enter a valid email address.');
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        emailValidation.sanitized,
        {
          redirectTo: `${window.location.origin}/auth/callback?type=recovery`,
        }
      );

      if (resetError) {
        // Always show success to prevent email enumeration
        setSent(true);
        return;
      }

      setSent(true);
    } catch {
      setError('An unexpected error occurred. Please try again.');
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
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="w-full max-w-sm"
      >
        <div className="flex justify-center mb-8">
          <LRMonogram size="xl" />
        </div>

        <h1
          className="text-center text-2xl font-semibold mb-2"
          style={{ fontFamily: BRAND.fonts.playfair, color: BRAND.colors.white }}
        >
          Reset Password
        </h1>

        {sent ? (
          <div className="text-center">
            <p className="text-white/60 text-sm font-inter mb-6">
              If an account exists with that email, you will receive a password
              reset link shortly. The link expires in 15 minutes.
            </p>
            <Link href="/auth/login">
              <Button variant="accent">Back to Login</Button>
            </Link>
          </div>
        ) : (
          <>
            <p className="text-center text-sm text-white/40 font-inter mb-8">
              Enter your email and we will send you a reset link.
            </p>

            <form onSubmit={handleReset} className="space-y-4">
              <Input
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="licona@liconarealty.com"
                autoComplete="email"
                required
                className="!bg-white/10 !border-white/20 !text-white !placeholder:text-white/30"
              />

              {error && (
                <p className="text-red-400 text-sm text-center font-inter">
                  {error}
                </p>
              )}

              <Button
                type="submit"
                variant="accent"
                size="lg"
                loading={loading}
                className="w-full"
              >
                Send Reset Link
              </Button>
            </form>

            <div className="mt-6 text-center">
              <Link
                href="/auth/login"
                className="text-sm text-white/40 hover:text-gold transition-colors duration-200 font-inter"
              >
                Back to login
              </Link>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}
