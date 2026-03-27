/**
 * Password Strength Indicator
 *
 * 4-segment colored bar + live requirements checklist.
 * Shared between update-password and register pages.
 */

'use client';

import { useMemo } from 'react';
import { Check, X } from 'lucide-react';

const COLORS = {
  red: '#ef4444',
  orange: '#f97316',
  yellow: '#eab308',
  green: '#22c55e',
};

interface PasswordStrengthProps {
  password: string;
}

export function PasswordStrengthBar({ password }: PasswordStrengthProps) {
  const { segments, color } = useMemo(() => {
    if (!password) return { segments: 0, color: '' };

    const hasLength = password.length >= 8;
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecial = /[!@#$%^&*]/.test(password);

    if (hasLength && hasUpper && hasLower && hasNumber && hasSpecial) {
      return { segments: 4, color: COLORS.green };
    }
    if (hasLength && (hasNumber || hasSpecial)) {
      return { segments: 3, color: COLORS.yellow };
    }
    if (hasLength) {
      return { segments: 2, color: COLORS.orange };
    }
    return { segments: 1, color: COLORS.red };
  }, [password]);

  if (!password) return null;

  return (
    <div className="flex gap-1 mt-2">
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="flex-1 h-1.5 rounded-full transition-colors duration-200"
          style={{
            backgroundColor: i <= segments ? color : 'rgba(255,255,255,0.1)',
          }}
        />
      ))}
    </div>
  );
}

export function PasswordRequirements({ password }: PasswordStrengthProps) {
  const requirements = useMemo(
    () => [
      { label: 'At least 8 characters', met: password.length >= 8 },
      { label: 'At least one uppercase letter', met: /[A-Z]/.test(password) },
      { label: 'At least one lowercase letter', met: /[a-z]/.test(password) },
      { label: 'At least one number', met: /[0-9]/.test(password) },
      {
        label: 'At least one special character (!@#$%^&*)',
        met: /[!@#$%^&*]/.test(password),
      },
    ],
    [password]
  );

  if (!password) return null;

  return (
    <ul className="space-y-1 mt-2">
      {requirements.map((req) => (
        <li key={req.label} className="flex items-center gap-1.5 text-xs font-inter">
          {req.met ? (
            <Check size={12} style={{ color: COLORS.green }} className="flex-shrink-0" />
          ) : (
            <X size={12} style={{ color: COLORS.red }} className="flex-shrink-0" />
          )}
          <span
            style={{
              color: req.met ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.4)',
            }}
          >
            {req.label}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function PasswordMatchIndicator({
  password,
  confirmPassword,
}: {
  password: string;
  confirmPassword: string;
}) {
  if (!confirmPassword) return null;

  const matches = password === confirmPassword;

  return (
    <div className="flex items-center gap-1.5 text-xs font-inter mt-1.5">
      {matches ? (
        <>
          <Check size={12} style={{ color: COLORS.green }} />
          <span style={{ color: COLORS.green }}>Passwords match</span>
        </>
      ) : (
        <>
          <X size={12} style={{ color: COLORS.red }} />
          <span style={{ color: COLORS.red }}>Passwords do not match</span>
        </>
      )}
    </div>
  );
}

export function usePasswordValid(password: string): boolean {
  return useMemo(() => {
    if (password.length < 8) return false;
    if (!/[A-Z]/.test(password)) return false;
    if (!/[a-z]/.test(password)) return false;
    if (!/[0-9]/.test(password)) return false;
    if (!/[!@#$%^&*]/.test(password)) return false;
    return true;
  }, [password]);
}
