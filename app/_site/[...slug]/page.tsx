import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { SiteManagedPage } from '@/components/csirt/site-managed-page'
import { findSitePage } from '@/lib/site/merge'
import { isArchivedFlag } from '@/lib/site/news-sources'
import { getSiteContent } from '@/lib/site/store'

type Props = {
  params: Promise<{ slug: string[] }>
}

function sitePathFromSlug(slug: string[]) {
  const parts = slug.map((part) => decodeURIComponent(part)).filter(Boolean)
  if (!parts.length) return '/'
  return `/${parts.join('/')}`
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const path = sitePathFromSlug(slug)
  const page = findSitePage(await getSiteContent(), path)
  if (!page || !page.published || isArchivedFlag(page)) {
    return { title: 'Page introuvable — CSIRT-ARPT' }
  }
  return {
    title: `${page.title} — CSIRT-ARPT`,
    description: page.lead || undefined,
  }
}

/**
 * Catch-all interne pour les pages éditoriales (ex. /test).
 * Atteint via rewrite middleware `/x` → `/_site/x` afin de ne jamais
 * concurrencer `/api/*`, `/dg/*`, etc.
 */
export default async function SiteCatchAllPage({ params }: Props) {
  const { slug } = await params
  const path = sitePathFromSlug(slug)
  const page = findSitePage(await getSiteContent(), path)

  if (!page || !page.published || isArchivedFlag(page)) {
    notFound()
  }

  return <SiteManagedPage path={path} />
}
