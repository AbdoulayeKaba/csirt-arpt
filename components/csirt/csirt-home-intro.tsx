'use client'

import Link from 'next/link'
import { ArrowRight, BarChart3, Clock, Eye, Lock, Shield, Users } from 'lucide-react'
import { useCsirtLocale } from '@/components/csirt/csirt-locale-provider'
import { CSIRT_BRAND } from '@/lib/csirt/brand'
import type { Language } from '@/lib/types'
import './csirt-home-intro.css'

type Copy = {
  role: string
  titleLead: string
  titleAccent: string
  lead: string
  report: string
  alerts: string
  missions: { title: string; body: string }[]
  trust: { title: string; body: string }[]
}

const COPY: Record<Language, Copy> = {
  fr: {
    role: 'Centre de réponse aux incidents de cybersécurité',
    titleLead: 'Comprendre. Prévenir.',
    titleAccent: 'Réagir.',
    lead: 'Le CSIRT-ARPT assure la veille, la prévention et la gestion des incidents de cybersécurité pour renforcer la confiance numérique en Guinée.',
    report: 'Signaler un incident',
    alerts: 'Voir les alertes',
    missions: [
      {
        title: 'Veille 24h/24 – 7j/7',
        body: 'Surveillance des menaces au niveau national et international',
      },
      {
        title: 'Réponse aux incidents',
        body: 'Analyse, coordination et traitement',
      },
      {
        title: 'Sensibilisation',
        body: 'Guides, bonnes pratiques et accompagnement',
      },
    ],
    trust: [
      { title: 'Confidentiel', body: 'Données protégées' },
      { title: 'Disponible 24h/24 et 7j/7', body: 'Une équipe à votre écoute' },
      { title: 'Pour tous les acteurs', body: 'Institutions, opérateurs, entreprises, citoyens' },
      { title: 'Coordination nationale', body: 'Un acteur clé de la cybersécurité en Guinée' },
    ],
  },
  en: {
    role: 'Cybersecurity incident response centre',
    titleLead: 'Understand. Prevent.',
    titleAccent: 'Respond.',
    lead: 'CSIRT-ARPT watches, prevents and handles cybersecurity incidents to strengthen digital trust in Guinea.',
    report: 'Report an incident',
    alerts: 'View alerts',
    missions: [
      { title: 'Watch 24/7', body: 'Threat monitoring at national and international level' },
      { title: 'Incident response', body: 'Analysis, coordination and handling' },
      { title: 'Awareness', body: 'Guides, best practices and support' },
    ],
    trust: [
      { title: 'Confidential', body: 'Protected data' },
      { title: 'Available 24/7', body: 'A team ready to listen' },
      { title: 'For every actor', body: 'Institutions, operators, businesses, citizens' },
      { title: 'National coordination', body: 'A key actor for cybersecurity in Guinea' },
    ],
  },
}

const MISSION_ICONS = [Eye, Shield, Users] as const
const TRUST_ICONS = [Lock, Clock, Users, BarChart3] as const

export function CsirtHomeIntro() {
  const { language } = useCsirtLocale()
  const text = COPY[language]

  return (
    <section className="home-intro" aria-labelledby="home-intro-title">
      <div className="home-intro__hero">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/csirt/discover-hero.jpg" alt="" />
        <div className="home-intro__shade" aria-hidden />
        <div className="home-intro__inner">
          <div className="home-intro__copy">
            <p className="home-intro__kicker">
              <strong>{CSIRT_BRAND.name}</strong>
              <span aria-hidden>|</span>
              {text.role}
            </p>
            <h1 id="home-intro-title">
              {text.titleLead.split(/\s+/).map((word, index, words) => (
                <span key={word}>
                  <span className={`home-intro__word is-${index + 1}`}>{word}</span>
                  {index < words.length - 1 ? <br /> : ' '}
                </span>
              ))}
              <span className="home-intro__word is-accent">{text.titleAccent}</span>
            </h1>
            <p className="home-intro__lead">{text.lead}</p>
            <div className="home-intro__actions">
              <Link href="/signalement" className="is-alert">
                {text.report}
                <ArrowRight aria-hidden />
              </Link>
              <a href="#publications" className="is-ghost">
                {text.alerts}
                <ArrowRight aria-hidden />
              </a>
            </div>
          </div>
          <ul className="home-intro__missions">
            {text.missions.map((item, index) => {
              const Icon = MISSION_ICONS[index] ?? Shield
              return (
                <li key={item.title}>
                  <span aria-hidden>
                    <Icon strokeWidth={1.8} />
                  </span>
                  <div>
                    <strong>{item.title}</strong>
                    <small>{item.body}</small>
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      </div>
      <ul className="home-intro__trust">
        {text.trust.map((item, index) => {
          const Icon = TRUST_ICONS[index] ?? Lock
          return (
            <li key={item.title}>
              <span aria-hidden>
                <Icon strokeWidth={1.8} />
              </span>
              <div>
                <strong>{item.title}</strong>
                <small>{item.body}</small>
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
