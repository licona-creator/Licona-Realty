/**
 * Registration Page
 *
 * New account creation with enforced password requirements:
 * - Minimum 8 characters
 * - At least one uppercase, lowercase, number, special character
 * - Visual password strength indicator with requirements checklist
 * - Email validation (RFC 5322)
 *
 * After registration, user is redirected to MFA setup (mandatory).
 */

'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { LRMonogram } from '@/components/ui/LRMonogram';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { validateEmail } from '@/lib/security/validation';
import {
  PasswordStrengthBar,
  PasswordRequirements,
  PasswordMatchIndicator,
  usePasswordValid,
} from '@/components/auth/PasswordStrength';
import { BRAND } from '@/lib/brand';
import Link from 'next/link';
import { motion } from 'framer-motion';

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const isPasswordValid = usePasswordValid(password);
  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;
  const canSubmit = isPasswordValid && passwordsMatch && email.length > 0;

  async function handleRegister(e: FormEvent) {
    e.preventDefault();
    setError('');

    const emailResult = validateEmail(email);
    if (!emailResult.valid) {
      setError('Please enter a valid email address.');
      return;
    }

    if (!isPasswordValid) {
      setError('Please meet all password requirements.');
      return;
    }

    if (!passwordsMatch) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: emailResult.sanitized,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (signUpError) {
        setError(signUpError.message);
        return;
      }

      // Create session token if user has an active session
      if (signUpData.user && signUpData.session) {
        try {
          const sessionToken = crypto.randomUUID();
          await supabase.from('user_sessions').insert({
            user_id: signUpData.user.id,
            session_token: sessionToken,
            device_info: navigator.userAgent,
          });
          const secure = location.protocol === 'https:' ? '; Secure' : '';
          document.cookie = `licona_device_session=${sessionToken}; path=/; max-age=${60 * 60 * 3}; SameSite=Strict${secure}`;
        } catch {
          // Table may not exist yet
        }
      }

      // Redirect to MFA setup (mandatory)
      router.push('/auth/mfa-setup');
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
        {/* LR Monogram */}
        <div className="flex justify-center mb-8">
          <LRMonogram size="xl" />
        </div>

        <h1
          className="text-center text-3xl font-semibold mb-2"
          style={{ fontFamily: BRAND.fonts.playfair, color: BRAND.colors.white }}
        >
          Create Account
        </h1>
        <p
          className="text-center text-sm mb-8"
          style={{ fontFamily: BRAND.fonts.inter, color: 'rgba(255,255,255,0.5)' }}
        >
          {BRAND.tagline}
        </p>

        <form onSubmit={handleRegister} className="space-y-4">
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

          <div>
            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimum 8 characters"
              autoComplete="new-password"
              required
              className="!bg-white/10 !border-white/20 !text-white !placeholder:text-white/30"
            />
            <PasswordStrengthBar password={password} />
            <PasswordRequirements password={password} />
          </div>

          <div>
            <Input
              label="Confirm Password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm your password"
              autoComplete="new-password"
              required
              className="!bg-white/10 !border-white/20 !text-white !placeholder:text-white/30"
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
            className="w-full"
            disabled={!canSubmit}
          >
            Create Account
          </Button>
        </form>

        <div className="mt-6 text-center">
          <Link
            href="/auth/login"
            className="text-sm text-white/40 hover:text-gold transition-colors duration-200 font-inter"
          >
            Already have an account? Sign in
          </Link>
        </div>

        <div className="mt-12 text-center">
          <p className="text-[10px] text-white/20 font-inter">
            {BRAND.agent.name} &middot; {BRAND.agent.brokerage}
          </p>
          <p className="text-[10px] text-white/15 font-inter mt-1">
            {BRAND.agent.license}
          </p>
        </div>
      </motion.div>
    </div>
  );
}
