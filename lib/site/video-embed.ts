/** Helpers d’intégration vidéo (YouTube / Vimeo / fichier). */

export function extractYoutubeVideoId(url: string): string | null {
  const value = url?.trim()
  if (!value) return null
  try {
    const parsed = new URL(value)
    const host = parsed.hostname.replace(/^www\./, '')
    if (host === 'youtu.be') {
      return parsed.pathname.split('/').filter(Boolean)[0]?.split('?')[0] || null
    }
    if (
      host === 'youtube.com' ||
      host === 'm.youtube.com' ||
      host === 'youtube-nocookie.com'
    ) {
      if (parsed.pathname.startsWith('/results')) return null
      const fromQuery = parsed.searchParams.get('v')
      const parts = parsed.pathname.split('/').filter(Boolean)
      if (fromQuery) return fromQuery
      if (parts[0] === 'embed' || parts[0] === 'shorts' || parts[0] === 'live') {
        return parts[1]?.split('?')[0] || null
      }
    }
  } catch {
    return null
  }
  return null
}

export function youtubeThumbnailUrl(
  videoId: string,
  quality: 'hqdefault' | 'mqdefault' | 'sddefault' | 'maxresdefault' = 'hqdefault'
) {
  return `https://i.ytimg.com/vi/${videoId}/${quality}.jpg`
}

export function toVideoEmbedUrl(url: string, autoplay = true): string | null {
  const value = url?.trim()
  if (!value) return null

  if (
    value.startsWith('/') ||
    /\.(mp4|webm|ogg)(\?|$)/i.test(value) ||
    value.startsWith('blob:')
  ) {
    return null
  }

  try {
    const parsed = new URL(value)
    const host = parsed.hostname.replace(/^www\./, '')
    const auto = autoplay ? '1' : '0'

    const ytId = extractYoutubeVideoId(value)
    if (ytId && (host.includes('youtu') || host.includes('youtube'))) {
      return `https://www.youtube-nocookie.com/embed/${ytId}?autoplay=${auto}&rel=0&modestbranding=1`
    }

    if (host === 'vimeo.com' || host === 'player.vimeo.com') {
      const id = parsed.pathname.split('/').filter(Boolean).pop()
      return id ? `https://player.vimeo.com/video/${id}?autoplay=${auto}` : null
    }
  } catch {
    return null
  }

  return null
}

export function isDirectVideoFile(url: string) {
  const value = url?.trim() || ''
  return (
    value.startsWith('/') ||
    value.startsWith('blob:') ||
    /\.(mp4|webm|ogg)(\?|$)/i.test(value)
  )
}

export function isPlayableVideoHref(url: string) {
  return Boolean(toVideoEmbedUrl(url, false) || isDirectVideoFile(url))
}

export function videoProviderLabel(url: string) {
  if (isDirectVideoFile(url)) return 'Fichier'
  if (extractYoutubeVideoId(url)) return 'YouTube'
  try {
    const host = new URL(url).hostname.replace(/^www\./, '')
    if (host.includes('vimeo')) return 'Vimeo'
  } catch {
    /* ignore */
  }
  return 'Lien'
}
