import Link from 'next/link'
import {
  ArrowLeft,
  CalendarDays,
  UserRound,
} from 'lucide-react'
import { CsirtNewsDetailAside } from '@/components/csirt/csirt-news-detail-aside'
import {
  isAlertNewsCategory,
  newsCategoryLabel,
  normalizeSiteNewsCategory,
  resolveNewsTopics,
  type SiteNewsTopic,
} from '@/lib/site/news-sources'
import type { CsirtNewsItem } from '@/lib/csirt/home-content'
import { CsirtInnerPage } from '@/components/csirt/csirt-inner-page'
import { CsirtNewsProse } from '@/components/csirt/csirt-news-prose'
import { CsirtNewsShare } from '@/components/csirt/csirt-news-share'
import { CsirtNewsMore } from '@/components/csirt/csirt-news-more'
import '@/components/csirt/csirt-home.css'

function hasRichBody(html?: string) {
  return Boolean(html && html.replace(/<[^>]+>/g, '').trim().length > 40)
}

function isOfficialAdvisoryBody(html?: string, externalHref?: string) {
  if (externalHref && /cert\.ssi\.gouv\.fr/i.test(externalHref)) return true
  if (!html) return false
  return /Gestion du document/i.test(html) && /<table[\s>]/i.test(html)
}

function extractCertReference(item: CsirtNewsItem) {
  const fromUrl = item.externalHref?.match(/CERTFR-\d{4}-[A-Z]+-\d+/i)?.[0]
  if (fromUrl) return fromUrl.toUpperCase()
  const fromTitle = item.title.match(/(?:CERT|CSIRT)[-A-Z]{0,8}-\d{4}-[A-Z]{2,5}-\d+/i)?.[0]
  if (fromTitle) return fromTitle.toUpperCase()
  const fromBody = item.bodyHtml?.match(/CERTFR-\d{4}-[A-Z]+-\d+/i)?.[0]
  return fromBody?.toUpperCase() ?? null
}

export function CsirtNewsDetail({
  item,
  others = [],
  topics,
}: {
  item: CsirtNewsItem
  others?: readonly CsirtNewsItem[]
  topics?: readonly SiteNewsTopic[]
}) {
  const topicList = resolveNewsTopics(topics)
  const isIoc = normalizeSiteNewsCategory(item.category, topicList) === 'IOC'
  const isAlert = !isIoc && isAlertNewsCategory(item.category, topicList)
  const category = newsCategoryLabel(item.category, topicList)
  const excerpt = item.excerpt?.trim() ?? ''
  const rich = hasRichBody(item.bodyHtml)
  const official = isOfficialAdvisoryBody(item.bodyHtml, item.externalHref)
  const certRef = official ? extractCertReference(item) : null
  const currentCategory = normalizeSiteNewsCategory(item.category, topicList)
  const related = others
    .filter((row) => normalizeSiteNewsCategory(row.category, topicList) === currentCategory)
    .slice(0, 4)
    .map((row) => ({
      id: row.id,
      href: row.href,
      title: row.title,
      dateLabel: row.dateLabel,
    }))

  return (
    <CsirtInnerPage variant="full" showNewsletterCta={false}>
      <div
        className={`csirt-news-article${official ? ' is-official' : ''}${isAlert ? ' is-alert-feed' : ''}`}
      >
        {!official ? <div className="csirt-news-article__atmosphere" aria-hidden /> : null}

        <nav className="csirt-news-article__crumbs" aria-label="Fil d’Ariane">
          <Link href="/">Accueil</Link>
          <span aria-hidden>/</span>
          <Link href="/actualites">Actualités</Link>
          <span aria-hidden>/</span>
          <span className="is-current">{item.title}</span>
        </nav>

        <div className="csirt-news-article__page">
          <div className="csirt-news-article__main">
            <article className="csirt-news-article__shell">
              <header
                className={`csirt-news-article__header${official ? ' is-official' : ''}${isIoc ? ' is-ioc' : ''}${isAlert ? ' is-alert' : ''}`}
              >
                <p className="csirt-news-article__kicker">
                  {isAlert ? 'Alerte officielle' : 'Publication officielle'}
                </p>
                <h1 className={official ? 'sr-only' : undefined}>{item.title}</h1>
                <div className="csirt-news-article__meta">
                  <span className={`csirt-news-article__cat${isIoc ? ' is-ioc' : ''}${isAlert ? ' is-alert' : ''}`}>
                    {category}
                  </span>
                  {certRef ? <span className="csirt-news-article__ref">{certRef}</span> : null}
                  <span className="csirt-news-article__meta-item">
                    <CalendarDays className="h-3.5 w-3.5" aria-hidden />
                    <time dateTime={item.date}>{item.dateLabel}</time>
                  </span>
                  {item.author ? (
                    <span className="csirt-news-article__meta-item">
                      <UserRound className="h-3.5 w-3.5" aria-hidden />
                      {item.author}
                    </span>
                  ) : null}
                </div>
              </header>

              <div className={`csirt-news-article__layout${official ? ' is-official' : ''}`}>
                <aside className="csirt-news-article__rail" aria-label="Navigation">
                  <Link href="/actualites" className="csirt-news-article__back">
                    <ArrowLeft size={15} strokeWidth={2.3} aria-hidden />
                    Retour
                  </Link>
                </aside>

                <div className="csirt-news-article__content">
                  {rich ? (
                    <CsirtNewsProse
                      className={`csirt-news-article__prose${official ? ' is-official' : ''}`}
                      html={item.bodyHtml!}
                    />
                  ) : excerpt ? (
                    <div className="csirt-news-article__prose">
                      <p>{excerpt}</p>
                    </div>
                  ) : (
                    <div className="csirt-news-article__prose">
                      <p>
                        Consultez la source officielle pour le contenu complet de cette
                        publication.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="csirt-news-article__closing">
                <footer className="csirt-news-article__foot">
                  <div className="csirt-news-article__foot-copy">
                    <strong>
                      {official ? 'Relais officiel CSIRT-ARPT' : 'Publication CSIRT-ARPT'}
                    </strong>
                    <p>
                      {official
                        ? 'Document CERT-FR / ANSSI repris intégralement — vérifiez toujours la source en cas de mise à jour.'
                        : item.author
                          ? `Relais éditorial — ${item.author}`
                          : 'Centre de réponse aux incidents de cybersécurité'}
                    </p>
                  </div>
                  <div className="csirt-news-article__actions">
                    <Link href="/actualites" className="csirt-btn csirt-btn--green">
                      Toutes les actualités
                    </Link>
                  </div>
                </footer>

                <CsirtNewsShare path={item.href} title={item.title} />
              </div>
            </article>

            <CsirtNewsMore items={others} topics={topics} />
          </div>

          <CsirtNewsDetailAside related={related} />
        </div>
      </div>
    </CsirtInnerPage>
  )
}
