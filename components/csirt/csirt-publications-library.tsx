'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import {
  ArrowRight,
  BarChart3,
  Bell,
  BookOpen,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Download,
  FileText,
  Mail,
  Scale,
  Search,
  Settings,
  Shield,
  Users,
} from 'lucide-react'
import { CsirtNewsletterModal } from '@/components/csirt/csirt-newsletter-modal'
import { useCsirtLocale } from '@/components/csirt/csirt-locale-provider'
import type { Language } from '@/lib/types'
import './csirt-publications-library.css'

export const PUB_CATEGORIES = [
  'alertes',
  'rapports',
  'guides',
  'reglementation',
  'notes',
  'procedures',
  'modeles',
  'sensibilisation',
] as const

export type PubCategory = (typeof PUB_CATEGORIES)[number]
export type PubFormat = 'PDF' | 'DOCX' | 'XLS' | 'AUTRE'

export type PublicationCard = {
  id: string
  title: string
  excerpt: string
  href: string
  category: PubCategory
  format: PubFormat
  sizeLabel: string
  dateIso?: string
  file: boolean
}

const PAGE_SIZES = [8, 16] as const

const CATEGORY_ICON = {
  alertes: Bell,
  rapports: BarChart3,
  guides: BookOpen,
  reglementation: Scale,
  notes: FileText,
  procedures: Settings,
  modeles: ClipboardList,
  sensibilisation: Users,
} as const

const COPY = {
  fr: {
    home: 'Accueil',
    search: 'Rechercher un document, un thème, un mot-clé…',
    searchBtn: 'Rechercher',
    sublead:
      'Retrouvez ici les alertes de sécurité, les rapports, guides, bonnes pratiques et l’ensemble des ressources du CSIRT-ARPT pour renforcer la sécurité numérique.',
    allCategories: 'Toutes les catégories',
    allDates: 'Toutes les dates',
    allFormats: 'Tous les formats',
    allAudiences: 'Tous les publics',
    latest: 'Dernières publications',
    seeAll: 'Voir toutes',
    empty: 'Aucun document ne correspond à ces critères.',
    range: 'Affichage de {from} à {to} sur {total} documents',
    perPage: '{n} par page',
    prev: 'Page précédente',
    next: 'Page suivante',
    download: 'Télécharger',
    categoriesTitle: 'Catégories',
    popular: 'Documents les plus consultés',
    stayTitle: 'Restez informé',
    stayLead: 'Recevez les nouvelles publications du CSIRT-ARPT.',
    stayCta: 'S’abonner aux publications',
    categories: {
      alertes: 'Alertes de sécurité',
      rapports: 'Rapports et études',
      guides: 'Guides et bonnes pratiques',
      reglementation: 'Réglementation',
      notes: 'Notes et recommandations',
      procedures: 'Procédures',
      modeles: 'Modèles et formulaires',
      sensibilisation: 'Sensibilisation',
    } satisfies Record<PubCategory, string>,
    badges: {
      alertes: 'Alerte',
      rapports: 'Rapport',
      guides: 'Guide',
      reglementation: 'Réglementation',
      notes: 'Note',
      procedures: 'Procédure',
      modeles: 'Modèle',
      sensibilisation: 'Sensibilisation',
    } satisfies Record<PubCategory, string>,
  },
  en: {
    home: 'Home',
    search: 'Search a document, a topic, a keyword…',
    searchBtn: 'Search',
    sublead: 'Security alerts, reports, guides and reference documents from CSIRT-ARPT.',
    allCategories: 'All categories',
    allDates: 'All dates',
    allFormats: 'All formats',
    allAudiences: 'All audiences',
    latest: 'Latest publications',
    seeAll: 'See all',
    empty: 'No document matches these filters.',
    range: 'Showing {from} to {to} of {total} documents',
    perPage: '{n} per page',
    prev: 'Previous page',
    next: 'Next page',
    download: 'Download',
    categoriesTitle: 'Categories',
    popular: 'Most consulted documents',
    stayTitle: 'Stay informed',
    stayLead: 'Receive new CSIRT-ARPT publications.',
    stayCta: 'Subscribe to publications',
    categories: {
      alertes: 'Security alerts',
      rapports: 'Reports and studies',
      guides: 'Guides and best practices',
      reglementation: 'Regulation',
      notes: 'Notes and recommendations',
      procedures: 'Procedures',
      modeles: 'Templates and forms',
      sensibilisation: 'Awareness',
    } satisfies Record<PubCategory, string>,
    badges: {
      alertes: 'Alert',
      rapports: 'Report',
      guides: 'Guide',
      reglementation: 'Regulation',
      notes: 'Note',
      procedures: 'Procedure',
      modeles: 'Template',
      sensibilisation: 'Awareness',
    } satisfies Record<PubCategory, string>,
  },
} as const

function downloadName(item: PublicationCard) {
  const base = item.title.replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '') || 'document'
  const ext = item.format === 'PDF' ? 'pdf' : item.format === 'DOCX' ? 'docx' : item.format === 'XLS' ? 'xlsx' : ''
  return ext ? `${base}.${ext}` : base
}

function formatDate(iso: string | undefined, language: Language) {
  if (!iso) return ''
  const date = new Date(`${iso}T12:00:00`)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat(language === 'en' ? 'en-GB' : 'fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

function pagerTokens(count: number, current: number) {
  if (count <= 7) return Array.from({ length: count }, (_, index) => index)
  const keep = new Set([0, count - 1, current, current - 1, current + 1].filter((n) => n >= 0 && n < count))
  const sorted = [...keep].sort((a, b) => a - b)
  const tokens: Array<number | 'gap'> = []
  sorted.forEach((page, index) => {
    if (index > 0 && page - sorted[index - 1]! > 1) tokens.push('gap')
    tokens.push(page)
  })
  return tokens
}

export function CsirtPublicationsLibrary({
  title,
  lead,
  documents,
}: {
  title: string
  lead: string
  documents: PublicationCard[]
}) {
  const { language } = useCsirtLocale()
  const text = COPY[language]
  const catalog = useMemo(
    () => [...documents].sort((a, b) => (b.dateIso || '').localeCompare(a.dateIso || '')),
    [documents],
  )
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<'all' | PubCategory>('all')
  const [year, setYear] = useState('all')
  const [format, setFormat] = useState<'all' | PubFormat>('all')
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZES)[number]>(8)

  const years = useMemo(() => {
    const values = new Set<string>()
    catalog.forEach((item) => {
      if (item.dateIso) values.add(item.dateIso.slice(0, 4))
    })
    return [...values].sort((a, b) => b.localeCompare(a))
  }, [catalog])

  const formats = useMemo(() => {
    const values = new Set<PubFormat>()
    catalog.forEach((item) => values.add(item.format))
    return [...values]
  }, [catalog])

  const counts = useMemo(() => {
    const map = Object.fromEntries(PUB_CATEGORIES.map((id) => [id, 0])) as Record<PubCategory, number>
    catalog.forEach((item) => {
      map[item.category] += 1
    })
    return map
  }, [catalog])

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return catalog.filter((item) => {
      if (category !== 'all' && item.category !== category) return false
      if (year !== 'all' && item.dateIso?.slice(0, 4) !== year) return false
      if (format !== 'all' && item.format !== format) return false
      if (!needle) return true
      return [item.title, item.excerpt, text.categories[item.category]].join(' ').toLowerCase().includes(needle)
    })
  }, [catalog, category, format, query, text.categories, year])

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize))
  const safePage = Math.min(page, pageCount - 1)
  const rows = filtered.slice(safePage * pageSize, safePage * pageSize + pageSize)
  const rangeStart = filtered.length === 0 ? 0 : safePage * pageSize + 1
  const rangeEnd = safePage * pageSize + rows.length
  const popular = catalog.slice(0, 5)

  function showAll() {
    setQuery('')
    setCategory('all')
    setYear('all')
    setFormat('all')
    setPage(0)
  }

  return (
    <div className="pubs">
      <header className="pubs-hero">
        <div className="pubs-hero__inner">
          <div>
            <nav className="pubs-crumb" aria-label="Fil d’Ariane">
              <Link href="/">{text.home}</Link>
              <ChevronRight aria-hidden />
              <span>{title}</span>
            </nav>
            <h1>
              {/^publications$/i.test(title.trim()) ? (
                <>
                  Publica<span>tions</span>
                </>
              ) : (
                title
              )}
            </h1>
            {lead ? <p className="pubs-hero__lead">{lead}</p> : null}
            <p className="pubs-hero__sub">{text.sublead}</p>
            <form
              className="pubs-search"
              onSubmit={(event) => {
                event.preventDefault()
                setPage(0)
              }}
            >
              <label>
                <span className="sr-only">{text.search}</span>
                <Search aria-hidden />
                <input
                  value={query}
                  placeholder={text.search}
                  onChange={(event) => {
                    setQuery(event.target.value)
                    setPage(0)
                  }}
                />
              </label>
              <button type="submit">
                {text.searchBtn}
                <ArrowRight aria-hidden />
              </button>
            </form>
          </div>
          <div className="pubs-mark" aria-hidden>
            <span className="pubs-mark__sheet is-back" />
            <span className="pubs-mark__sheet" />
            <span className="pubs-mark__shield">
              <Shield />
            </span>
          </div>
        </div>
      </header>

      <div className="pubs-layout">
        <div className="pubs-main">
          <div className="pubs-filters">
            <label>
              <span className="sr-only">{text.allCategories}</span>
              <select
                value={category}
                onChange={(event) => {
                  setCategory(event.target.value as 'all' | PubCategory)
                  setPage(0)
                }}
              >
                <option value="all">{text.allCategories}</option>
                {PUB_CATEGORIES.map((id) => (
                  <option key={id} value={id}>
                    {text.categories[id]}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="sr-only">{text.allDates}</span>
              <select
                value={year}
                onChange={(event) => {
                  setYear(event.target.value)
                  setPage(0)
                }}
              >
                <option value="all">{text.allDates}</option>
                {years.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="sr-only">{text.allFormats}</span>
              <select
                value={format}
                onChange={(event) => {
                  setFormat(event.target.value as 'all' | PubFormat)
                  setPage(0)
                }}
              >
                <option value="all">{text.allFormats}</option>
                {formats.map((value) => (
                  <option key={value} value={value}>
                    {value === 'AUTRE' ? (language === 'en' ? 'Other' : 'Autre') : value}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="sr-only">{text.allAudiences}</span>
              <select defaultValue="all" aria-label={text.allAudiences}>
                <option value="all">{text.allAudiences}</option>
              </select>
            </label>
          </div>

          <div className="pubs-head">
            <h2>{text.latest}</h2>
          </div>

          {rows.length === 0 ? (
            <p className="pubs-empty">{text.empty}</p>
          ) : (
            <ul className="pubs-grid">
              {rows.map((item) => {
                const Icon = CATEGORY_ICON[item.category]
                const date = formatDate(item.dateIso, language)
                return (
                  <li key={item.id}>
                    <article className={`pubs-card is-${item.category}`}>
                      <a
                        className="pubs-card__hit"
                        href={item.href}
                        {...(item.href.startsWith('/') ? {} : { target: '_blank', rel: 'noreferrer' })}
                      >
                        <span className="pubs-card__visual">
                          <span className="pubs-card__badge">{text.badges[item.category]}</span>
                          {item.format !== 'AUTRE' ? <span className="pubs-card__file">{item.format}</span> : null}
                          <Icon aria-hidden />
                        </span>
                        <span className="pubs-card__body">
                          <strong>{item.title}</strong>
                          {item.excerpt ? <small>{item.excerpt}</small> : null}
                          <span className="pubs-card__meta">
                            {date ? (
                              <time dateTime={item.dateIso}>
                                <Calendar aria-hidden />
                                {date}
                              </time>
                            ) : (
                              <span />
                            )}
                            {item.sizeLabel ? <span>{item.sizeLabel}</span> : null}
                          </span>
                        </span>
                      </a>
                      {item.file ? (
                        <a
                          className="pubs-card__down"
                          href={item.href}
                          download={downloadName(item)}
                          aria-label={`${text.download} ${item.title}`}
                        >
                          <Download aria-hidden />
                        </a>
                      ) : null}
                    </article>
                  </li>
                )
              })}
            </ul>
          )}

          {filtered.length > 0 ? (
            <div className="pubs-foot">
              <p>
                {text.range
                  .replace('{from}', String(rangeStart))
                  .replace('{to}', String(rangeEnd))
                  .replace('{total}', String(filtered.length))}
              </p>
              {pageCount > 1 ? (
                <nav className="pubs-pager" aria-label="Pagination">
                  <button type="button" aria-label={text.prev} disabled={safePage === 0} onClick={() => setPage((current) => Math.max(0, current - 1))}>
                    <ChevronLeft aria-hidden />
                  </button>
                  {pagerTokens(pageCount, safePage).map((token, index) =>
                    token === 'gap' ? (
                      <span key={`gap-${index}`} aria-hidden>
                        …
                      </span>
                    ) : (
                      <button
                        key={token}
                        type="button"
                        className={token === safePage ? 'is-current' : undefined}
                        aria-current={token === safePage ? 'page' : undefined}
                        aria-label={`Page ${token + 1}`}
                        onClick={() => setPage(token)}
                      >
                        {token + 1}
                      </button>
                    ),
                  )}
                  <button
                    type="button"
                    aria-label={text.next}
                    disabled={safePage >= pageCount - 1}
                    onClick={() => setPage((current) => Math.min(pageCount - 1, current + 1))}
                  >
                    <ChevronRight aria-hidden />
                  </button>
                </nav>
              ) : (
                <span />
              )}
              <label className="pubs-size">
                <span className="sr-only">{text.perPage.replace('{n}', String(pageSize))}</span>
                <select
                  value={pageSize}
                  onChange={(event) => {
                    setPageSize(Number(event.target.value) as (typeof PAGE_SIZES)[number])
                    setPage(0)
                  }}
                >
                  {PAGE_SIZES.map((size) => (
                    <option key={size} value={size}>
                      {text.perPage.replace('{n}', String(size))}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          ) : null}
        </div>

        <aside className="pubs-side">
          <section className="pubs-panel" aria-labelledby="pubs-cats">
            <div className="pubs-panel__head">
              <h2 id="pubs-cats">{text.categoriesTitle}</h2>
              <button type="button" onClick={showAll}>
                {text.seeAll}
              </button>
            </div>
            <ul>
              {PUB_CATEGORIES.map((id) => {
                const Icon = CATEGORY_ICON[id]
                return (
                  <li key={id}>
                    <button
                      type="button"
                      className={category === id ? 'is-current' : undefined}
                      onClick={() => {
                        setCategory(id)
                        setPage(0)
                      }}
                    >
                      <Icon aria-hidden />
                      <span>{text.categories[id]}</span>
                      <b>{counts[id]}</b>
                    </button>
                  </li>
                )
              })}
            </ul>
          </section>

          {popular.length > 0 ? (
            <section className="pubs-panel" aria-labelledby="pubs-popular">
              <h2 id="pubs-popular">{text.popular}</h2>
              <ol className="pubs-rank">
                {popular.map((item, index) => (
                  <li key={item.id}>
                    <a
                      href={item.href}
                      download={item.file ? downloadName(item) : undefined}
                      {...(item.href.startsWith('/') ? {} : { target: '_blank', rel: 'noreferrer' })}
                    >
                      <em>{index + 1}</em>
                      <span>{item.title}</span>
                      {item.sizeLabel ? <small>{item.sizeLabel}</small> : null}
                    </a>
                  </li>
                ))}
              </ol>
            </section>
          ) : null}

          <section className="pubs-stay">
            <span aria-hidden>
              <Mail />
            </span>
            <strong>{text.stayTitle}</strong>
            <p>{text.stayLead}</p>
            <CsirtNewsletterModal
              title={text.stayCta}
              description={text.stayLead}
              trigger={<button type="button">{text.stayCta}</button>}
            />
          </section>
        </aside>
      </div>
    </div>
  )
}
