import DOMPurify from 'isomorphic-dompurify'

const BLOCK_TAGS =
  'figure|div|table|tbody|thead|tfoot|tr|th|td|ul|ol|li|blockquote|h1|h2|h3|h4|h5|h6|section|article|aside'

const PURIFY = {
  ALLOWED_TAGS: [
    'p',
    'br',
    'strong',
    'b',
    'em',
    'i',
    'u',
    's',
    'a',
    'ul',
    'ol',
    'li',
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'blockquote',
    'hr',
    'span',
    'mark',
    'code',
    'pre',
    'div',
    'section',
    'table',
    'thead',
    'tbody',
    'tfoot',
    'tr',
    'th',
    'td',
    'caption',
    'dl',
    'dt',
    'dd',
    'small',
    'sup',
    'sub',
  ],
  ALLOWED_ATTR: [
    'href',
    'target',
    'rel',
    'src',
    'alt',
    'title',
    'class',
    'colspan',
    'rowspan',
    'id',
  ],
  ALLOW_DATA_ATTR: false,
  FORBID_TAGS: ['html', 'head', 'body', 'script', 'style', 'iframe', 'form', 'input', 'button', 'img', 'picture', 'video', 'svg', 'source'],
} as const

/** Unwraps illegal block-level elements from inside <p> tags and balances HTML for SSR/DOM parity. */
export function normalizeArticleHtml(html: string) {
  if (!html) return ''
  let out = html.replace(/\r\n?/g, '\n').trim()
  out = out.replace(/<\/?(?:html|head|body)(?:\s[^>]*)?>/gi, '')

  out = out.replace(/<table(\s[^>]*)?>([\s\S]*?)<\/table>/gi, (_full, attrs = '', inner) => {
    let tableInner = inner.trim()
    if (!/<tbody\b/i.test(tableInner) && /<tr\b/i.test(tableInner)) {
      if (/<thead\b/i.test(tableInner)) {
        tableInner = tableInner.replace(
          /(<\/thead\s*>)([\s\S]*)$/i,
          (_m: string, th: string, rest: string) => `${th}<tbody>${rest}</tbody>`,
        )
      } else {
        tableInner = `<tbody>${tableInner}</tbody>`
      }
    }
    return `<table${attrs}>${tableInner}</table>`
  })

  const blockRegex = new RegExp(
    `<p(\\s[^>]*)?>([\\s\\S]*?)(<(${BLOCK_TAGS})\\b[\\s\\S]*?<\\/\\4>)([\\s\\S]*?)<\\/p>`,
    'gi',
  )

  let prev = ''
  let iterations = 0
  while (out !== prev && iterations < 10) {
    prev = out
    iterations++
    out = out.replace(blockRegex, (_m, _pAttrs, before, block, _tag, after) => {
      const beforeP = before.trim() ? `<p>${before.trim()}</p>` : ''
      const afterP = after.trim() ? `<p>${after.trim()}</p>` : ''
      return `${beforeP}${block}${afterP}`
    })
  }

  out = out.replace(/<p(\s[^>]*)?>\s*<\/p>/gi, '')

  let marked = false
  out = out.replace(/<p(\s[^>]*)?>([\s\S]*?)<\/p>/gi, (full, attrs = '', inner) => {
    if (marked) return full
    if (new RegExp(`<(${BLOCK_TAGS})\\b`, 'i').test(inner)) return full
    const text = String(inner)
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/gi, ' ')
      .trim()
    if (!text || text.length < 20) return full
    marked = true
    if (/\bis-dropcap\b/i.test(attrs)) return full
    if (/\bclass\s*=/.test(attrs)) {
      return full.replace(/class\s*=\s*(["'])(.*?)\1/i, (_m, q: string, cls: string) => {
        return `class=${q}${cls} is-dropcap${q}`
      })
    }
    const rest = String(attrs).trim()
    return `<p class="is-dropcap"${rest ? ` ${rest}` : ''}>${inner}</p>`
  })

  return DOMPurify.sanitize(out, PURIFY)
}

export function CsirtNewsProse({
  html,
  className,
}: {
  html: string
  className?: string
}) {
  const normalized = normalizeArticleHtml(html)
  return <div className={className} dangerouslySetInnerHTML={{ __html: normalized }} />
}
