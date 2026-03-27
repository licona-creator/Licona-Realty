/**
 * Login Page
 *
 * Clean premium login screen in full Licona Realty brand.
 * Navy background, gold LR monogram centered, Playfair Display heading.
 * Email and password authentication via Supabase Auth.
 * Creates a single-device session token on success.
 * MFA enforced after initial login.
 */

'use client';

import { useState, useMemo, Suspense, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { LRMonogram } from '@/components/ui/LRMonogram';
import { Button } from '@/components/ui/Button';
import { validateEmail } from '@/lib/security/validation';
import { BRAND } from '@/lib/brand';
import Link from 'next/link';
import { motion } from 'framer-motion';

function PasswordStrength({ password }: { password: string }) {
  const { level, label, segments } = useMemo(() => {
    if (!password) return { level: 0, label: '', segments: 0 };
    const len = password.length;
    const hasUpper = /[A-Z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecial = /[^A-Za-z0-9]/.test(password);
    if (len >= 12 && hasUpper && hasNumber && hasSpecial) return { level: 4, label: 'Strong', segments: 4 };
    if ((len >= 9) || (hasUpper && hasNumber)) return { level: 3, label: 'Good', segments: 3 };
    if (len >= 6) return { level: 2, label: 'Fair', segments: 2 };
    return { level: 1, label: 'Weak', segments: 1 };
  }, [password]);

  if (!password) return null;

  const colors = ['', '#ef4444', '#f59e0b', '#d3a971', '#10b981'];
  const color = colors[level];

  return (
    <div className="mt-1.5">
      <div className="flex gap-1">
        {[1, 2, 3, 4].map(i => (
          <div
            key={i}
            className="flex-1 h-1 rounded-full transition-colors duration-200"
            style={{ backgroundColor: i <= segments ? color : '#1a2535' }}
          />
        ))}
      </div>
      <p className="text-[11px] mt-1 font-inter" style={{ color }}>{label}</p>
    </div>
  );
}

const SESSION_REASONS: Record<string, string> = {
  signed_out_other_device: 'You were signed out because you logged in on another device.',
  session_expired: 'Your session expired due to inactivity. Please log in again.',
};

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const reason = searchParams.get('reason');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    setError('');

    // Client-side validation (server-side is the real boundary)
    const emailValidation = validateEmail(email);
    if (!emailValidation.valid) {
      setError('Please enter a valid email address.');
      return;
    }

    if (!password) {
      setError('Please enter your password.');
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: emailValidation.sanitized,
        password,
      });

      if (authError) {
        const msg = authError.message?.toLowerCase() || '';
        if (msg.includes('email not confirmed')) {
          setError('Please verify your email address before signing in.');
        } else if (msg.includes('too many requests') || msg.includes('rate limit')) {
          setError('Too many login attempts. Please wait a few minutes and try again.');
        } else if (msg.includes('network') || msg.includes('fetch')) {
          setError('Connection issue. Please check your internet and try again.');
        } else {
          setError('Incorrect email or password. Please try again.');
        }
        return;
      }

      // Create single-device session token
      if (data.user) {
        try {
          const sessionToken = crypto.randomUUID();

          // Invalidate all existing sessions for this user
          await supabase
            .from('user_sessions')
            .update({ is_active: false })
            .eq('user_id', data.user.id);

          // Create new session
          await supabase.from('user_sessions').insert({
            user_id: data.user.id,
            session_token: sessionToken,
            device_info: navigator.userAgent,
          });

          // Store session token in cookie
          const secure = location.protocol === 'https:' ? '; Secure' : '';
          document.cookie = `licona_device_session=${sessionToken}; path=/; max-age=${60 * 60 * 3}; SameSite=Strict${secure}`;
        } catch {
          // Table may not exist yet - proceed without session enforcement
        }
      }

      // Check if MFA is enrolled
      const { data: factorsData } = await supabase.auth.mfa.listFactors();
      const hasVerifiedFactor = factorsData?.totp?.some(
        (f: { status: string }) => f.status === 'verified'
      );

      if (hasVerifiedFactor) {
        router.push('/auth/mfa-verify');
      } else {
        // No MFA - must set it up (mandatory)
        router.push('/auth/mfa-setup');
      }
      router.refresh();
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

        {/* Heading */}
        <h1
          className="text-center text-3xl font-semibold mb-2"
          style={{ fontFamily: BRAND.fonts.playfair, color: BRAND.colors.white }}
        >
          Welcome Back
        </h1>
        <p
          className="text-center text-sm mb-8 italic"
          style={{ fontFamily: BRAND.fonts.playfair, color: BRAND.colors.accent }}
        >
          {BRAND.tagline}
        </p>

        {/* Session reason banner */}
        {reason && SESSION_REASONS[reason] && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-4 px-4 py-3 rounded-[8px] text-sm font-inter text-center"
            style={{
              backgroundColor: 'rgba(211,169,113,0.15)',
              border: '1px solid rgba(211,169,113,0.3)',
              color: BRAND.colors.accent,
            }}
          >
            {SESSION_REASONS[reason]}
          </motion.div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLogin} data-testid="login-form" className="space-y-4">
          <div>
            <label className="block text-sm font-montserrat font-medium mb-1.5" style={{ color: BRAND.colors.surface }}>
              Email
            </label>
            <input
              type="email"
              data-testid="email-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="licona@liconarealty.com"
              autoComplete="email"
              required
              className="w-full px-4 py-2.5 rounded-[8px] text-sm font-inter outline-none transition-all duration-200"
              style={{
                backgroundColor: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.3)',
                color: '#ffffff',
              }}
              onFocus={e => { e.target.style.borderColor = BRAND.colors.accent; }}
              onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.3)'; }}
            />
          </div>
          <div>
            <label className="block text-sm font-montserrat font-medium mb-1.5" style={{ color: BRAND.colors.surface }}>
              Password
            </label>
            <input
              type="password"
              data-testid="password-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              autoComplete="current-password"
              required
              className="w-full px-4 py-2.5 rounded-[8px] text-sm font-inter outline-none transition-all duration-200"
              style={{
                backgroundColor: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.3)',
                color: '#ffffff',
              }}
              onFocus={e => { e.target.style.borderColor = BRAND.colors.accent; }}
              onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.3)'; }}
            />
            <PasswordStrength password={password} />
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
            data-testid="login-button"
          >
            Sign In
          </Button>
        </form>

        {/* Links */}
        <div className="mt-6 text-center space-y-2">
          <Link
            href="/auth/reset-password"
            className="text-sm hover:underline transition-colors duration-200 font-inter"
            style={{ color: BRAND.colors.accent }}
          >
            Forgot your password?
          </Link>
        </div>

        {/* Footer */}
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

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  );
}
