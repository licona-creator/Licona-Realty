/**
 * Login Page
 *
 * Clean premium login screen in full Licona Realty brand.
 * Navy background, gold LR monogram centered, Playfair Display heading.
 * Email and password authentication via Supabase Auth.
 * MFA enforced after initial login.
 */

'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { LRMonogram } from '@/components/ui/LRMonogram';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { validateEmail } from '@/lib/security/validation';
import { BRAND } from '@/lib/brand';
import Link from 'next/link';
import { motion } from 'framer-motion';

export default function LoginPage() {
  const router = useRouter();
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
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: emailValidation.sanitized,
        password,
      });

      if (authError) {
        // Generic error message to prevent user enumeration
        setError('Invalid email or password. Please try again.');
        return;
      }

      router.push('/dashboard');
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
          className="text-center text-sm mb-8"
          style={{ fontFamily: BRAND.fonts.inter, color: 'rgba(255,255,255,0.5)' }}
        >
          {BRAND.tagline}
        </p>

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-4">
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
          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            autoComplete="current-password"
            required
            className="!bg-white/10 !border-white/20 !text-white !placeholder:text-white/30"
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
            type="submit"
            variant="accent"
            size="lg"
            loading={loading}
            className="w-full"
          >
            Sign In
          </Button>
        </form>

        {/* Links */}
        <div className="mt-6 text-center space-y-2">
          <Link
            href="/auth/reset-password"
            className="text-sm text-white/40 hover:text-gold transition-colors duration-200 font-inter"
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
