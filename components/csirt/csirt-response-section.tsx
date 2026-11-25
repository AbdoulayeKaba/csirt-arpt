'use client'

import Link from 'next/link'
import {
  ArrowRight,
  Binoculars,
  ScanSearch,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react'
import { useCsirtLocale } from '@/components/csirt/csirt-locale-provider'
import type { SiteResponseSection } from '@/lib/site/types'

const PILLAR_ICONS = {
  prevent: Binoculars,
  analyze: ScanSearch,
  respond: ShieldCheck,
} as const

const AUDIENCE_KEYS = ['responseAudienceInstitutions', 'responseAudienceOperators', 'responseAudienceUsers'] as const

type Props = {
  response: SiteResponseSection
}

export function CsirtResponseSection({ response }: Props) {
  const { t } = useCsirtLocale()
  return (
    <section className="csirt-response" aria-labelledby="csirt-response-title">
      <div className="csirt-response__atmosphere" aria-hidden>
        <span className="csirt-response__grid" />
        <span className="csirt-response__glow" />
        <span className="csirt-response__orbit" />
      </div>

      <div className="csirt-response__inner">
        <div className="csirt-response__top">
          <header className="csirt-response__intro">
            <div className="csirt-response__brand-row">
              <p className="csirt-response__brand">{response.kicker}</p>
              <p className="csirt-response__status">
                <i aria-hidden />
                {response.statusLabel}
              </p>
            </div>
            <h2 id="csirt-response-title">{response.title}</h2>
            <p className="csirt-response__lead">{response.lead}</p>
            <p className="csirt-response__audiences" aria-label={t('responseAudiencesAria')}>
              {AUDIENCE_KEYS.map((key) => (
                <span key={key}>{t(key)}</span>
              ))}
            </p>
          </header>
        </div>

        <ol className="csirt-response__pillars" aria-label={t('responseChainAria')}>
          {response.pillars.map((pillar, index) => {
            const Icon =
              PILLAR_ICONS[pillar.id as keyof typeof PILLAR_ICONS] ?? ShieldCheck
            return (
              <li key={pillar.id}>
                <Link href={pillar.href} className="csirt-response__pillar">
                  <span className="csirt-response__pillar-head">
                    <span className="csirt-response__index" aria-hidden>
                      {pillar.index}
                    </span>
                    <span className="csirt-response__icon" aria-hidden>
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                  </span>
                  <span className="csirt-response__pillar-copy">
                    <strong>{pillar.title}</strong>
                    <span>{pillar.body}</span>
                  </span>
                  <span className="csirt-response__pillar-go" aria-hidden>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </Link>
                {index < response.pillars.length - 1 ? (
                  <span className="csirt-response__connector" aria-hidden />
                ) : null}
              </li>
            )
          })}
        </ol>

        <div className="csirt-response__foot">
          <div className="csirt-response__actions">
            <Link href={response.ctaHref} className="csirt-response__cta csirt-response__cta--alert">
              <ShieldAlert className="h-3.5 w-3.5" aria-hidden />
              {response.ctaLabel}
            </Link>
            <Link
              href={response.secondaryHref}
              className="csirt-response__cta csirt-response__cta--ghost"
            >
              {response.secondaryLabel}
              <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
          </div>
          <p className="csirt-response__note">{t('responseFootNote')}</p>
        </div>
      </div>
    </section>
  )
}
