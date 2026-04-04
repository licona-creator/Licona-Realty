'use client';

type DiscType = 'D' | 'I' | 'S' | 'C' | null;

interface DISCSelectorProps {
  value: DiscType;
  onChange: (value: DiscType) => void;
  disabled?: boolean;
}

const DISC_OPTIONS: Array<{
  value: 'D' | 'I' | 'S' | 'C';
  letter: string;
  label: string;
  description: string;
  color: string;
  bg: string;
  border: string;
  ring: string;
}> = [
  {
    value: 'D',
    letter: 'D',
    label: 'Driver',
    description: 'Direct, results-focused. Skip the fluff, get to the point.',
    color: '#c0392b',
    bg: 'bg-[#c0392b]/10',
    border: 'border-[#c0392b]/30',
    ring: 'ring-[#c0392b]/40',
  },
  {
    value: 'I',
    letter: 'I',
    label: 'Influencer',
    description: 'Personable, enthusiastic. Build the relationship first.',
    color: '#d3a971',
    bg: 'bg-[#d3a971]/10',
    border: 'border-[#d3a971]/30',
    ring: 'ring-[#d3a971]/40',
  },
  {
    value: 'S',
    letter: 'S',
    label: 'Stabilizer',
    description: 'Calm, reassuring. Step-by-step, no pressure.',
    color: '#27ae60',
    bg: 'bg-[#27ae60]/10',
    border: 'border-[#27ae60]/30',
    ring: 'ring-[#27ae60]/40',
  },
  {
    value: 'C',
    letter: 'C',
    label: 'Analyst',
    description: 'Data-driven, systematic. Bring the numbers.',
    color: '#2980b9',
    bg: 'bg-[#2980b9]/10',
    border: 'border-[#2980b9]/30',
    ring: 'ring-[#2980b9]/40',
  },
];

export function DISCSelector({ value, onChange, disabled }: DISCSelectorProps) {
  return (
    <div>
      <label className="block text-sm font-montserrat font-medium text-navy dark:text-white mb-1.5">
        DISC Personality
      </label>
      <div className="grid grid-cols-2 gap-2">
        {DISC_OPTIONS.map(opt => {
          const isSelected = value === opt.value;
          return (
            <button
              type="button"
              key={opt.value}
              disabled={disabled}
              onClick={() => onChange(isSelected ? null : opt.value)}
              className={`
                relative flex items-start gap-2.5 p-2.5 rounded-lg border text-left transition-all
                disabled:opacity-50 disabled:cursor-not-allowed
                ${isSelected
                  ? `${opt.bg} ${opt.border} ring-1 ${opt.ring}`
                  : 'border-gold/15 hover:border-gold/30 bg-white dark:bg-dark-card'
                }
              `}
            >
              <span
                className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-montserrat font-bold text-white"
                style={{ backgroundColor: opt.color }}
              >
                {opt.letter}
              </span>
              <div className="min-w-0">
                <p className="text-xs font-montserrat font-semibold text-navy dark:text-white leading-tight">
                  {opt.label}
                </p>
                {isSelected && (
                  <p className="text-[10px] text-navy/50 dark:text-white/50 font-inter mt-0.5 leading-snug">
                    {opt.description}
                  </p>
                )}
              </div>
            </button>
          );
        })}
      </div>
      {value && (
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange(null)}
          className="text-[10px] text-navy/40 dark:text-white/40 hover:text-navy/60 dark:hover:text-white/60 font-inter mt-1.5 transition-colors"
        >
          Clear DISC type
        </button>
      )}
    </div>
  );
}

export function DISCBadge({ type }: { type: 'D' | 'I' | 'S' | 'C' }) {
  const opt = DISC_OPTIONS.find(o => o.value === type);
  if (!opt) return null;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-montserrat font-semibold ${opt.bg}`}
      style={{ color: opt.color }}
      title={opt.description}
    >
      <span
        className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-white"
        style={{ backgroundColor: opt.color }}
      >
        {opt.letter}
      </span>
      {opt.label}
    </span>
  );
}
