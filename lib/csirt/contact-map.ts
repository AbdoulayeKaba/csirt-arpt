/** Carte Contacts : lieu libre, coordonnées ou lien Google Maps. */

export type ContactMap = {
  embedSrc: string
  openHref: string
}

const FALLBACK_PLACE = 'ARPT Conakry Guinée'

export function resolveContactMap(raw: string, address: string): ContactMap {
  const fallback = address.trim() || FALLBACK_PLACE
  const value = extractMapSource(raw)
  if (!value) return mapsFromQuery(fallback)

  const embed = asGoogleEmbed(value)
  if (embed) {
    return { embedSrc: embed, openHref: embed }
  }

  const parsed = parseGoogleMapsUrl(value)
  if (parsed?.query) {
    return {
      embedSrc: mapsFromQuery(parsed.query).embedSrc,
      openHref: parsed.openHref,
    }
  }
  if (parsed) {
    return {
      embedSrc: mapsFromQuery(fallback).embedSrc,
      openHref: parsed.openHref,
    }
  }

  return mapsFromQuery(value)
}

function mapsFromQuery(query: string): ContactMap {
  const q = encodeURIComponent(query.trim() || FALLBACK_PLACE)
  return {
    embedSrc: `https://maps.google.com/maps?q=${q}&z=15&output=embed`,
    openHref: `https://www.google.com/maps/search/?api=1&query=${q}`,
  }
}

function extractMapSource(raw: string): string {
  const value = raw.trim().slice(0, 2000)
  if (!value || /^\s*(?:javascript|data):/i.test(value)) return ''
  const iframe = /<iframe\b[^>]*\ssrc=["']([^"']+)["']/i.exec(value)
  return (iframe?.[1] ?? value).trim()
}

function asGoogleEmbed(value: string): string | null {
  if (!/^https:\/\//i.test(value)) return null
  try {
    const url = new URL(value)
    const host = url.hostname.toLowerCase()
    const google =
      host === 'www.google.com' || host === 'google.com' || host === 'maps.google.com'
    if (!google) return null
    const embedPath = url.pathname.startsWith('/maps/embed')
    const outputEmbed =
      url.pathname.startsWith('/maps') && url.searchParams.get('output') === 'embed'
    if (!embedPath && !outputEmbed) return null
    return url.toString()
  } catch {
    return null
  }
}

function parseGoogleMapsUrl(value: string): { query: string; openHref: string } | null {
  if (!/^https?:\/\//i.test(value)) return null
  try {
    const url = new URL(value)
    const host = url.hostname.toLowerCase().replace(/^www\./, '')
    const mapsHost =
      host === 'google.com' ||
      host.endsWith('.google.com') ||
      host === 'maps.app.goo.gl' ||
      host === 'goo.gl'
    if (!mapsHost) return null
    if (host === 'google.com' && !url.pathname.includes('/maps')) return null
    if (host.endsWith('.google.com') && host !== 'maps.google.com' && !url.pathname.includes('/maps')) {
      return null
    }

    const fromQuery = url.searchParams.get('q') || url.searchParams.get('query') || ''
    const at = url.pathname.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/)
    const place = decodeURIComponent(
      (url.pathname.split('/place/')[1] ?? '').split('/')[0] ?? ''
    ).replace(/\+/g, ' ')
    const query = fromQuery || (at ? `${at[1]},${at[2]}` : '') || place
    return { query: query.trim(), openHref: url.toString() }
  } catch {
    return null
  }
}
