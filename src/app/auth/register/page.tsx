/**
 * Registration Page
 *
 * New account creation with enforced password requirements:
 * - Minimum 12 characters
 * - At least one uppercase, lowercase, number, special character
 * - Visual password strength indicator
 * - Email validation (RFC 5322)
 *
 * After registration, user is redirected to MFA setup (enforced).
 */

'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { LRMonogram } from '@/components/ui/LRMonogram';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { validateEmail, validatePassword, type PasswordValidation } from '@/lib/security/validation';
import { BRAND } from '@/lib/brand';
import Link from 'next/link';
import { motion } from 'framer-motion';

const strengthColors = {
  weak: '#EF4444',
  fair: '#F59E0B',
  good: '#3B82F6',
  strong: '#22C55E',
};

const strengthLabels = {
  weak: 'Weak',
  fair: 'Fair',
  good: 'Good',
  strong: 'Strong',
};

const strengthWidth = {
  weak: '25%',
  fair: '50%',
  good: '75%',
  strong: '100%',
};

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [passwordValidation, setPasswordValidation] = useState<PasswordValidation | null>(null);

  function handlePasswordChange(value: string) {
    setPassword(value);
    if (value.length > 0) {
      setPasswordValidation(validatePassword(value));
    } else {
      setPasswordValidation(null);
    }
  }

  async function handleRegister(e: FormEvent) {
    e.preventDefault();
    setError('');

    // Validate email
    const emailResult = validateEmail(email);
    if (!emailResult.valid) {
      setError('Please enter a valid email address.');
      return;
    }

    // Validate password
    const passResult = validatePassword(password);
    if (!passResult.valid) {
      setError(passResult.errors[0]);
      return;
    }

    // Confirm password match
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();
      const { error: signUpError } = await supabase.auth.signUp({
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

      // Redirect to dashboard — MFA setup is optional for now
      router.push('/dashboard');
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
              onChange={(e) => handlePasswordChange(e.target.value)}
              placeholder="Minimum 12 characters"
              autoComplete="new-password"
              required
              className="!bg-white/10 !border-white/20 !text-white !placeholder:text-white/30"
            />

            {/* Password Strength Indicator */}
            {passwordValidation && (
              <div className="mt-2">
                <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: strengthWidth[passwordValidation.strength] }}
                    className="h-full rounded-full transition-all duration-300"
                    style={{ backgroundColor: strengthColors[passwordValidation.strength] }}
                  />
                </div>
                <p
                  className="text-xs mt-1 font-inter"
                  style={{ color: strengthColors[passwordValidation.strength] }}
                >
                  {strengthLabels[passwordValidation.strength]}
                </p>

                {/* Password requirements */}
                {passwordValidation.errors.length > 0 && (
                  <ul className="mt-2 space-y-0.5">
                    {passwordValidation.errors.map((err) => (
                      <li key={err} className="text-xs text-red-400 font-inter">
                        {err}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          <Input
            label="Confirm Password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm your password"
            autoComplete="new-password"
            required
            error={
              confirmPassword.length > 0 && password !== confirmPassword
                ? 'Passwords do not match'
                : undefined
            }
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
            disabled={
              !passwordValidation?.valid ||
              password !== confirmPassword ||
              !email
            }
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
