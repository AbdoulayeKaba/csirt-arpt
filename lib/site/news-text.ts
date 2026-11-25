/** Décodage / nettoyage HTML léger pour textes publics. */
export function decodeHtmlEntities(value: string) {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, '$1')
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) =>
      String.fromCodePoint(Number.parseInt(hex, 16))
    )
    .replace(/&#(\d+);/g, (_, dec: string) => String.fromCodePoint(Number(dec)))
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Texte inutilisable comme chapô (srcset WP, URLs brutes, attributs HTML…). */
export function isJunkTeaserText(value: string) {
  const text = value.trim()
  if (!text) return true
  if (text.length < 28) return true
  if (/wp-content\/uploads|srcset|sizes\s*=|https?:\/\/\S+\.(?:jpg|jpeg|png|webp|gif)/i.test(text)) {
    return true
  }
  if (/\d+w\s*,\s*https?:\/\//i.test(text)) return true
  if (/^(ntent\/|t\/uploads\/|content\/uploads|,)/i.test(text)) return true
  if (/elementor|class\s*=|300px|100vw|grid-item|post-\d+/i.test(text)) return true
  const urlChars = (text.match(/https?:\/\//gi) || []).length
  if (urlChars >= 1 && text.length < 120) return true
  if (urlChars >= 2) return true
  // Trop de « bruit technique » vs lettres
  const letters = (text.match(/[A-Za-zÀ-ÿ]/g) || []).length
  if (letters < 24) return true
  return false
}

/** Nettoie un candidat de chapô (retire résidus d’attributs / URLs). */
export function cleanTeaserText(value: string, maxLen = 320) {
  let text = decodeHtmlEntities(value)
  text = text
    .replace(/https?:\/\/\S+/gi, ' ')
    .replace(/\b[\w./-]+\.(?:jpg|jpeg|png|webp|gif|svg)\b/gi, ' ')
    .replace(/\b\d+w\b/gi, ' ')
    .replace(/\bsizes?\s*=?\s*[^,]*/gi, ' ')
    .replace(/\b(?:max-width|min-width)\s*:\s*[^;)]+/gi, ' ')
    .replace(/\b(?:Lire plus|Lire la suite|En savoir plus)\s*»?/gi, ' ')
    .replace(/[<>"']+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  if (isJunkTeaserText(text)) return ''
  if (text.length <= maxLen) return text
  const cut = text.slice(0, maxLen)
  const lastSpace = cut.lastIndexOf(' ')
  return `${(lastSpace > 80 ? cut.slice(0, lastSpace) : cut).trim()}…`
}

/** Extrait court pour cartes / à la une (excerpt ou corps HTML). */
export function newsTeaserText(
  item: { excerpt?: string; bodyHtml?: string; title?: string },
  maxLen = 280
): string {
  const title = decodeHtmlEntities(item.title || '').trim()
  const candidates = [item.excerpt || '', item.bodyHtml || '']
  for (const raw of candidates) {
    let text = cleanTeaserText(raw, maxLen + 40)
    if (!text) continue
    if (title && text.toLowerCase().startsWith(title.toLowerCase())) {
      text = text.slice(title.length).replace(/^[\s:–—-]+/, '').trim()
      text = cleanTeaserText(text, maxLen)
    }
    if (!text || isJunkTeaserText(text)) continue
    if (text.length <= maxLen) return text
    const cut = text.slice(0, maxLen)
    const lastSpace = cut.lastIndexOf(' ')
    return `${(lastSpace > 80 ? cut.slice(0, lastSpace) : cut).trim()}…`
  }
  return ''
}
