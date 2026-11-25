'use client'

import { useMemo, useState } from 'react'
import { Download, Expand, ExternalLink, FileText, Minimize2 } from 'lucide-react'
import type { SitePageDocument } from '@/lib/site/types'
import { cn } from '@/lib/utils'

function formatBytes(size?: number) {
  if (!size || size <= 0) return null
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} Ko`
  return `${(size / (1024 * 1024)).toFixed(1)} Mo`
}

function displayTitle(title: string, index: number) {
  const clean = title.trim()
  if (!clean) return `Document PDF ${index + 1}`
  if (/^(document|file|pdf)[-_][a-z0-9]{8,}$/i.test(clean)) {
    return `Document PDF ${index + 1}`
  }
  return clean.replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim()
}

export function SitePageDocuments({ documents }: { documents: SitePageDocument[] }) {
  const items = useMemo(
    () =>
      documents.map((doc, index) => ({
        ...doc,
        label: displayTitle(doc.title || '', index),
        sizeLabel: formatBytes(doc.size),
      })),
    [documents]
  )

  const [activeId, setActiveId] = useState(items[0]?.id ?? '')
  const [expanded, setExpanded] = useState(false)
  const active = items.find((item) => item.id === activeId) ?? items[0]

  if (!items.length || !active) return null

  const viewerSrc = `${active.url}#toolbar=1&navpanes=0&scrollbar=1&view=FitH`

  return (
    <section className="site-page-docs" aria-label="Documents PDF">
      <header className="site-page-docs__head">
        <div>
          <p className="site-page-docs__eyebrow">Ressources officielles</p>
          <h2>Documents</h2>
          <p>Lecture intégrée sur la plateforme CSIRT-ARPT — consultation et téléchargement.</p>
        </div>
        <span className="site-page-docs__count">
          {items.length} fichier{items.length > 1 ? 's' : ''}
        </span>
      </header>

      {items.length > 1 ? (
        <div className="site-pdf-tabs" role="tablist" aria-label="Choisir un document">
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={item.id === active.id}
              className={cn('site-pdf-tab', item.id === active.id && 'is-active')}
              onClick={() => setActiveId(item.id)}
            >
              <FileText className="h-3.5 w-3.5" aria-hidden />
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      ) : null}

      <article className={cn('site-pdf-card', expanded && 'is-expanded')}>
        <header className="site-pdf-card__bar">
          <div className="site-pdf-card__identity">
            <span className="site-pdf-card__icon" aria-hidden>
              <FileText className="h-4 w-4" />
            </span>
            <div>
              <strong>{active.label}</strong>
              <em>
                Format PDF
                {active.sizeLabel ? ` · ${active.sizeLabel}` : ''}
                {' · '}
                Affiché en ligne
              </em>
            </div>
          </div>
          <div className="site-pdf-card__actions">
            <button
              type="button"
              className="site-pdf-card__btn"
              onClick={() => setExpanded((value) => !value)}
              aria-pressed={expanded}
            >
              {expanded ? (
                <Minimize2 className="h-3.5 w-3.5" aria-hidden />
              ) : (
                <Expand className="h-3.5 w-3.5" aria-hidden />
              )}
              {expanded ? 'Réduire' : 'Agrandir'}
            </button>
            <a href={active.url} target="_blank" rel="noreferrer" className="site-pdf-card__btn">
              <ExternalLink className="h-3.5 w-3.5" aria-hidden />
              Nouvel onglet
            </a>
            <a href={active.url} download className="site-pdf-card__btn is-primary">
              <Download className="h-3.5 w-3.5" aria-hidden />
              Télécharger
            </a>
          </div>
        </header>

        <div className="site-pdf-frame-wrap">
          <iframe
            key={active.id}
            className="site-pdf-frame"
            src={viewerSrc}
            title={`Lecture PDF — ${active.label}`}
            loading="lazy"
          />
        </div>
      </article>
    </section>
  )
}
