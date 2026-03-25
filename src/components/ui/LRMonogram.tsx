/**
 * LR Monogram - Primary Brand Mark
 *
 * Renders the real Licona Realty logo image when available,
 * falls back to SVG at /logo.svg.
 *
 * Priority: NEXT_PUBLIC_LOGO_URL env var > /logo.svg
 */

'use client';

import Image from 'next/image';

interface LRMonogramProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeMap = {
  sm: 32,
  md: 44,
  lg: 64,
  xl: 96,
};

const logoSrc = process.env.NEXT_PUBLIC_LOGO_URL || '/logo.svg';

export function LRMonogram({ size = 'md', className = '' }: LRMonogramProps) {
  const px = sizeMap[size];

  return (
    <Image
      src={logoSrc}
      alt="Licona Realty"
      width={px}
      height={px}
      className={`object-contain ${className}`}
      data-testid="lr-monogram"
      priority={size === 'xl'}
    />
  );
}
