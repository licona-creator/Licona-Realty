/**
 * LR Monogram - Primary Brand Mark
 *
 * The L and R stacked monogram in #d3a971 gold.
 * Non-negotiable on every social post, Canva template,
 * and at the top of the sidebar navigation.
 */

'use client';

interface LRMonogramProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeMap = {
  sm: { width: 32, height: 32, fontSize: '14px', letterSpacing: '1px' },
  md: { width: 44, height: 44, fontSize: '18px', letterSpacing: '2px' },
  lg: { width: 64, height: 64, fontSize: '26px', letterSpacing: '3px' },
  xl: { width: 96, height: 96, fontSize: '40px', letterSpacing: '4px' },
};

export function LRMonogram({ size = 'md', className = '' }: LRMonogramProps) {
  const s = sizeMap[size];

  return (
    <div
      className={`flex items-center justify-center font-montserrat font-bold ${className}`}
      style={{
        width: s.width,
        height: s.height,
        color: '#d3a971',
        fontSize: s.fontSize,
        letterSpacing: s.letterSpacing,
        lineHeight: 1,
        userSelect: 'none',
      }}
      aria-label="Licona Realty"
    >
      LR
    </div>
  );
}
