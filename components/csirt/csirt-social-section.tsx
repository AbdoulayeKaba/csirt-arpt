'use client'

import { ArrowUpRight, BadgeCheck, Users } from 'lucide-react'
import { useCsirtLocale } from '@/components/csirt/csirt-locale-provider'
import { CSIRT_SOCIAL, type CsirtSocialPlatform } from '@/lib/csirt/home-content'

const THEME_CLASS: Record<CsirtSocialPlatform['theme'], string> = {
  facebook: 'fb',
  linkedin: 'linkedin',
  tiktok: 'tiktok',
}

function FacebookMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="csirt-social-svg">
      <path
        fill="currentColor"
        d="M14 8h3V4h-3c-2.8 0-5 2.2-5 5v3H6v4h3v8h4v-8h3.2L17 12h-4V9c0-.6.4-1 1-1Z"
      />
    </svg>
  )
}

function LinkedinMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="csirt-social-svg">
      <path
        fill="currentColor"
        d="M6.5 9H3.6v11.2h2.9V9ZM5 3.8C4 3.8 3.2 4.6 3.2 5.6S4 7.4 5 7.4s1.8-.8 1.8-1.8S6 3.8 5 3.8ZM20.4 12.4c0-3.2-1.7-4.7-4-4.7-1.8 0-2.6 1-3.1 1.7V9H10.4c0 1.6 0 11.2 0 11.2h2.9v-6.3c0-.3 0-.7.1-1 .3-.7.9-1.4 2-1.4 1.4 0 2 1.1 2 2.6v6.1h2.9v-6.5Z"
      />
    </svg>
  )
}

function TiktokMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="csirt-social-svg">
      <path
        fill="currentColor"
        d="M14.2 3h2.6c.3 2.2 1.6 3.9 3.7 4.3v2.6c-1.3 0-2.5-.4-3.6-1.1v6.3c0 3.6-2.8 6.4-6.5 6.4S4 18.7 4 15.1c0-3.5 2.8-6.3 6.4-6.4v2.7c-2 .1-3.6 1.8-3.6 3.7 0 2 1.7 3.7 3.7 3.7s3.7-1.6 3.7-3.7V3Z"
      />
    </svg>
  )
}

function PlatformIcon({ id }: { id: CsirtSocialPlatform['id'] }) {
  if (id === 'facebook') return <FacebookMark />
  if (id === 'linkedin') return <LinkedinMark />
  return <TiktokMark />
}

export function CsirtSocialSection({ items }: { items?: readonly CsirtSocialPlatform[] }) {
  const { t } = useCsirtLocale()
  const social = items && items.length > 0 ? items : CSIRT_SOCIAL

  return (
    <section className="csirt-social" aria-labelledby="csirt-social-title">
      <div className="csirt-social-head">
        <div className="csirt-social-head-copy">
          <h2 id="csirt-social-title">{t('socialTitle')}</h2>
          <p className="csirt-social-lead">{t('socialLead')}</p>
        </div>
        <div className="csirt-social-aside">
          <div className="csirt-social-total">
            <Users className="h-4 w-4" aria-hidden />
            {t('socialTotalCount')} {t('socialTotalFollowers')}
          </div>
          <div className="csirt-social-mini">
            {social.map((item) => (
              <a
                key={item.id}
                href={item.href}
                target="_blank"
                rel="noreferrer"
                className={`csirt-social-mini-btn csirt-social-mini-btn--${THEME_CLASS[item.theme]}`}
                aria-label={item.name}
              >
                <PlatformIcon id={item.id} />
              </a>
            ))}
          </div>
        </div>
      </div>

      <ul className="csirt-social-grid">
        {social.map((item) => (
          <li key={item.id} className={`csirt-social-card csirt-social-card--${THEME_CLASS[item.theme]}`}>
            <a
              href={item.href}
              className="csirt-social-cover"
              target="_blank"
              rel="noreferrer"
              aria-label={`${t('socialOpen')} ${item.name}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={item.image} alt="" />
              <span className="csirt-social-watermark" aria-hidden>
                <PlatformIcon id={item.id} />
              </span>
              <span className="csirt-social-identity">
                <span className="csirt-social-logo">
                  <PlatformIcon id={item.id} />
                </span>
                <span>
                  <strong>
                    {item.name}
                    <BadgeCheck className="h-3.5 w-3.5" aria-hidden />
                  </strong>
                  {item.handle}
                </span>
              </span>
              <span className="csirt-social-ext" aria-hidden>
                <ArrowUpRight className="h-3.5 w-3.5" />
              </span>
            </a>

            <div className="csirt-social-stats">
              <div>
                <b>{item.followers}</b>
                <span>{t('socialFollowers')}</span>
              </div>
              <div>
                <b>{item.posts}</b>
                <span>{t('socialPosts')}</span>
              </div>
            </div>

            <div className="csirt-social-body">
              <div className="csirt-social-tags">
                {item.tags?.map((tag) => (
                  <span key={tag}>{tag}</span>
                ))}
              </div>
              <p>{item.description}</p>
            </div>

            <div className="csirt-social-latest">
              <span>{t('socialLatestPost')}</span>
              {item.latest} <em>{item.latestAgo}</em>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
