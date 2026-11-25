import { SITE_THEME_MEDIA } from '@/lib/site/types'

export type MediaLibrary = {
  theme: Array<{ src: string; label: string }>
  uploads: Array<{ src: string; label: string }>
}

let memory: MediaLibrary | null = null
let inflight: Promise<MediaLibrary> | null = null

export function peekMediaLibrary() {
  return memory
}

export function rememberMediaLibrary(next: MediaLibrary) {
  memory = next
}

export function loadMediaLibrary(): Promise<MediaLibrary> {
  if (memory) return Promise.resolve(memory)
  if (!inflight) {
    inflight = fetch('/api/admin/site/media', { cache: 'no-store' })
      .then(async (res) => {
        const json = (await res.json().catch(() => ({}))) as Partial<MediaLibrary>
        const next: MediaLibrary = res.ok
          ? {
              theme: json.theme?.length ? json.theme : [...SITE_THEME_MEDIA],
              uploads: json.uploads ?? [],
            }
          : { theme: [...SITE_THEME_MEDIA], uploads: [] }
        memory = next
        return next
      })
      .catch(() => {
        const next: MediaLibrary = { theme: [...SITE_THEME_MEDIA], uploads: [] }
        return next
      })
      .finally(() => {
        inflight = null
      })
  }
  return inflight
}
