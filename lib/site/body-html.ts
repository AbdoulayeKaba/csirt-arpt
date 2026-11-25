import { parseSiteBody } from '@/lib/site/rich-text-parse'

/** Détecte un corps déjà stocké en HTML (éditeur TipTap). */
export function isSiteHtmlBody(value: string): boolean {
  const trimmed = value.trim()
  return /^<(p|h[1-6]|ul|ol|li|blockquote|img|figure|div|hr|table)\b/i.test(trimmed)
}

/** Convertit l’ancien format markdown en HTML TipTap. */
export function siteBodyToEditorHtml(source: string): string {
  const text = source.trim()
  if (!text) return ''
  if (isSiteHtmlBody(text)) return text

  const blocks = parseSiteBody(text)
  if (!blocks.length) {
    return `<p>${escapeHtml(text)}</p>`
  }

  return blocks
    .map((block) => {
      if (block.type === 'h2') return `<h2>${escapeHtml(block.text)}</h2>`
      if (block.type === 'ul') {
        const items = block.items.map((item) => `<li><p>${escapeHtml(item)}</p></li>`).join('')
        return `<ul>${items}</ul>`
      }
      return `<p>${escapeHtml(block.text)}</p>`
    })
    .join('')
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
