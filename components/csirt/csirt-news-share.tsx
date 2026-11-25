'use client'

import { useEffect, useState } from 'react'
import { Facebook, Linkedin } from 'lucide-react'
import { CSIRT_BRAND } from '@/lib/csirt/brand'

function XMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path
        fill="currentColor"
        d="M14.7 10.3 21.2 3h-1.6l-5.6 6.4L9.6 3H4.8l7 10.1L4.8 21h1.6l6.1-7 4.8 7h4.8l-7.4-10.7ZM12.7 13.2l-.7-1-5.7-8h2.5l4.6 6.5.7 1 6 8.4h-2.5l-4.9-6.9Z"
      />
    </svg>
  )
}

function PinterestMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path
        fill="currentColor"
        d="M12.01 2C6.5 2 3 5.9 3 10.8c0 3.1 1.7 5.5 4.4 5.5.7 0 1.3-.4 1.5-1.1.1-.3.3-1 .4-1.3.1-.5 0-.7-.3-1.1-.7-.9-1.2-2-1.2-3.3 0-3.1 2.5-5.9 6.3-5.9 3.4 0 5.3 1.9 5.3 4.5 0 3.4-1.6 5.7-3.7 5.7-1.2 0-2-.9-1.7-2.1.3-1.3 1-2.7 1-3.6 0-.8-.5-1.5-1.4-1.5-1.1 0-2 1.1-2 2.7 0 1 .3 1.6.3 1.6L10.1 19c-.3 1.2-.1 3.1-.1 3.3 0 .2.3.2.4.1.1-.2 1.8-2.3 2.3-4.4.2-.6.8-2.9.8-2.9.4.8 1.6 1.5 2.9 1.5 3.8 0 6.4-3.3 6.4-7.5C22.8 5.4 18.4 2 12.01 2Z"
      />
    </svg>
  )
}

function toAbsoluteUrl(path: string, origin?: string) {
  const base = origin || `https://${CSIRT_BRAND.siteHost}`
  return new URL(path.startsWith('/') ? path : `/${path}`, base).toString()
}

const SHARE_NETWORKS = [
  {
    id: 'facebook',
    label: 'Facebook',
    className: 'is-facebook',
    build: (url: string) =>
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
    Icon: Facebook,
  },
  {
    id: 'twitter',
    label: 'X',
    className: 'is-twitter',
    build: (url: string, title: string) =>
      `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`,
    Icon: XMark,
  },
  {
    id: 'pinterest',
    label: 'Pinterest',
    className: 'is-pinterest',
    build: (url: string, title: string) =>
      `https://pinterest.com/pin/create/button/?url=${encodeURIComponent(url)}&description=${encodeURIComponent(title)}`,
    Icon: PinterestMark,
  },
  {
    id: 'linkedin',
    label: 'LinkedIn',
    className: 'is-linkedin',
    build: (url: string) =>
      `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
    Icon: Linkedin,
  },
] as const

export function CsirtNewsShare({
  path,
  title,
}: {
  path: string
  title: string
}) {
  const [origin, setOrigin] = useState<string | undefined>(undefined)

  useEffect(() => {
    setOrigin(window.location.origin)
  }, [])

  const shareUrl = toAbsoluteUrl(path, origin)

  return (
    <div className="csirt-news-share" aria-label="Partager cet article">
      <span className="csirt-news-share__label">Partager :</span>
      <ul className="csirt-news-share__list">
        {SHARE_NETWORKS.map(({ id, label, className, build, Icon }) => (
          <li key={id}>
            <a
              href={build(shareUrl, title)}
              className={`csirt-news-share__btn ${className}`}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Partager sur ${label}`}
            >
              <Icon className="h-4 w-4" />
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}
