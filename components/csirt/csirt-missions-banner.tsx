'use client'

import Link from 'next/link'
import { ArrowRight, Building2, Network, Users } from 'lucide-react'
import { useCsirtLocale } from '@/components/csirt/csirt-locale-provider'
import { CSIRT_BRAND } from '@/lib/csirt/brand'
import type { SiteMissions } from '@/lib/site/types'

const DEFAULT_MISSIONS: SiteMissions = {
  title: 'CSIRT-ARPT',
  body: 'Le CSIRT-ARPT est le centre de réponse aux incidents chargé de sécuriser l’espace numérique guinéen. Il agit pour prévenir les cybermenaces, protéger les infrastructures critiques et accompagner tous les usagers vers une cybersécurité accessible.',
  ctaLabel: 'En savoir plus sur nos missions',
  ctaHref: '/csirt-arpt#missions',
}

const MANDATE_KEYS = [
  { id: 'protect', icon: Building2, titleKey: 'mandateProtect' as const, bodyKey: 'mandateProtectBody' as const },
  { id: 'coordinate', icon: Network, titleKey: 'mandateCoordinate' as const, bodyKey: 'mandateCoordinateBody' as const },
  { id: 'support', icon: Users, titleKey: 'mandateSupport' as const, bodyKey: 'mandateSupportBody' as const },
]

export function CsirtMissionsBanner({ missions = DEFAULT_MISSIONS }: { missions?: SiteMissions }) {
  const { t } = useCsirtLocale()
  return (
    <section className="csirt-mandate" aria-labelledby="csirt-mandate-title">
      <div className="csirt-mandate__media" aria-hidden>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/csirt/hero-1.jpg"
          alt=""
          className="csirt-mandate__image"
        />
        <span className="csirt-mandate__shade" />
        <span className="csirt-mandate__grid" />
      </div>

      <div className="csirt-mandate__inner">
        <div className="csirt-mandate__copy">
          <p className="csirt-mandate__eyebrow">
            {t('brandParent')}
          </p>
          <h2 id="csirt-mandate-title" className="csirt-mandate__brand">
            {missions.title || CSIRT_BRAND.name}
          </h2>
          <span className="csirt-mandate__tricolor" aria-hidden />
          <p className="csirt-mandate__lead">{missions.body}</p>

          <Link href={missions.ctaHref} className="csirt-mandate__cta">
            {missions.ctaLabel}
            <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </div>

        <ul className="csirt-mandate__axes">
          {MANDATE_KEYS.map((item, index) => {
            const Icon = item.icon
            return (
              <li key={item.id} style={{ animationDelay: `${0.08 + index * 0.08}s` }}>
                <span className="csirt-mandate__axis-index" aria-hidden>
                  {String(index + 1).padStart(2, '0')}
                </span>
                <span className="csirt-mandate__axis-icon" aria-hidden>
                  <Icon className="h-3.5 w-3.5" />
                </span>
                <div>
                  <strong>{t(item.titleKey)}</strong>
                  <span>{t(item.bodyKey)}</span>
                </div>
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}
