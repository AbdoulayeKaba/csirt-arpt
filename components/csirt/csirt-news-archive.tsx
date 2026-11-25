import Link from 'next/link'
import { ArrowRight, ArrowUpRight, Newspaper } from 'lucide-react'
import { CsirtNewsThumbnail } from '@/components/csirt/csirt-news-thumbnail'
import {
  CsirtNewsCategories,
  type NewsCategoryStat,
} from '@/components/csirt/csirt-news-categories'
import {
  isAlertNewsCategory,
  newsCategoryLabel,
  resolveNewsTopics,
  type SiteNewsTopic,
} from '@/lib/site/news-sources'
import { newsTeaserText } from '@/lib/site/news-text'
import type { CsirtNewsItem } from '@/lib/csirt/home-content'
import { cn } from '@/lib/utils'

export function CsirtNewsArchive({
  title,
  lead,
  items,
  categories,
  topics,
  activeId,
  totalCount,
}: {
  title: string
  lead?: string
  items: readonly CsirtNewsItem[]
  categories: readonly NewsCategoryStat[]
  topics?: readonly SiteNewsTopic[] | null
  activeId?: string
  totalCount: number
}) {
  const topicList = resolveNewsTopics(topics)
  const activeLabel = activeId ? newsCategoryLabel(activeId, topicList) : null
  const withContent = categories.filter((c) => c.count > 0)
  const alertCount = categories
    .filter((cat) => topicList.find((t) => t.id === cat.id)?.tone === 'alert')
    .reduce((sum, cat) => sum + cat.count, 0)
  const titleMatch = title.trim().match(/^(.+?)\s+et\s+(.+)$/i)

  return (
    <div className="csirt-news-archive">
      <header className="csirt-news-archive__hero">
        <div className="csirt-news-archive__hero-glow" aria-hidden />
        <div className="csirt-news-archive__hero-inner">
          <div className="csirt-news-archive__hero-copy">
            <p className="csirt-news-archive__eyebrow">
              <span className="csirt-news-archive__live" aria-hidden />
              Fil officiel CSIRT-ARPT
            </p>
            <h1>
              {titleMatch ? (
                <>
                  <span className="csirt-news-archive__title-main">{titleMatch[1]}</span>
                  <span className="csirt-news-archive__title-and"> et </span>
                  <span className="csirt-news-archive__title-alert">{titleMatch[2]}</span>
                </>
              ) : (
                title
              )}
            </h1>
            {lead ? <p className="csirt-news-archive__lead">{lead}</p> : null}
            {activeLabel ? (
              <p className="csirt-news-archive__filter-hint">
                Rubrique active : <strong>{activeLabel}</strong>
                {' · '}
                <Link href="/actualites">Réinitialiser</Link>
              </p>
            ) : null}
          </div>

          <div className="csirt-news-archive__hero-metrics" aria-label="Indicateurs de publication">
            <div className="csirt-news-archive__metric">
              <strong>{totalCount}</strong>
              <span>Publications</span>
            </div>
            <i className="csirt-news-archive__metric-rule" aria-hidden />
            <div className="csirt-news-archive__metric is-alert">
              <strong>{alertCount}</strong>
              <span>Alertes</span>
            </div>
          </div>
        </div>
      </header>

      <div className="csirt-news-archive__layout">
        <section className="csirt-news-archive__main" aria-labelledby="csirt-news-archive-list-title">
          <header className="csirt-news-archive__toolbar">
            <div>
              <h2 id="csirt-news-archive-list-title">
                {activeLabel || 'Toutes les actualités'}
              </h2>
              <p>
                <strong>{items.length}</strong>{' '}
                publication{items.length > 1 ? 's' : ''}
                {activeLabel ? (
                  <>
                    {' '}
                    dans cette rubrique ·{' '}
                    <Link href="/actualites">Voir tout ({totalCount})</Link>
                  </>
                ) : null}
              </p>
            </div>
          </header>

          {items.length === 0 ? (
            <div className="csirt-news-archive__empty">
              <span className="csirt-news-archive__empty-icon" aria-hidden>
                <Newspaper className="h-6 w-6" />
              </span>
              <h3>Aucune publication ici</h3>
              <p>
                {activeLabel
                  ? `La rubrique « ${activeLabel} » ne contient pas encore d’actualité publiée.`
                  : 'Aucune actualité n’est disponible pour le moment.'}
              </p>
              <div className="csirt-news-archive__empty-actions">
                {activeLabel ? (
                  <Link href="/actualites" className="csirt-btn csirt-btn--green">
                    Voir toutes les actualités
                  </Link>
                ) : null}
                {withContent.length > 0 ? (
                  <ul className="csirt-news-archive__suggest">
                    {withContent.slice(0, 4).map((cat) => (
                      <li key={cat.id}>
                        <Link href={`/actualites?categorie=${encodeURIComponent(cat.id)}`}>
                          {cat.label}
                          <em>{cat.count}</em>
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </div>
          ) : (
            <ul className="csirt-news-archive__list">
              {items.map((item) => {
                const alert = isAlertNewsCategory(item.category, topicList)
                const teaser = newsTeaserText(item, 200)
                return (
                  <li key={item.id}>
                    <article
                      className={cn('csirt-news-archive-card', alert && 'is-alert')}
                    >
                      {alert ? null : (
                        <Link
                          href={item.href}
                          className="csirt-news-archive-card__media"
                          tabIndex={-1}
                          aria-hidden
                        >
                          <CsirtNewsThumbnail
                            src={item.image}
                            title={item.title}
                            category={item.category}
                          />
                        </Link>
                      )}

                      <div className="csirt-news-archive-card__body">
                        <div className="csirt-news-archive-card__meta">
                          <span
                            className={cn('csirt-news-badge', alert ? 'is-red' : 'is-green')}
                          >
                            {newsCategoryLabel(item.category, topicList)}
                          </span>
                          <time dateTime={item.date}>{item.dateLabel}</time>
                        </div>

                        <h3>
                          <Link href={item.href}>{item.title}</Link>
                        </h3>

                        {teaser ? <p className="csirt-news-archive-card__teaser">{teaser}</p> : null}

                        <div className="csirt-news-archive-card__actions">
                          <Link href={item.href} className="csirt-news-read">
                            Lire l’article
                            <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                          </Link>
                          {item.externalHref ? (
                            <a
                              href={item.externalHref}
                              className="csirt-news-ext"
                              target="_blank"
                              rel="noreferrer"
                            >
                              Source
                              <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
                            </a>
                          ) : null}
                        </div>
                      </div>
                    </article>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        <CsirtNewsCategories
          className="csirt-news-archive__aside"
          categories={categories}
          activeId={activeId}
          totalCount={totalCount}
        />
      </div>
    </div>
  )
}
