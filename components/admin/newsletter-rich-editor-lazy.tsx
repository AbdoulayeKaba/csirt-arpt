'use client'

import dynamic from 'next/dynamic'

export const NewsletterRichEditor = dynamic(
  () => import('./newsletter-rich-editor').then((m) => m.NewsletterRichEditor),
  {
    ssr: false,
    loading: () => (
      <div
        className="min-h-[10rem] animate-pulse rounded-md border border-border bg-muted/40"
        aria-busy="true"
        aria-label="Chargement de l’éditeur"
      />
    ),
  }
)
