/**
 * 404 Page
 *
 * Auth-aware: shows "Back to Dashboard" for authenticated users,
 * "Go to Login" for unauthenticated users. Defaults to login link
 * until auth state is confirmed to avoid leaking protected routes.
 * No agent contact info shown (visible to unauthenticated visitors).
 */

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { LRMonogram } from '@/components/ui/LRMonogram';
import { BRAND } from '@/lib/brand';

export default function NotFound() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setIsAuthenticated(!!user);
    });
  }, []);

  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center px-6 text-center"
      style={{ background: BRAND.colors.heroGradient }}
    >
      {/* Monogram */}
      <LRMonogram size="xl" className="mb-8" />

      {/* 404 */}
      <h1
        className="font-dmSerif leading-none"
        style={{ fontSize: 'clamp(6rem, 15vw, 10rem)', color: BRAND.colors.gold }}
      >
        404
      </h1>

      {/* Title */}
      <h2
        className="mt-4 font-playfair text-3xl font-semibold md:text-4xl"
        style={{ color: BRAND.colors.white }}
      >
        Page Not Found
      </h2>

      {/* Description */}
      <p
        className="mt-4 max-w-md font-inter text-base leading-relaxed"
        style={{ color: 'rgba(255, 255, 255, 0.7)' }}
      >
        The page you are looking for does not exist or has been moved.
      </p>

      {/* Auth-aware CTA */}
      {isAuthenticated ? (
        <Link
          href="/dashboard"
          className="mt-8 inline-flex items-center justify-center gap-2 rounded-[8px] bg-gold px-7 py-3 text-base font-montserrat font-semibold text-navy transition-all duration-200 ease-in-out hover:bg-gold/90 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-gold focus-visible:outline-offset-2"
        >
          Back to Dashboard
        </Link>
      ) : (
        <Link
          href="/auth/login"
          className="mt-8 inline-flex items-center justify-center gap-2 rounded-[8px] bg-gold px-7 py-3 text-base font-montserrat font-semibold text-navy transition-all duration-200 ease-in-out hover:bg-gold/90 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-gold focus-visible:outline-offset-2"
        >
          Go to Login
        </Link>
      )}

      {/* Minimal footer - no contact info */}
      <footer className="mt-16">
        <p
          className="font-inter text-xs italic"
          style={{ fontFamily: BRAND.fonts.playfair, color: BRAND.colors.gold }}
        >
          {BRAND.tagline}
        </p>
      </footer>
    </div>
  );
}
