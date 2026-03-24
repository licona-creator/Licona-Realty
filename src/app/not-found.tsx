import Link from 'next/link';
import { LRMonogram } from '@/components/ui/LRMonogram';
import { BRAND } from '@/lib/brand';

export default function NotFound() {
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

      {/* Back to Dashboard */}
      <Link
        href="/dashboard"
        className="mt-8 inline-flex items-center justify-center gap-2 rounded-[8px] bg-gold px-7 py-3 text-base font-montserrat font-semibold text-navy transition-all duration-200 ease-in-out hover:bg-gold/90 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-gold focus-visible:outline-offset-2"
      >
        Back to Dashboard
      </Link>

      {/* Footer */}
      <footer className="mt-16 space-y-1">
        <p
          className="font-inter text-xs tracking-wide"
          style={{ color: BRAND.colors.gold }}
        >
          {BRAND.tagline}
        </p>
        <p
          className="font-inter text-xs"
          style={{ color: 'rgba(255, 255, 255, 0.4)' }}
        >
          {BRAND.agent.brokerage} &middot; {BRAND.agent.license}
        </p>
      </footer>
    </div>
  );
}
