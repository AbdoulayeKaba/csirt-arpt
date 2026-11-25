'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import {
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  HardDrive,
  Headphones,
  Info,
  KeyRound,
  LayoutGrid,
  Lightbulb,
  Lock,
  Mail,
  Megaphone,
  Monitor,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
  Siren,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { PUBLICATION_SAMPLE_DOCUMENTS } from '@/lib/site/publication-samples'
import '@/components/csirt/csirt-practices.css'

type Audience = 'all' | 'particuliers' | 'entreprises' | 'institutions'
type CategoryId = 'all' | 'postes' | 'emails' | 'acces' | 'donnees' | 'continuite' | 'sauvegarde' | 'culture'

type Practice = {
  text: string
  cats: Exclude<CategoryId, 'all'>[]
  audiences: Exclude<Audience, 'all'>[]
}

const CATEGORIES: {
  id: Exclude<CategoryId, 'all'>
  title: string
  icon: LucideIcon
  tone: string
}[] = [
  { id: 'postes', title: 'Sécurité des postes et réseaux', icon: Monitor, tone: 'green' },
  { id: 'emails', title: 'Sécurité des e-mails', icon: Mail, tone: 'blue' },
  { id: 'acces', title: 'Gestion des accès et des identités', icon: KeyRound, tone: 'violet' },
  { id: 'donnees', title: 'Protection des données', icon: FileText, tone: 'red' },
  { id: 'continuite', title: 'Continuité d’activité', icon: RefreshCw, tone: 'orange' },
  { id: 'sauvegarde', title: 'Sauvegarde et reprise', icon: HardDrive, tone: 'cyan' },
  { id: 'culture', title: 'Sensibilisation et culture sécurité', icon: Megaphone, tone: 'lime' },
]

const PHASES: {
  id: string
  num: string
  title: string
  lead: string
  tone: string
  icon: LucideIcon
  items: Practice[]
}[] = [
  {
    id: 'avant',
    num: '01',
    title: 'Avant un incident',
    lead: 'Se préparer et réduire les risques',
    tone: 'green',
    icon: Shield,
    items: [
      { text: 'Mettre à jour régulièrement les systèmes et applications', cats: ['postes'], audiences: ['entreprises', 'institutions'] },
      { text: 'Utiliser des mots de passe robustes', cats: ['acces'], audiences: ['particuliers', 'entreprises', 'institutions'] },
      { text: 'Activer l’authentification multifacteur (MFA)', cats: ['acces'], audiences: ['particuliers', 'entreprises', 'institutions'] },
      { text: 'Sensibiliser les utilisateurs aux menaces', cats: ['culture'], audiences: ['entreprises', 'institutions'] },
      { text: 'Sauvegarder régulièrement les données critiques', cats: ['sauvegarde', 'donnees'], audiences: ['particuliers', 'entreprises', 'institutions'] },
      { text: 'Mettre en place un plan de continuité', cats: ['continuite'], audiences: ['entreprises', 'institutions'] },
    ],
  },
  {
    id: 'pendant',
    num: '02',
    title: 'Pendant un incident',
    lead: 'Réagir rapidement et efficacement',
    tone: 'red',
    icon: Siren,
    items: [
      { text: 'Isoler le système touché sans détruire les preuves', cats: ['postes'], audiences: ['entreprises', 'institutions'] },
      { text: 'Noter l’heure, les symptômes et les actions réalisées', cats: ['continuite'], audiences: ['entreprises', 'institutions'] },
      { text: 'Déconnecter les comptes compromis', cats: ['acces', 'emails'], audiences: ['particuliers', 'entreprises', 'institutions'] },
      { text: 'Limiter la propagation de l’incident', cats: ['postes'], audiences: ['entreprises', 'institutions'] },
      { text: 'Ne pas éteindre les équipements concernés', cats: ['postes'], audiences: ['entreprises', 'institutions'] },
      { text: 'Signaler immédiatement au CSIRT-ARPT', cats: ['culture'], audiences: ['particuliers', 'entreprises', 'institutions'] },
    ],
  },
  {
    id: 'apres',
    num: '03',
    title: 'Après un incident',
    lead: 'Se rétablir et éviter la récidive',
    tone: 'blue',
    icon: RefreshCw,
    items: [
      { text: 'Analyser les causes de l’incident', cats: ['continuite'], audiences: ['entreprises', 'institutions'] },
      { text: 'Restaurer les données à partir de sauvegardes saines', cats: ['sauvegarde', 'donnees'], audiences: ['particuliers', 'entreprises', 'institutions'] },
      { text: 'Appliquer les correctifs et renforcer les contrôles', cats: ['postes'], audiences: ['entreprises', 'institutions'] },
      { text: 'Mettre en place des mesures correctives durables', cats: ['continuite', 'donnees'], audiences: ['entreprises', 'institutions'] },
      { text: 'Documenter les leçons apprises', cats: ['culture'], audiences: ['entreprises', 'institutions'] },
      { text: 'Sensibiliser à nouveau les équipes', cats: ['culture'], audiences: ['entreprises', 'institutions'] },
    ],
  },
]

const DOC_IDS = [
  'pub-guide-bonnes-pratiques',
  'pub-procedure-incident',
  'pub-modele-politique',
]

const DOCUMENTS = DOC_IDS.map((id) => PUBLICATION_SAMPLE_DOCUMENTS.find((doc) => doc.id === id)).filter(
  (doc): doc is (typeof PUBLICATION_SAMPLE_DOCUMENTS)[number] => Boolean(doc)
)

const GUIDE = DOCUMENTS[0]

const RAIL = [
  { icon: Shield, tone: 'green', label: 'Prévenir les risques' },
  { icon: Siren, tone: 'blue', label: 'Réagir efficacement' },
  { icon: RefreshCw, tone: 'violet', label: 'Renforcer la résilience' },
  { icon: HardDrive, tone: 'orange', label: 'Protéger les données' },
]

const TIPS: { kicker: string; icon: LucideIcon; tone: string; text: string }[] = [
  {
    kicker: 'Conseil du jour',
    icon: Lightbulb,
    tone: 'green',
    text: 'Soyez vigilant face aux e-mails suspects. Vérifiez l’expéditeur, évitez d’ouvrir les pièces jointes inattendues et signalez tout message douteux.',
  },
  {
    kicker: 'Rappel important',
    icon: ShieldAlert,
    tone: 'orange',
    text: 'N’installez pas un logiciel non autorisé sur votre poste de travail.',
  },
  {
    kicker: 'Le saviez-vous ?',
    icon: Info,
    tone: 'blue',
    text: 'La majorité des incidents débutent par un e-mail frauduleux.',
  },
  {
    kicker: 'Conseil du jour',
    icon: Lightbulb,
    tone: 'green',
    text: 'Activez l’authentification multifacteur sur les comptes professionnels et personnels.',
  },
  {
    kicker: 'Rappel important',
    icon: ShieldAlert,
    tone: 'orange',
    text: 'Une sauvegarde n’est utile que si la restauration a été testée.',
  },
]

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} o`
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} Ko`
  return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} Mo`
}

function matches(item: Practice, query: string, category: CategoryId, audience: Audience) {
  if (category !== 'all' && !item.cats.includes(category)) return false
  if (audience !== 'all' && !item.audiences.includes(audience)) return false
  if (query && !item.text.toLowerCase().includes(query)) return false
  return true
}

export function CsirtPracticesPage() {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<CategoryId>('all')
  const [audience, setAudience] = useState<Audience>('all')
  const [tipIndex, setTipIndex] = useState(0)
  const needle = query.trim().toLowerCase()

  const phases = useMemo(
    () =>
      PHASES.map((phase) => ({
        ...phase,
        items: phase.items.filter((item) => matches(item, needle, category, audience)),
      })),
    [needle, category, audience]
  )

  const categories = useMemo(
    () =>
      CATEGORIES.map((item) => ({
        ...item,
        count: PHASES.flatMap((phase) => phase.items).filter((practice) =>
          matches(practice, needle, item.id, audience)
        ).length,
      })),
    [needle, category, audience]
  )

  const visibleTips = [0, 1, 2].map((offset) => TIPS[(tipIndex + offset) % TIPS.length])
  const total = phases.reduce((sum, phase) => sum + phase.items.length, 0)

  const reset = () => {
    setQuery('')
    setCategory('all')
    setAudience('all')
  }

  return (
    <div className="csirt-practices">
      <header className="csirt-practices__hero">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/csirt/discover-hero.jpg" alt="" />
        <div className="csirt-practices__hero-inner">
          <nav className="csirt-practices__crumb" aria-label="Fil d’Ariane">
            <Link href="/">Accueil</Link>
            <span aria-hidden>/</span>
            <strong>Bonnes pratiques</strong>
          </nav>
          <div className="csirt-practices__hero-top">
            <div>
              <p className="csirt-practices__badge">
                <Shield aria-hidden />
                Sécurité numérique
              </p>
              <h1>
                Bonnes pratiques en <span>cybersécurité</span>
              </h1>
              <p className="csirt-practices__lead">
                Des recommandations simples et concrètes pour prévenir les risques, réagir efficacement en cas d’incident et renforcer la sécurité de votre environnement numérique.
              </p>
            </div>
            <div className="csirt-practices__scene" aria-hidden>
              <svg className="csirt-practices__map" viewBox="0 0 220 260">
                <path d="M86 24c24-10 52 0 68 24 18 26 30 46 26 76-5 34-24 52-30 80-8 34-38 60-66 54-24-6-36-30-42-54-8-30-20-44-16-74 4-36 24-68 46-94 5-5 10-10 14-12z" />
                <path d="M98 72l30 34-38 32 32 30" />
                <circle cx="98" cy="72" r="3.2" />
                <circle cx="128" cy="106" r="3.2" />
                <circle cx="90" cy="138" r="3.2" />
                <circle cx="122" cy="168" r="2.6" />
              </svg>
              <div className="csirt-practices__shield">
                <Shield />
                <Lock />
              </div>
            </div>
            <ul className="csirt-practices__rail">
              {RAIL.map((item) => {
                const Icon = item.icon
                return (
                  <li key={item.label} className={`is-${item.tone}`}>
                    <Icon aria-hidden />
                    {item.label}
                  </li>
                )
              })}
            </ul>
          </div>
          <form className="csirt-practices__search" role="search" onSubmit={(event) => event.preventDefault()}>
            <label className="csirt-practices__search-field">
              <Search aria-hidden />
              <span className="sr-only">Rechercher une bonne pratique</span>
              <input
                type="search"
                value={query}
                placeholder="Rechercher une bonne pratique, un guide, un mot-clé…"
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>
            <label className="csirt-practices__select">
              <LayoutGrid aria-hidden />
              <span className="sr-only">Catégorie</span>
              <select value={category} onChange={(event) => setCategory(event.target.value as CategoryId)}>
                <option value="all">Toutes les catégories</option>
                {CATEGORIES.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.title}
                  </option>
                ))}
              </select>
            </label>
            <label className="csirt-practices__select">
              <Users aria-hidden />
              <span className="sr-only">Public</span>
              <select value={audience} onChange={(event) => setAudience(event.target.value as Audience)}>
                <option value="all">Tous les publics</option>
                <option value="particuliers">Particuliers</option>
                <option value="entreprises">Entreprises</option>
                <option value="institutions">Institutions</option>
              </select>
            </label>
            <button type="submit">
              Rechercher
              <ArrowRight aria-hidden />
            </button>
          </form>
        </div>
      </header>

      <div className="csirt-practices__body">
        <ul className="csirt-practices__cats" aria-label="Catégories">
          {categories.map((item) => {
            const Icon = item.icon
            const active = category === item.id
            return (
              <li key={item.id}>
                <button
                  type="button"
                  className={`is-${item.tone}${active ? ' is-active' : ''}`}
                  aria-pressed={active}
                  onClick={() => setCategory(active ? 'all' : item.id)}
                >
                  <span aria-hidden>
                    <Icon />
                  </span>
                  <strong>{item.title}</strong>
                  <em>{item.count}</em>
                </button>
              </li>
            )
          })}
        </ul>

        <div className="csirt-practices__layout">
          <section className="csirt-practices__reflexes" id="reflexes" aria-labelledby="practices-reflexes">
            <header>
              <div>
                <h2 id="practices-reflexes">Les bons réflexes par étape</h2>
                <p>Des recommandations concrètes pour chaque phase d’un incident de cybersécurité.</p>
              </div>
              {GUIDE ? (
                <a href={GUIDE.url} download>
                  Voir le guide complet
                  <ArrowRight aria-hidden />
                </a>
              ) : null}
            </header>
            <p className="sr-only" aria-live="polite">
              {`${total} recommandation${total > 1 ? 's' : ''}`}
            </p>
            <div className="csirt-practices__phases">
              {phases.map((phase, index) => {
                const Icon = phase.icon
                return (
                  <article key={phase.id} className={`is-${phase.tone}`}>
                    <header>
                      <span className="csirt-practices__num">{phase.num}</span>
                      <div>
                        <h3>{phase.title}</h3>
                        <p>{phase.lead}</p>
                      </div>
                      <Icon aria-hidden />
                    </header>
                    {phase.items.length ? (
                      <ul>
                        {phase.items.map((item) => (
                          <li key={item.text}>
                            <Check aria-hidden />
                            {item.text}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="csirt-practices__empty">Aucune recommandation pour ce filtre.</p>
                    )}
                    <button type="button" onClick={reset}>
                      Voir toutes les bonnes pratiques
                      <ArrowRight aria-hidden />
                    </button>
                    {index < phases.length - 1 ? (
                      <ArrowRight className={`csirt-practices__phase-arrow is-${phase.tone}`} aria-hidden />
                    ) : null}
                  </article>
                )
              })}
            </div>
          </section>

          <aside className="csirt-practices__side">
            <section className="csirt-practices__docs" aria-labelledby="practices-docs">
              <header>
                <h2 id="practices-docs">
                  <FileText aria-hidden />
                  Documents utiles
                </h2>
                <Link href="/guides">Voir tout</Link>
              </header>
              <ul>
                {DOCUMENTS.map((doc) => (
                  <li key={doc.id}>
                    <span aria-hidden>
                      <FileText />
                    </span>
                    <div>
                      <strong>{doc.title}</strong>
                      <small>{doc.size >= 8192 ? `PDF · ${formatSize(doc.size)}` : 'PDF'}</small>
                    </div>
                    <a href={doc.url} download aria-label={`Télécharger ${doc.title}`}>
                      <Download aria-hidden />
                    </a>
                  </li>
                ))}
              </ul>
            </section>
            <section className="csirt-practices__help" id="faq">
              <h2>
                <Headphones aria-hidden />
                Besoin d’aide ?
              </h2>
              <p>Une question sur une bonne pratique ou une situation spécifique ? Contactez le CSIRT-ARPT, disponible 24h/24 et 7j/7.</p>
              <div>
                <Link href="/signalement">Signaler un incident</Link>
                <Link href="/contacts">Nous contacter</Link>
              </div>
            </section>
          </aside>
        </div>

        <section className="csirt-practices__tips" aria-label="Conseils">
          {visibleTips.map((tip, index) => {
            const Icon = tip.icon
            const last = index === visibleTips.length - 1
            return (
              <article key={`${tip.kicker}-${tipIndex}-${index}`} className={`is-${tip.tone}`}>
                <span aria-hidden>
                  <Icon />
                </span>
                <div>
                  <strong>{tip.kicker}</strong>
                  <p>{tip.text}</p>
                </div>
                {last ? (
                  <div className="csirt-practices__pager">
                    <button type="button" aria-label="Conseil précédent" onClick={() => setTipIndex((value) => (value + TIPS.length - 1) % TIPS.length)}>
                      <ChevronLeft aria-hidden />
                    </button>
                    <span>
                      {tipIndex + 1} / {TIPS.length}
                    </span>
                    <button type="button" aria-label="Conseil suivant" onClick={() => setTipIndex((value) => (value + 1) % TIPS.length)}>
                      <ChevronRight aria-hidden />
                    </button>
                  </div>
                ) : null}
              </article>
            )
          })}
        </section>
      </div>
    </div>
  )
}
