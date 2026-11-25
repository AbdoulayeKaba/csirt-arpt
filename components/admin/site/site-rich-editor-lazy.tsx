'use client'

import dynamic from 'next/dynamic'

export const SiteRichEditor = dynamic(
  () => import('./site-rich-editor').then((m) => m.SiteRichEditor),
  {
    ssr: false,
    loading: () => (
      <div
        className="min-h-[12rem] animate-pulse rounded-md border border-border bg-muted/40"
        aria-busy="true"
        aria-label="Chargement de l’éditeur"
      />
    ),
  }
)
