import { CsirtInnerPage } from '@/components/csirt/csirt-inner-page'
import {
  CsirtPublicationsLibrary,
  type PubCategory,
  type PubFormat,
  type PublicationCard,
} from '@/components/csirt/csirt-publications-library'
import { findSitePage } from '@/lib/site/merge'
import { getSiteContent } from '@/lib/site/store'
import type { SitePage, SitePageDocument, SitePublicationCategory } from '@/lib/site/types'

export const metadata = {
  title: 'Publications — CSIRT-ARPT',
}

function formatBytes(size?: number) {
  if (!size || size <= 0) return ''
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} Ko`
  const mega = size / (1024 * 1024)
  return `${mega >= 10 ? Math.round(mega) : mega.toFixed(1).replace('.', ',')} Mo`
}

const STORED_CATEGORIES = new Set<SitePublicationCategory>([
  'alertes',
  'rapports',
  'guides',
  'reglementation',
  'notes',
  'procedures',
  'modeles',
  'sensibilisation',
])

function inferCategory(page: SitePage, doc: SitePageDocument): PubCategory {
  const blob = `${page.path} ${page.group} ${page.title} ${doc.title}`.toLowerCase()
  if (/alerte/.test(blob)) return 'alertes'
  if (/rapport|étude|etude/.test(blob)) return 'rapports'
  if (/guide|bonne pratique/.test(blob)) return 'guides'
  if (/réglement|reglement/.test(blob)) return 'reglementation'
  if (/procédure|procedure/.test(blob)) return 'procedures'
  if (/modèle|modele|formulaire/.test(blob)) return 'modeles'
  if (/sensibil/.test(blob)) return 'sensibilisation'
  if (/note/.test(blob)) return 'notes'
  if (page.group === 'Réglementations') return 'reglementation'
  if (page.group === 'Bonnes pratiques') return 'guides'
  if (page.group === 'Publications') return 'rapports'
  return 'notes'
}

function inferFormat(doc: SitePageDocument): PubFormat {
  const blob = `${doc.url} ${doc.mimeType || ''}`.toLowerCase()
  if (blob.includes('pdf')) return 'PDF'
  if (blob.includes('docx') || blob.includes('wordprocessing') || blob.includes('.doc')) return 'DOCX'
  if (blob.includes('xls') || blob.includes('spreadsheet')) return 'XLS'
  return 'AUTRE'
}

function collectDocuments(pages: SitePage[]): PublicationCard[] {
  const cards: PublicationCard[] = []
  for (const page of pages) {
    if (!page.published || !page.extensions?.documents) continue
    for (const doc of page.documents ?? []) {
      if (!doc.url?.trim()) continue
      const storedCategory = doc.category && STORED_CATEGORIES.has(doc.category) ? doc.category : null
      cards.push({
        id: `${page.path}:${doc.id}`,
        title: doc.title?.trim() || page.title,
        excerpt: doc.excerpt?.trim() || page.lead?.trim() || '',
        href: doc.url,
        category: storedCategory ?? inferCategory(page, doc),
        format: inferFormat(doc),
        sizeLabel: formatBytes(doc.size),
        dateIso: doc.dateIso?.slice(0, 10) || page.createdAt?.slice(0, 10),
        file: true,
      })
    }
  }
  return cards
}

export default async function PublicationsPage() {
  const site = await getSiteContent()
  const page = findSitePage(site, '/publications')

  return (
    <CsirtInnerPage variant="full">
      <CsirtPublicationsLibrary
        title={page?.title || 'Publications'}
        lead={page?.lead || 'Alertes, notes et documents de référence du CSIRT-ARPT.'}
        documents={collectDocuments(site.pages)}
      />
    </CsirtInnerPage>
  )
}
