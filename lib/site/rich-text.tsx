import type { ReactNode } from 'react'
import DOMPurify from 'isomorphic-dompurify'
import { isSiteHtmlBody } from '@/lib/site/body-html'
import { parseSiteBody } from '@/lib/site/rich-text-parse'

const ALLOWED_TAGS = [
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
  'blockquote',
  'hr',
  'img',
  'span',
  'mark',
  'code',
  'pre',
]

const ALLOWED_ATTR = ['href', 'target', 'rel', 'src', 'alt', 'title', 'class']
const FORBID_TAGS = ['script', 'style', 'iframe', 'object', 'embed', 'form', 'svg']

export { parseSiteBody } from '@/lib/site/rich-text-parse'

export function SiteRichText({ value }: { value: string }): ReactNode {
  const text = value.trim()
  if (!text) return null

  if (isSiteHtmlBody(text)) {
    const clean = DOMPurify.sanitize(text, {
      ALLOWED_TAGS,
      ALLOWED_ATTR,
      FORBID_TAGS,
      ALLOW_DATA_ATTR: false,
    })
    return <div className="site-prose" dangerouslySetInnerHTML={{ __html: clean }} />
  }

  const blocks = parseSiteBody(text)
  if (blocks.length === 0) return null

  return (
    <div className="site-prose">
      {blocks.map((block, index) => {
        if (block.type === 'h2') {
          return (
            <h2 key={`h-${index}`} id={block.id}>
              {block.text}
            </h2>
          )
        }
        if (block.type === 'ul') {
          return (
            <ul key={`l-${index}`}>
              {block.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          )
        }
        return <p key={`p-${index}`}>{block.text}</p>
      })}
    </div>
  )
}
