// D1-backed counters keep limits consistent across Worker instances.
export async function consumeRateLimit(database: D1Database, bucket: string, limit: number, windowSeconds: number) {
  const now = Math.floor(Date.now() / 1000);
  const row = await database.prepare(`INSERT INTO auth_rate_limits (bucket, attempts, expires_at) VALUES (?, 1, ?)
    ON CONFLICT(bucket) DO UPDATE SET attempts = CASE WHEN expires_at <= ? THEN 1 ELSE attempts + 1 END,
      expires_at = CASE WHEN expires_at <= ? THEN excluded.expires_at ELSE expires_at END
    RETURNING attempts, expires_at`)
    .bind(bucket, now + windowSeconds, now, now)
    .first<{ attempts: number; expires_at: number }>();
  return { allowed: Boolean(row && row.attempts <= limit), retryAfterSeconds: Math.max(1, (row?.expires_at ?? now + windowSeconds) - now) };
}
