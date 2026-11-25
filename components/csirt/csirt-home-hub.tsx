'use client'

import Link from 'next/link'
import {
  ArrowRight,
  Bell,
  CircleHelp,
  FileText,
  FolderOpen,
  Scale,
  Siren,
  Play,
} from 'lucide-react'
import { useCsirtLocale } from '@/components/csirt/csirt-locale-provider'
import type { Language } from '@/lib/types'
import './csirt-home-hub.css'

type Copy = {
  resourcesTitle: string
  resourcesAccent: string
  resourcesLead: string
  resourcesAll: string
  incidentTitle: string
  incidentLead: string
  incidentCta: string
}

const COPY: Record<Language, Copy> = {
  fr: {
    resourcesTitle: 'Ressources',
    resourcesAccent: 'cybersécurité',
    resourcesLead:
      'Accédez à nos guides, alertes, réglementations et ressources pour renforcer votre sécurité.',
    resourcesAll: 'Toutes les ressources',
    incidentTitle: 'Vous pensez être victime d’un incident ?',
    incidentLead:
      'Signalez-le immédiatement au CSIRT-ARPT pour une prise en charge rapide et confidentielle.',
    incidentCta: 'Signaler un incident',
  },
  en: {
    resourcesTitle: 'Cybersecurity',
    resourcesAccent: 'resources',
    resourcesLead: 'Guides, alerts, regulations and resources to strengthen your security.',
    resourcesAll: 'All resources',
    incidentTitle: 'Think you are the victim of an incident?',
    incidentLead: 'Report it immediately to CSIRT-ARPT for fast, confidential handling.',
    incidentCta: 'Report an incident',
  },
}

const RESOURCES = [
  {
    href: '/bonnes-pratiques',
    tone: 'blue',
    icon: FileText,
    fr: ['Guides pratiques', 'Bonnes pratiques et tutoriels'],
    en: ['Practical guides', 'Best practices and tutorials'],
  },
  {
    href: '/actualites',
    tone: 'rose',
    icon: Bell,
    fr: ['Alertes & avis', 'Alertes de sécurité et recommandations'],
    en: ['Alerts & advisories', 'Security alerts and recommendations'],
  },
  {
    href: '/reglementations',
    tone: 'mint',
    icon: Scale,
    fr: ['Réglementation', 'Textes et cadres de référence'],
    en: ['Regulation', 'Reference texts and frameworks'],
  },
  {
    href: '/bonnes-pratiques#faq',
    tone: 'violet',
    icon: CircleHelp,
    fr: ['FAQ', 'Questions fréquentes et réponses'],
    en: ['FAQ', 'Frequently asked questions'],
  },
  {
    href: '/publications',
    tone: 'sky',
    icon: FolderOpen,
    fr: ['Documents', 'Notes, rapports et publications'],
    en: ['Documents', 'Notes, reports and publications'],
  },
  {
    href: '/mediatheque',
    tone: 'lilac',
    icon: Play,
    fr: ['Vidéos', 'Sensibilisation et formations'],
    en: ['Videos', 'Awareness and training'],
  },
] as const

export function CsirtHomeHub() {
  const { language } = useCsirtLocale()
  const text = COPY[language]

  return (
    <div className="csirt-hub">
      <section className="csirt-hub__resources" aria-labelledby="csirt-hub-resources-title">
        <div className="csirt-hub__head">
          <div>
            <h2 id="csirt-hub-resources-title">
              {text.resourcesTitle} <span>{text.resourcesAccent}</span>
            </h2>
            <p>{text.resourcesLead}</p>
          </div>
          <Link href="/plan-du-site">
            {text.resourcesAll}
            <ArrowRight aria-hidden />
          </Link>
        </div>
        <ul>
          {RESOURCES.map((item) => {
            const Icon = item.icon
            const [title, body] = item[language]
            return (
              <li key={item.href}>
                <Link href={item.href} className={`csirt-hub-card is-${item.tone}`}>
                  <span className="csirt-hub-card__icon" aria-hidden>
                    <Icon strokeWidth={1.8} />
                  </span>
                  <strong>{title}</strong>
                  <small>{body}</small>
                  <ArrowRight className="csirt-hub-card__arrow" aria-hidden />
                </Link>
              </li>
            )
          })}
        </ul>
      </section>

      <section className="csirt-hub-incident" aria-labelledby="csirt-hub-incident-title">
        <span className="csirt-hub-incident__mark" aria-hidden>
          <Siren strokeWidth={1.8} />
        </span>
        <div>
          <p id="csirt-hub-incident-title">{text.incidentTitle}</p>
          <small>{text.incidentLead}</small>
        </div>
        <span className="csirt-hub-incident__shield" aria-hidden>
          <svg viewBox="0 0 64 72" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M32 2 58 12v22c0 16-10 28-26 36C16 62 6 50 6 34V12L32 2ZM32 26a4 4 0 1 0 .02 0ZM29 31h6v11h-6V31Z"
            />
          </svg>
        </span>
        <Link href="/signalement">
          {text.incidentCta}
          <ArrowRight aria-hidden />
        </Link>
      </section>
    </div>
  )
}
