'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { LRMonogram } from '@/components/ui/LRMonogram';
import { Button } from '@/components/ui/Button';
import { BRAND } from '@/lib/brand';
import Link from 'next/link';
import { motion } from 'framer-motion';

const REASON_TEXT: Record<string, string> = {
  device: 'You were signed out because you logged in on another device.',
  timeout: 'Your session has expired for security. Please sign back in to continue.',
};

function SessionExpiredContent() {
  const searchParams = useSearchParams();
  const reason = searchParams.get('reason') || 'timeout';
  const message = REASON_TEXT[reason] || REASON_TEXT.timeout;

  return (
    <div
      className="min-h-screen flex items-center justify-center px-6"
      style={{ background: BRAND.colors.heroGradient }}
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="w-full max-w-sm text-center"
      >
        <div className="flex justify-center mb-8">
          <LRMonogram size="xl" />
        </div>

        <h1
          className="text-3xl font-semibold mb-3"
          style={{ fontFamily: BRAND.fonts.playfair, color: BRAND.colors.white }}
        >
          Session ended
        </h1>

        <p className="text-sm mb-8 font-inter" style={{ color: 'rgba(255,255,255,0.7)' }}>
          {message}
        </p>

        <Link href="/auth/login" className="block">
          <Button variant="accent" size="lg" className="w-full">
            Sign back in
          </Button>
        </Link>

        <div className="mt-12">
          <p className="text-[10px] text-white/20 font-inter">
            {BRAND.agent.name} &middot; {BRAND.agent.brokerage}
          </p>
        </div>
      </motion.div>
    </div>
  );
}

export default function SessionExpiredPage() {
  return (
    <Suspense>
      <SessionExpiredContent />
    </Suspense>
  );
}
