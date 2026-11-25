const inflight = new Map<string, Promise<unknown>>()
const memory = new Map<string, { at: number; data: unknown }>()

/** Une requête partagée : les onglets et le double montage React ne relancent pas le réseau. */
export function cachedGet<T>(url: string, ttlMs = 0): Promise<T> {
  const hit = memory.get(url)
  if (ttlMs > 0 && hit && Date.now() - hit.at < ttlMs) {
    return Promise.resolve(hit.data as T)
  }
  const pending = inflight.get(url)
  if (pending) return pending as Promise<T>

  const request = fetch(url, { cache: 'no-store' })
    .then(async (res) => {
      const data = (await res.json().catch(() => ({}))) as T
      if (!res.ok) {
        throw Object.assign(new Error('fetch'), { status: res.status, data })
      }
      if (ttlMs > 0) memory.set(url, { at: Date.now(), data })
      return data
    })
    .finally(() => {
      inflight.delete(url)
    })

  inflight.set(url, request)
  return request
}

export function invalidateCachedGet(prefix?: string) {
  if (!prefix) {
    memory.clear()
    return
  }
  for (const key of memory.keys()) {
    if (key.startsWith(prefix)) memory.delete(key)
  }
}
