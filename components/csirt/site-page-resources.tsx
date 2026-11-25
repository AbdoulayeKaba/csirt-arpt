'use client'

import { useMemo, useState } from 'react'
import { Download, FileText, Search } from 'lucide-react'
import {
  RESOURCE_CATEGORY_LABELS,
  RESOURCE_CATEGORY_OPTIONS,
} from '@/lib/site/resource-categories'
import type { SitePageDocument, SitePublicationCategory } from '@/lib/site/types'
import { cn } from '@/lib/utils'
import './site-page-catalog.css'

function formatBytes(size?: number) {
  if (!size || size <= 0) return ''
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} Ko`
  return `${(size / (1024 * 1024)).toFixed(1)} Mo`
}

function formatDate(iso?: string) {
  if (!iso) return ''
  const date = new Date(`${iso.slice(0, 10)}T12:00:00`)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

function labelOf(category?: SitePublicationCategory) {
  return category ? RESOURCE_CATEGORY_LABELS[category] : 'Sans catégorie'
}

export function SitePageResourceCatalog({
  title,
  lead,
  documents,
}: {
  title: string
  lead: string
  documents: readonly SitePageDocument[]
}) {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<'all' | SitePublicationCategory>('all')
  const [sort, setSort] = useState<'recent' | 'alpha'>('recent')

  const categories = useMemo(
    () =>
      RESOURCE_CATEGORY_OPTIONS.filter((item) =>
        documents.some((doc) => doc.category === item.id)
      ),
    [documents]
  )

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    const rows = documents.filter((doc) => {
      if (category !== 'all' && doc.category !== category) return false
      if (!needle) return true
      return [doc.title, doc.excerpt, labelOf(doc.category)].join(' ').toLowerCase().includes(needle)
    })
    rows.sort((a, b) => {
      if (sort === 'alpha') return a.title.localeCompare(b.title, 'fr')
      return (b.dateIso || '').localeCompare(a.dateIso || '') || a.title.localeCompare(b.title, 'fr')
    })
    return rows
  }, [category, documents, query, sort])

  return (
    <section className="page-catalog page-catalog--resources" aria-label={title}>
      <header className="page-catalog__head">
        <h1>{title}</h1>
        {lead ? <p>{lead}</p> : null}
      </header>
      <div className="page-resources">
        <aside className="page-resources__side" aria-label="Catégories">
          <p>Catégories</p>
          <button
            type="button"
            className={cn(category === 'all' && 'is-active')}
            onClick={() => setCategory('all')}
          >
            <span>Tous les documents</span>
            <em>{documents.length}</em>
          </button>
          {categories.map((item) => (
            <button
              key={item.id}
              type="button"
              className={cn(category === item.id && 'is-active')}
              onClick={() => setCategory(item.id)}
            >
              <span>{item.label}</span>
              <em>{documents.filter((doc) => doc.category === item.id).length}</em>
            </button>
          ))}
        </aside>

        <div className="page-resources__main">
          <form className="page-catalog__search" onSubmit={(event) => event.preventDefault()}>
            <label>
              <span className="sr-only">Rechercher un document</span>
              <Search aria-hidden />
              <input
                value={query}
                placeholder="Rechercher un document, un titre ou un mot-clé…"
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>
            <button type="submit">Rechercher</button>
          </form>
          <div className="page-catalog__bar">
            <h2>
              {filtered.length} document{filtered.length > 1 ? 's' : ''}
            </h2>
            <label>
              <span className="sr-only">Trier</span>
              <select value={sort} onChange={(event) => setSort(event.target.value as 'recent' | 'alpha')}>
                <option value="recent">Plus récent d’abord</option>
                <option value="alpha">Titre A → Z</option>
              </select>
            </label>
          </div>

          {filtered.length === 0 ? (
            <p className="page-catalog__empty">Aucun document ne correspond à cette sélection.</p>
          ) : (
            <ul className="page-catalog__grid page-catalog__grid--docs">
              {filtered.map((doc) => {
                const size = formatBytes(doc.size)
                const date = formatDate(doc.dateIso)
                return (
                  <li key={doc.id}>
                    <article className="page-doc">
                      <span className="page-doc__mark" aria-hidden>
                        <FileText />
                        <small>PDF</small>
                      </span>
                      <div>
                        <span className="page-video__tag">{labelOf(doc.category)}</span>
                        <strong>{doc.title}</strong>
                        {doc.excerpt ? <p>{doc.excerpt}</p> : null}
                        <footer>
                          {date ? <span>{date}</span> : null}
                          {size ? <span>{size}</span> : null}
                          <a href={doc.url} download>
                            <Download aria-hidden />
                            Télécharger
                          </a>
                        </footer>
                      </div>
                    </article>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>
    </section>
  )
}
