/**
 * API Rate Limiting
 *
 * Token bucket rate limiter for API endpoints.
 * In-memory for single-instance; production can use Redis.
 *
 * Default limits:
 * - Auth endpoints: 10 requests per minute
 * - API endpoints: 60 requests per minute
 * - Webhook endpoints: 100 requests per minute
 * - Public pages: 30 requests per minute
 */

interface RateLimitRecord {
  tokens: number;
  lastRefill: number;
}

interface RateLimitConfig {
  maxTokens: number;
  refillRate: number;  // tokens per second
  windowMs: number;
}

export const RATE_LIMIT_CONFIGS: Record<string, RateLimitConfig> = {
  auth: { maxTokens: 10, refillRate: 10 / 60, windowMs: 60000 },
  api: { maxTokens: 60, refillRate: 1, windowMs: 60000 },
  webhook: { maxTokens: 100, refillRate: 100 / 60, windowMs: 60000 },
  public: { maxTokens: 30, refillRate: 0.5, windowMs: 60000 },
};

const store = new Map<string, RateLimitRecord>();

// Cleanup old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of store) {
    if (now - record.lastRefill > 300000) {
      store.delete(key);
    }
  }
}, 300000);

/**
 * Check and consume a rate limit token.
 * Returns { allowed, remaining, retryAfter }.
 */
export function checkRateLimit(
  identifier: string,
  configKey: string = 'api'
): {
  allowed: boolean;
  remaining: number;
  retryAfterMs: number;
} {
  const config = RATE_LIMIT_CONFIGS[configKey] || RATE_LIMIT_CONFIGS.api;
  const key = `${configKey}:${identifier}`;
  const now = Date.now();

  let record = store.get(key);

  if (!record) {
    record = { tokens: config.maxTokens, lastRefill: now };
    store.set(key, record);
  }

  // Refill tokens based on elapsed time
  const elapsed = (now - record.lastRefill) / 1000;
  record.tokens = Math.min(
    config.maxTokens,
    record.tokens + elapsed * config.refillRate
  );
  record.lastRefill = now;

  if (record.tokens >= 1) {
    record.tokens -= 1;
    store.set(key, record);
    return {
      allowed: true,
      remaining: Math.floor(record.tokens),
      retryAfterMs: 0,
    };
  }

  // Rate limited
  const retryAfterMs = Math.ceil((1 - record.tokens) / config.refillRate) * 1000;
  return {
    allowed: false,
    remaining: 0,
    retryAfterMs,
  };
}

/**
 * Get rate limit response headers.
 */
export function getRateLimitHeaders(
  remaining: number,
  configKey: string = 'api'
): Record<string, string> {
  const config = RATE_LIMIT_CONFIGS[configKey] || RATE_LIMIT_CONFIGS.api;
  return {
    'X-RateLimit-Limit': String(config.maxTokens),
    'X-RateLimit-Remaining': String(remaining),
    'X-RateLimit-Reset': String(Math.ceil(Date.now() / 1000) + 60),
  };
}
