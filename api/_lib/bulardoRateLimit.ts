/** Rate limit simple in-memory: 10 req / 10 min por IP. */
const WINDOW_MS = 10 * 60 * 1000
const MAX_REQUESTS = 10

type Bucket = { timestamps: number[] }

const buckets = new Map<string, Bucket>()

export function getClientIp(
  headers: Record<string, string | string[] | undefined> | Headers,
): string {
  const read = (key: string): string | undefined => {
    if (typeof (headers as Headers).get === 'function') {
      return (headers as Headers).get(key) ?? undefined
    }
    const v = (headers as Record<string, string | string[] | undefined>)[key]
    return Array.isArray(v) ? v[0] : v
  }
  const forwarded = read('x-forwarded-for') || read('x-real-ip')
  if (forwarded) {
    return forwarded.split(',')[0]?.trim() || 'unknown'
  }
  return 'unknown'
}

export function checkBulardoRateLimit(ip: string): {
  ok: boolean
  retryAfterSec?: number
} {
  const now = Date.now()
  const key = ip || 'unknown'
  let bucket = buckets.get(key)
  if (!bucket) {
    bucket = { timestamps: [] }
    buckets.set(key, bucket)
  }
  bucket.timestamps = bucket.timestamps.filter((t) => now - t < WINDOW_MS)
  if (bucket.timestamps.length >= MAX_REQUESTS) {
    const oldest = bucket.timestamps[0] ?? now
    const retryAfterSec = Math.max(1, Math.ceil((WINDOW_MS - (now - oldest)) / 1000))
    return { ok: false, retryAfterSec }
  }
  bucket.timestamps.push(now)
  return { ok: true }
}

/** Solo para tests. */
export function resetBulardoRateLimitForTests() {
  buckets.clear()
}
