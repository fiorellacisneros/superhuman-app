const buckets = new Map<string, number[]>();

export function isRateLimited(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const start = now - windowMs;
  const current = buckets.get(key) ?? [];
  const filtered = current.filter((ts) => ts >= start);
  if (filtered.length >= limit) {
    buckets.set(key, filtered);
    return true;
  }
  filtered.push(now);
  buckets.set(key, filtered);
  return false;
}
