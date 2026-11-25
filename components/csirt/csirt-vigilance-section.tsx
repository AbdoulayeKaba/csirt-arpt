'use client'

import Link from 'next/link'
import {
  ArrowRight,
  Bell,
  Clock,
  FileText,
  Flame,
  Globe,
  Lightbulb,
  Mail,
  Megaphone,
  Monitor,
  Radio,
  Shield,
  UserRound,
  Users,
  Zap,
} from 'lucide-react'
import { useCsirtLocale } from '@/components/csirt/csirt-locale-provider'
import { DEFAULT_VIGILANCE_SECTION } from '@/lib/site/defaults'
import type { SiteVigilanceSection } from '@/lib/site/types'

function VigilanceTitle({ title }: { title: string }) {
  const parts = title.split(/(?<=\.)\s+/).filter(Boolean)
  if (parts.length !== 3) return title
  return (
    <>
      {parts[0]} <span className="csirt-vigilance__brand-accent">{parts[1]}</span> {parts[2]}
    </>
  )
}

export function CsirtVigilanceSection({
  vigilance = DEFAULT_VIGILANCE_SECTION,
}: {
  vigilance?: SiteVigilanceSection
}) {
  const { t } = useCsirtLocale()
  const [assuranceA, assuranceB, assuranceC] = vigilance.assurance

  const metrics = [
    { value: '3', label: t('vigilanceMetricAlerts'), icon: Megaphone, tone: 'rose' },
    { value: '12', label: t('vigilanceMetricVulns'), icon: Flame, tone: 'amber' },
    { value: '8', label: t('vigilanceMetricRecs'), icon: FileText, tone: 'blue' },
    { value: '24/7', label: t('vigilanceMetricWatch'), icon: Clock, tone: 'green' },
  ] as const

  const threats = [
    { title: t('vigilanceThreatPhishing'), body: t('vigilanceThreatPhishingBody'), icon: Mail, tone: 'rose' },
    { title: t('vigilanceThreatMalware'), body: t('vigilanceThreatMalwareBody'), icon: Monitor, tone: 'amber' },
    { title: t('vigilanceThreatSocial'), body: t('vigilanceThreatSocialBody'), icon: UserRound, tone: 'violet' },
    { title: t('vigilanceThreatVuln'), body: t('vigilanceThreatVulnBody'), icon: Globe, tone: 'blue' },
  ] as const

  return (
    <section className="csirt-vigilance" aria-labelledby="csirt-vigilance-title">
      <div className="csirt-vigilance__atmosphere" aria-hidden>
        <span className="csirt-vigilance__glow csirt-vigilance__glow--a" />
        <span className="csirt-vigilance__shield">
          <svg viewBox="0 0 220 220" fill="none">
            <circle cx="132" cy="98" r="84" />
            <circle cx="132" cy="98" r="62" />
            <path
              fill="currentColor"
              d="M132 22 L196 50 V114 C196 156 168 184 132 202 C96 184 68 156 68 114 V50 Z"
            />
            <path d="M118 112 V98 a14 14 0 0 1 28 0 V112" />
            <rect x="112" y="112" width="40" height="30" rx="4" />
            <circle className="csirt-vigilance__shield-hole" cx="132" cy="125" r="2.4" />
          </svg>
        </span>
      </div>
      <div className="csirt-vigilance__inner">
        <header className="csirt-vigilance__intro">
          <div className="csirt-vigilance__brand-row">
            <h2 id="csirt-vigilance-title" className="csirt-vigilance__brand">
              <VigilanceTitle title={vigilance.title} />
            </h2>
            {vigilance.statusLabel.trim() ? (
              <p className="csirt-vigilance__status">
                <Shield className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden />
                <i aria-hidden />
                {vigilance.statusLabel}
              </p>
            ) : null}
          </div>
          {vigilance.lead.trim() ? <p className="csirt-vigilance__lead">{vigilance.lead}</p> : null}
        </header>

        <div className="csirt-vigilance__board">
          <Link href="/actualites?categorie=ALERTES_SECURITE" className="csirt-vigilance__alert">
            <span className="csirt-vigilance__alert-icon" aria-hidden>
              <Bell className="h-4 w-4" strokeWidth={2.2} />
            </span>
            <span className="csirt-vigilance__alert-copy">
              <em>{t('vigilanceAlertKicker')}</em>
              <strong>{t('vigilanceAlertTitle')}</strong>
              <small>{t('vigilanceAlertBody')}</small>
            </span>
            <ArrowRight className="csirt-vigilance__alert-arrow" aria-hidden />
          </Link>

          <ul className="csirt-vigilance__metrics">
            {metrics.map((item) => {
              const Icon = item.icon
              return (
                <li key={item.label} className={`csirt-vigilance__metric is-${item.tone}`}>
                  <span aria-hidden>
                    <Icon className="h-4 w-4" strokeWidth={2.2} />
                  </span>
                  <b>{item.value}</b>
                  <small>{item.label}</small>
                </li>
              )
            })}
          </ul>
        </div>

        <footer className="csirt-vigilance__assurance">
          {assuranceA?.trim() ? (
            <p className="csirt-vigilance__assurance-item">
              <Radio className="h-3.5 w-3.5" aria-hidden />
              {assuranceA}
            </p>
          ) : null}
          {assuranceA?.trim() && assuranceB?.trim() ? (
            <span className="csirt-vigilance__assurance-sep" aria-hidden />
          ) : null}
          {assuranceB?.trim() ? (
            <p className="csirt-vigilance__assurance-item">
              <Zap className="h-3.5 w-3.5" aria-hidden />
              {assuranceB}
            </p>
          ) : null}
          {assuranceB?.trim() && assuranceC?.trim() ? (
            <span className="csirt-vigilance__assurance-sep" aria-hidden />
          ) : null}
          {assuranceC?.trim() ? (
            <p className="csirt-vigilance__assurance-item">
              <Shield className="h-3.5 w-3.5" aria-hidden />
              {assuranceC}
            </p>
          ) : null}
          {assuranceC?.trim() ? <span className="csirt-vigilance__assurance-sep" aria-hidden /> : null}
          <p className="csirt-vigilance__assurance-item">
            <Users className="h-3.5 w-3.5" aria-hidden />
            {t('vigilanceSupport')}
          </p>
        </footer>

        <div className="csirt-vigilance__desk">
          <Link href="/bonnes-pratiques" className="csirt-vigilance__tip">
            <span className="csirt-vigilance__tip-icon" aria-hidden>
              <Lightbulb className="h-4 w-4" strokeWidth={2.2} />
            </span>
            <span>
              <em>{t('vigilanceTipKicker')}</em>
              <strong>{t('vigilanceTipTitle')}</strong>
              <small>{t('vigilanceTipBody')}</small>
            </span>
          </Link>
          <div className="csirt-vigilance__threats">
            <p>{t('vigilanceThreatsTitle')}</p>
            <ul>
              {threats.map((item) => {
                const Icon = item.icon
                return (
                  <li key={item.title} className={`is-${item.tone}`}>
                    <span aria-hidden>
                      <Icon className="h-3.5 w-3.5" strokeWidth={2.2} />
                    </span>
                    <strong>{item.title}</strong>
                    <small>{item.body}</small>
                  </li>
                )
              })}
            </ul>
          </div>
        </div>
      </div>
    </section>
  )
}
