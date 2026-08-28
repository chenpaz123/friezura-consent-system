interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

// Use a global to preserve state across HMR in Next.js development
const globalForRateLimit = globalThis as unknown as {
  _rateLimitCache: Map<string, RateLimitEntry> | undefined;
};

const cache = globalForRateLimit._rateLimitCache ?? new Map<string, RateLimitEntry>();
if (process.env.NODE_ENV !== "production") {
  globalForRateLimit._rateLimitCache = cache;
}

export function isRateLimited(ip: string): boolean {
  const entry = cache.get(ip);
  if (!entry) return false;
  if (Date.now() > entry.resetAt) {
    cache.delete(ip);
    return false;
  }
  return entry.count >= MAX_ATTEMPTS;
}

export function incrementRateLimit(ip: string): void {
  const entry = cache.get(ip);
  if (!entry || Date.now() > entry.resetAt) {
    cache.set(ip, { count: 1, resetAt: Date.now() + WINDOW_MS });
  } else {
    cache.set(ip, { ...entry, count: entry.count + 1 });
  }
}

export function resetRateLimit(ip: string): void {
  cache.delete(ip);
}
