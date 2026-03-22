/**
 * PII-Safe Logger
 *
 * Custom logger that scrubs all personally identifiable information
 * before any logging occurs. PII must NEVER appear in console.log,
 * error logs, or any monitoring service.
 */

// Patterns that match common PII formats
const PII_PATTERNS: Array<{ regex: RegExp; replacement: string }> = [
  // Email addresses
  { regex: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, replacement: '[EMAIL_REDACTED]' },
  // Phone numbers (various formats)
  { regex: /(\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g, replacement: '[PHONE_REDACTED]' },
  // SSN patterns
  { regex: /\b\d{3}[-.\s]?\d{2}[-.\s]?\d{4}\b/g, replacement: '[SSN_REDACTED]' },
  // Credit card patterns (basic)
  { regex: /\b\d{4}[-.\s]?\d{4}[-.\s]?\d{4}[-.\s]?\d{4}\b/g, replacement: '[CC_REDACTED]' },
  // Street addresses (basic pattern)
  { regex: /\b\d{1,5}\s[A-Z][a-z]+(\s[A-Z][a-z]+)*\s(St|Ave|Blvd|Dr|Rd|Ln|Ct|Way|Pl|Cir)\b/gi, replacement: '[ADDRESS_REDACTED]' },
  // ZIP codes (US)
  { regex: /\b\d{5}(-\d{4})?\b/g, replacement: '[ZIP_REDACTED]' },
];

// Fields that should never be logged
const SENSITIVE_FIELDS = new Set([
  'password',
  'token',
  'secret',
  'api_key',
  'apiKey',
  'authorization',
  'cookie',
  'session',
  'annual_income',
  'monthly_debts',
  'down_payment',
  'annual_income_encrypted',
  'monthly_debts_encrypted',
  'down_payment_encrypted',
  'first_name',
  'last_name',
  'email',
  'phone',
  'address_line_1',
  'address_line_2',
  'ssn',
  'credit_card',
  'visitor_name',
  'visitor_email',
  'visitor_phone',
]);

/**
 * Scrub PII from a string value
 */
function scrubString(value: string): string {
  let scrubbed = value;
  for (const { regex, replacement } of PII_PATTERNS) {
    scrubbed = scrubbed.replace(regex, replacement);
  }
  return scrubbed;
}

/**
 * Deep scrub an object, redacting any sensitive field values
 */
function scrubValue(value: unknown): unknown {
  if (value === null || value === undefined) return value;

  if (typeof value === 'string') {
    return scrubString(value);
  }

  if (Array.isArray(value)) {
    return value.map(scrubValue);
  }

  if (typeof value === 'object') {
    const scrubbed: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value)) {
      if (SENSITIVE_FIELDS.has(key.toLowerCase())) {
        scrubbed[key] = '[REDACTED]';
      } else {
        scrubbed[key] = scrubValue(val);
      }
    }
    return scrubbed;
  }

  return value;
}

/**
 * PII-safe logger. All output is scrubbed before being emitted.
 */
export const logger = {
  info(...args: unknown[]) {
    console.log('[INFO]', ...args.map(scrubValue));
  },

  warn(...args: unknown[]) {
    console.warn('[WARN]', ...args.map(scrubValue));
  },

  error(...args: unknown[]) {
    console.error('[ERROR]', ...args.map(scrubValue));
  },

  debug(...args: unknown[]) {
    if (process.env.NODE_ENV === 'development') {
      console.debug('[DEBUG]', ...args.map(scrubValue));
    }
  },
};
