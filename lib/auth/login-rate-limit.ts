type Bucket = { count: number; resetAt: number }

const buckets = new Map<string, Bucket>()

const LOGIN_LIMIT = 8
const LOGIN_WINDOW_MS = 15 * 60 * 1000

function prune(now: number) {
  if (buckets.size < 500) return
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key)
  }
}

function loginKey(email: string) {
  return `login:${email.trim().toLowerCase() || 'empty'}`
}

/** Limite en mémoire (un processus). `true` = encore autorisé. */
export function consumeRateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now()
  prune(now)
  const current = buckets.get(key)
  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }
  current.count += 1
  return current.count <= limit
}

export function loginAttemptAllowed(email: string): boolean {
  const now = Date.now()
  const current = buckets.get(loginKey(email))
  if (!current || current.resetAt <= now) return true
  return current.count < LOGIN_LIMIT
}

export function noteFailedLogin(email: string): void {
  consumeRateLimit(loginKey(email), LOGIN_LIMIT, LOGIN_WINDOW_MS)
}

export function clientRateKey(req: Request, scope: string): string {
  const forwarded = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  const realIp = req.headers.get('x-real-ip')?.trim()
  return `${scope}:${forwarded || realIp || 'direct'}`
}
