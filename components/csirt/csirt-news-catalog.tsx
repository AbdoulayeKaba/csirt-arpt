'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowRight,
  ArrowUpDown,
  BellRing,
  CalendarDays,
  FileText,
  Info,
  Layers,
  LayoutGrid,
  Newspaper,
  Radar,
  RotateCcw,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  TriangleAlert,
} from 'lucide-react'
import { CsirtNewsThumbnail } from '@/components/csirt/csirt-news-thumbnail'
import { CsirtNewsletterModal } from '@/components/csirt/csirt-newsletter-modal'
import { monthLabelFromKey } from '@/lib/csirt/localize-public'
import { CSIRT_SIGNALEMENT_HREF } from '@/lib/csirt/nav'
import type { CsirtNewsItem } from '@/lib/csirt/home-content'
import {
  HOME_TOPIC_INTROS_FR,
  isAlertNewsCategory,
  newsCategoryLabel,
  normalizeSiteNewsCategory,
  resolveNewsTopics,
  type SiteNewsTopic,
} from '@/lib/site/news-sources'
import { newsTeaserText } from '@/lib/site/news-text'
import { cn } from '@/lib/utils'
import '@/components/csirt/csirt-news-catalog.css'

const PAGE_SIZE = 7
const REF_CODE = /(?:CERT|CSIRT)[-A-Z]{0,8}-\d{4}-[A-Z]{2,5}-\d+/i
const DATE_IN_TITLE = /\(\s*\d{1,2}\s+[A-Za-zÀ-ÿ.]+\s+\d{4}\s*\)/g
const CVE_CODE = /CVE-\d{4}-\d{4,}/gi
const PRODUCT_TAGS = [
  'Apache Tomcat',
  'Microsoft Windows',
  'Oracle PeopleSoft',
  'Oracle MySQL',
  'FortiGate',
  'Fortinet',
  'NetWeaver',
  'Roundcube',
  'PeopleSoft',
  'Windows',
  'Tomcat',
  'Splunk',
  'MySQL',
  'Oracle',
  'SPIP',
  'Moxa',
  'SAP',
] as const

const PILLARS = [
  {
    icon: Radar,
    title: 'Veille et anticipation',
    text: 'Identifier les menaces émergentes',
  },
  {
    icon: ShieldAlert,
    title: 'Réponse rapide',
    text: 'Partager les informations critiques',
  },
  {
    icon: ShieldCheck,
    title: 'Renforcement de la résilience',
    text: 'Protéger le secteur numérique',
  },
] as const

function publicationRef(item: CsirtNewsItem) {
  const blob = [item.externalHref, item.title, item.excerpt, item.bodyHtml].filter(Boolean).join(' ')
  const match = blob.match(REF_CODE)
  return match ? match[0].toUpperCase() : null
}

function publicationTitle(item: CsirtNewsItem, ref: string | null) {
  let title = item.title
  if (ref) title = title.replace(new RegExp(ref.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'), '')
  title = title.replace(DATE_IN_TITLE, '')
  return title.replace(/^[\s–—:|.-]+|[\s–—:|.-]+$/g, '').replace(/\s{2,}/g, ' ').trim() || item.title
}

function addUniqueTag(tags: string[], value: string) {
  const next = value.trim()
  if (!next) return
  const lower = next.toLowerCase()
  if (tags.some((tag) => tag.toLowerCase() === lower)) return
  tags.push(next)
}

function publicationTags(item: CsirtNewsItem, title: string) {
  const blob = `${title} ${item.excerpt} ${item.bodyHtml ?? ''} ${item.externalHref ?? ''}`
  const tags: string[] = []
  for (const product of PRODUCT_TAGS) {
    const pattern = new RegExp(`\\b${product.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i')
    if (!pattern.test(blob)) continue
    const label =
      product === 'Apache Tomcat' ? 'Tomcat' : product === 'Microsoft Windows' ? 'Windows' : product
    addUniqueTag(tags, label)
    if (tags.length >= 3) break
  }
  const cve = blob.match(CVE_CODE)?.[0]
  if (cve) addUniqueTag(tags, cve.toUpperCase())
  if (/roundcube|webmail/i.test(blob)) addUniqueTag(tags, 'Webmail')
  if (/post-exploitation/i.test(blob)) addUniqueTag(tags, 'Post-exploitation')
  else if (/preuve de concept|\bexploit/i.test(blob)) addUniqueTag(tags, 'Exploitation')
  if (/fortinet|fortigate|réseau|vpn|firewall/i.test(blob)) addUniqueTag(tags, 'Réseau')
  if (/sap|application|netweaver/i.test(blob)) addUniqueTag(tags, 'Application')
  if (/menace|threat/i.test(blob)) addUniqueTag(tags, 'Menace')
  if (/\bcve\b|alerte/i.test(blob) && !tags.some((tag) => /^CVE-/i.test(tag))) addUniqueTag(tags, 'CVE')
  return tags.slice(0, 4)
}

function monthKey(isoDate: string) {
  return isoDate.slice(0, 7)
}

function sortItems(list: CsirtNewsItem[], sort: 'desc' | 'asc') {
  return [...list].sort((a, b) => {
    if (sort === 'desc') {
      const enabled =
        (Date.parse(b.enabledAt ?? '') || 0) - (Date.parse(a.enabledAt ?? '') || 0)
      if (enabled !== 0) return enabled
      return (Date.parse(b.date) || 0) - (Date.parse(a.date) || 0)
    }
    return (Date.parse(a.date) || 0) - (Date.parse(b.date) || 0)
  })
}

function categoryIcon(id: string): ReactNode {
  const size = 16
  if (id === 'all') return <LayoutGrid size={size} strokeWidth={2.2} />
  if (id === 'ALERTES_SECURITE') return <TriangleAlert size={size} strokeWidth={2.2} />
  if (id === 'MENACES_INCIDENTS') return <Shield size={size} strokeWidth={2.2} />
  if (id === 'AVIS_SECURITE') return <ShieldAlert size={size} strokeWidth={2.2} />
  if (id === 'IOC') return <Radar size={size} strokeWidth={2.2} />
  if (id === 'DURCISSEMENT') return <ShieldCheck size={size} strokeWidth={2.2} />
  if (id === 'BULLETINS') return <Newspaper size={size} strokeWidth={2.2} />
  return <FileText size={size} strokeWidth={2.2} />
}

function splitHeading(label: string) {
  const parts = label.trim().split(/\s+/)
  if (parts.length < 2) return { lead: label, accent: '' }
  return { lead: parts.slice(0, -1).join(' '), accent: parts[parts.length - 1] }
}

export function CsirtNewsCatalog({
  title,
  lead,
  items,
  topics,
  activeId,
}: {
  title: string
  lead?: string
  items: readonly CsirtNewsItem[]
  topics?: readonly SiteNewsTopic[] | null
  activeId?: string
}) {
  const router = useRouter()
  const topicList = useMemo(() => resolveNewsTopics(topics), [topics])
  const [category, setCategory] = useState(activeId?.trim() || 'all')
  const [month, setMonth] = useState('all')
  const [sort, setSort] = useState<'desc' | 'asc'>('desc')
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(0)
  const search = query.trim().toLowerCase()

  useEffect(() => {
    setCategory(activeId?.trim() || 'all')
    setPage(0)
  }, [activeId])

  const counts = useMemo(() => {
    const map = new Map<string, number>()
    for (const item of items) {
      const id = normalizeSiteNewsCategory(item.category, topicList)
      map.set(id, (map.get(id) ?? 0) + 1)
    }
    return map
  }, [items, topicList])

  const monthOptions = useMemo(() => {
    const map = new Map<string, number>()
    for (const item of items) {
      if (category !== 'all') {
        const id = normalizeSiteNewsCategory(item.category, topicList)
        if (id !== category && item.category !== category) continue
      }
      const key = monthKey(item.date)
      if (key.length < 7) continue
      map.set(key, (map.get(key) ?? 0) + 1)
    }
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]))
  }, [category, items, topicList])

  const filtered = useMemo(() => {
    const rows = items.filter((item) => {
      const id = normalizeSiteNewsCategory(item.category, topicList)
      if (category !== 'all' && id !== category && item.category !== category) return false
      if (month !== 'all' && monthKey(item.date) !== month) return false
      if (!search) return true
      const ref = publicationRef(item)
      const heading = publicationTitle(item, ref)
      const tags = publicationTags(item, heading)
      const hay = [heading, item.excerpt, item.bodyHtml, ref, tags.join(' '), item.dateShort]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return hay.includes(search)
    })
    return sortItems(rows, sort)
  }, [category, items, month, search, sort, topicList])

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, pageCount - 1)
  const from = safePage * PAGE_SIZE
  const rows = filtered.slice(from, from + PAGE_SIZE)

  const activeTopic =
    category === 'all' ? null : topicList.find((topic) => topic.id === category) ?? null
  const headingSource = activeTopic?.label || title
  const heading = splitHeading(headingSource)
  const intro = activeTopic
    ? HOME_TOPIC_INTROS_FR[activeTopic.id] ?? lead
    : lead

  function goCategory(next: string) {
    setCategory(next)
    setPage(0)
    const href = next === 'all' ? '/actualites' : `/actualites?categorie=${encodeURIComponent(next)}`
    router.replace(href, { scroll: false })
  }

  function resetFilters() {
    setQuery('')
    setMonth('all')
    setSort('desc')
    setPage(0)
    goCategory('all')
  }

  const filteredActive = category !== 'all' || month !== 'all' || sort !== 'desc' || search.length > 0

  return (
    <div className="csirt-catalog">
      <header className="csirt-catalog__hero">
        <div className="csirt-catalog__hero-copy">
          <p className="csirt-catalog__kicker">
            <span aria-hidden />
            CSIRT-ARPT
          </p>
          <h1>
            {heading.accent ? (
              <>
                {heading.lead} <em>{heading.accent}</em>
              </>
            ) : (
              heading.lead
            )}
          </h1>
          {intro ? <p className="csirt-catalog__lead">{intro}</p> : null}
          <ul className="csirt-catalog__pillars">
            {PILLARS.map((pillar) => (
              <li key={pillar.title}>
                <span aria-hidden>
                  <pillar.icon size={18} strokeWidth={2.1} />
                </span>
                <div>
                  <strong>{pillar.title}</strong>
                  <small>{pillar.text}</small>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <div className="csirt-catalog__hero-art" aria-hidden>
          <Shield size={220} strokeWidth={1.05} />
        </div>
      </header>

      <form
        className="csirt-catalog__toolbar"
        role="search"
        aria-label="Filtrer les publications"
        onSubmit={(event) => event.preventDefault()}
      >
        <label className="csirt-catalog__search">
          <Search size={16} strokeWidth={2.2} aria-hidden />
          <span className="sr-only">Rechercher</span>
          <input
            type="search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value)
              setPage(0)
            }}
            placeholder="Rechercher une alerte, un CVE, un produit, une technologie…"
          />
        </label>
        <button type="submit" className="csirt-catalog__search-btn">
          Rechercher
        </button>
        <label className="csirt-catalog__select">
          <span>
            <Layers size={14} strokeWidth={2.2} aria-hidden />
            Catégorie
          </span>
          <select
            value={category}
            onChange={(event) => goCategory(event.target.value)}
          >
            <option value="all">Toutes les catégories</option>
            {topicList.map((topic) => (
              <option key={topic.id} value={topic.id}>
                {topic.label} ({counts.get(topic.id) ?? 0})
              </option>
            ))}
          </select>
        </label>
        <label className="csirt-catalog__select">
          <span>
            <CalendarDays size={14} strokeWidth={2.2} aria-hidden />
            Date de publication
          </span>
          <select
            value={month}
            onChange={(event) => {
              setMonth(event.target.value)
              setPage(0)
            }}
          >
            <option value="all">Toutes les dates</option>
            {monthOptions.map(([key, count]) => (
              <option key={key} value={key}>
                {monthLabelFromKey(key, 'fr')} ({count})
              </option>
            ))}
          </select>
        </label>
        <label className="csirt-catalog__select">
          <span>
            <ArrowUpDown size={14} strokeWidth={2.2} aria-hidden />
            Trier par
          </span>
          <select
            value={sort}
            onChange={(event) => {
              setSort(event.target.value as 'desc' | 'asc')
              setPage(0)
            }}
          >
            <option value="desc">Plus récent → ancien</option>
            <option value="asc">Plus ancien → récent</option>
          </select>
        </label>
        <button
          type="button"
          className="csirt-catalog__reset"
          onClick={resetFilters}
          disabled={!filteredActive}
        >
          <RotateCcw size={15} strokeWidth={2.2} aria-hidden />
          Réinitialiser
        </button>
      </form>

      <div className="csirt-catalog__layout">
        <aside className="csirt-catalog__aside" aria-labelledby="csirt-catalog-cats">
          <h2 id="csirt-catalog-cats">Catégories</h2>
          <ul>
            <li>
              <button
                type="button"
                className={cn(category === 'all' && 'is-active')}
                onClick={() => goCategory('all')}
              >
                <span>
                  {categoryIcon('all')}
                  Toutes les catégories
                </span>
                <em>{items.length}</em>
              </button>
            </li>
            {topicList.map((topic) => (
              <li key={topic.id}>
                <button
                  type="button"
                  className={cn(category === topic.id && 'is-active', topic.tone === 'alert' && 'is-alert')}
                  onClick={() => goCategory(topic.id)}
                >
                  <span>
                    {categoryIcon(topic.id)}
                    {topic.label}
                  </span>
                  <em>{counts.get(topic.id) ?? 0}</em>
                </button>
              </li>
            ))}
          </ul>

          <div className="csirt-catalog__subscribe">
            <span className="csirt-catalog__subscribe-mark" aria-hidden>
              <ShieldAlert size={22} strokeWidth={2} />
            </span>
            <p>Restez informé</p>
            <small>Abonnez-vous pour recevoir les nouvelles alertes de sécurité.</small>
            <CsirtNewsletterModal
              trigger={
                <button type="button" className="csirt-catalog__subscribe-btn">
                  <BellRing size={15} strokeWidth={2.2} aria-hidden />
                  S’abonner aux alertes
                </button>
              }
            />
          </div>
        </aside>

        <section className="csirt-catalog__main" aria-labelledby="csirt-catalog-list">
          <header className="csirt-catalog__count">
            <h2 id="csirt-catalog-list">
              <b>{filtered.length}</b>
              {category === 'ALERTES_SECURITE'
                ? ` alerte${filtered.length > 1 ? 's' : ''} publiée${filtered.length > 1 ? 's' : ''}`
                : ` publication${filtered.length > 1 ? 's' : ''}`}
            </h2>
          </header>

          {rows.length === 0 ? (
            <div className="csirt-catalog__empty">
              <Newspaper size={28} strokeWidth={1.8} />
              <h3>Aucune publication</h3>
              <p>Aucun résultat pour ces critères. Modifiez la recherche ou réinitialisez les filtres.</p>
              <button type="button" onClick={resetFilters}>
                Réinitialiser
              </button>
            </div>
          ) : (
            <ul className="csirt-catalog__list">
              {rows.map((item) => {
                const categoryId = normalizeSiteNewsCategory(item.category, topicList)
                const ioc = categoryId === 'IOC'
                const alert = isAlertNewsCategory(item.category, topicList)
                const ref = publicationRef(item)
                const headingText = publicationTitle(item, ref)
                const teaser = newsTeaserText(item, 150)
                const tags = publicationTags(item, headingText)
                return (
                  <li key={item.id}>
                    <article className={cn('csirt-catalog-card', alert && 'is-alert', ioc && 'is-ioc')}>
                      {alert ? null : (
                        <Link href={item.href} className="csirt-catalog-card__media" tabIndex={-1} aria-hidden>
                          <CsirtNewsThumbnail
                            src={item.image}
                            title={headingText}
                            category={item.category}
                          />
                        </Link>
                      )}
                      <div className="csirt-catalog-card__body">
                        <div className="csirt-catalog-card__meta">
                          <span className={cn('csirt-catalog-badge', ioc ? 'is-sky' : alert ? 'is-red' : 'is-green')}>
                            {newsCategoryLabel(item.category, topicList)}
                          </span>
                          {ref ? <span className="csirt-catalog-ref">{ref}</span> : null}
                        </div>
                        <h3>
                          <Link href={item.href}>{headingText}</Link>
                        </h3>
                        {teaser ? <p>{teaser}</p> : null}
                        {tags.length ? (
                          <ul className="csirt-catalog-tags">
                            {tags.map((tag) => (
                              <li key={tag}>{tag}</li>
                            ))}
                          </ul>
                        ) : null}
                      </div>
                      <div className="csirt-catalog-card__aside">
                        <time dateTime={item.date}>
                          <CalendarDays size={13} strokeWidth={2.2} aria-hidden />
                          {item.dateShort || item.dateLabel}
                        </time>
                        {alert ? (
                          <span className="csirt-catalog-status">
                            <i aria-hidden />
                            En cours
                          </span>
                        ) : null}
                        <Link href={item.href} className="csirt-catalog-read">
                          Lire l’article
                          <ArrowRight size={14} strokeWidth={2.4} aria-hidden />
                        </Link>
                      </div>
                    </article>
                  </li>
                )
              })}
            </ul>
          )}

          {pageCount > 1 ? (
            <nav className="csirt-catalog__pager" aria-label="Pagination des publications">
              <p>
                {from + 1}–{from + rows.length} sur {filtered.length}
              </p>
              <div>
                {Array.from({ length: pageCount }, (_, index) => (
                  <button
                    key={index}
                    type="button"
                    className={index === safePage ? 'is-current' : undefined}
                    aria-current={index === safePage ? 'page' : undefined}
                    onClick={() => setPage(index)}
                  >
                    {index + 1}
                  </button>
                ))}
              </div>
            </nav>
          ) : null}

          <aside className="csirt-catalog__notice">
            <span aria-hidden>
              <Info size={18} strokeWidth={2.2} />
            </span>
            <p>
              En cas d’incident, suivez les{' '}
              <Link href="/bonnes-pratiques">bonnes pratiques</Link> ou utilisez le{' '}
              <Link href={CSIRT_SIGNALEMENT_HREF}>formulaire de signalement</Link>.
            </p>
            <Link href="/actualites?categorie=ALERTES_SECURITE" className="csirt-catalog__notice-cta">
              Voir toutes les alertes
              <ArrowRight size={14} strokeWidth={2.4} aria-hidden />
            </Link>
          </aside>
        </section>
      </div>
    </div>
  )
}
