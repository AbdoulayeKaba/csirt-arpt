import Link from 'next/link'
import {
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Bell,
  BookOpen,
  Bug,
  FileText,
  Headset,
  HelpCircle,
  Library,
  Mail,
  MapPin,
  Megaphone,
  Newspaper,
  Scale,
  Search,
  Shield,
  ShieldAlert,
  Siren,
} from 'lucide-react'
import '@/components/csirt/csirt-publications-menu.css'
import {
  EMPTY_PUBLICATIONS_MENU,
  type CsirtPublicationsMenuData,
} from '@/lib/csirt/publications-menu'

const LATEST_DOTS = ['#ef4444', '#f97316', '#3b82f6', '#22c55e']

export const PUBLICATIONS_MENU_LINKS = [
  { title: 'Actualités', href: '/actualites' },
  { title: 'Rapports', href: '/rapports' },
  { title: 'Guides et manuels', href: '/guides' },
  { title: 'Communiqués', href: '/publications/communiques' },
] as const

export function isPublicationsMenu(item: { href: string; label: string }) {
  const href = item.href.replace(/\/$/, '')
  return href === '/publications' || /^publications$/i.test(item.label.trim())
}

export function CsirtPublicationsMenu({
  data = EMPTY_PUBLICATIONS_MENU,
}: {
  data?: CsirtPublicationsMenuData
}) {
  const types = [
    { icon: FileText, label: 'Toutes les publications', count: data.actualites, href: '/actualites', tone: 'green' },
    { icon: Bell, label: 'Alertes de sécurité', count: data.alerts, href: '/actualites?categorie=ALERTES_SECURITE', tone: 'red' },
    { icon: BarChart3, label: 'Rapports d’activités', count: data.rapports, href: '/rapports', tone: 'red' },
    { icon: Megaphone, label: 'Communiqués officiels', count: data.communiques, href: '/publications/communiques', tone: 'orange' },
    { icon: BookOpen, label: 'Guides et bonnes pratiques', count: data.guides, href: '/guides', tone: 'violet' },
  ]
  const themes = [
    { icon: ShieldAlert, label: 'Menaces et incidents', count: data.themes.menaces, href: '/actualites?categorie=MENACES_INCIDENTS', tone: 'red' },
    { icon: Bug, label: 'Avis de sécurité', count: data.themes.avis, href: '/actualites?categorie=AVIS_SECURITE', tone: 'orange' },
    { icon: Shield, label: 'Indicateurs de compromission', count: data.themes.ioc, href: '/actualites?categorie=IOC', tone: 'blue' },
    { icon: MapPin, label: 'Recommandations', count: data.themes.recommandations, href: '/actualites?categorie=DURCISSEMENT', tone: 'blue' },
    { icon: Scale, label: 'Réglementation', count: data.themes.reglementation, href: '/reglementations', tone: 'violet' },
  ]
  const cards = [
    {
      icon: Newspaper,
      title: 'Actualités',
      count: data.actualites,
      text: 'Informations et alertes récemment publiées par le CSIRT-ARPT.',
      href: '/actualites',
      tone: 'mint',
    },
    {
      icon: BarChart3,
      title: 'Rapports',
      count: data.rapports,
      text: 'Rapports d’activités, analyses et études de synthèse.',
      href: '/rapports',
      tone: 'rose',
    },
    {
      icon: BookOpen,
      title: 'Guides et manuels',
      count: data.guides,
      text: 'Guides pratiques pour sécuriser les systèmes et signaler un incident.',
      href: '/guides',
      tone: 'blue',
    },
    {
      icon: Megaphone,
      title: 'Communiqués',
      count: data.communiques,
      text: 'Notes et communiqués officiels à destination du public.',
      href: '/publications/communiques',
      tone: 'amber',
    },
  ]

  return (
    <div className="csirt-pubs" role="region" aria-label="Menu Publications">
      <div className="csirt-pubs__body">
        <aside className="csirt-pubs__aside">
          <p>PUBLICATIONS</p>
          <h2>Accédez à toute la documentation du CSIRT-ARPT</h2>
          <span>
            Retrouvez les alertes, rapports, guides, communiqués et analyses officielles pour un espace numérique sûr et résilient.
          </span>
          <ul>
            <li><FileText aria-hidden /> Informations fiables et officielles</li>
            <li><Shield aria-hidden /> Analyses et recommandations</li>
            <li><Siren aria-hidden /> Alertes en temps réel</li>
            <li><Library aria-hidden /> Ressources pour tous les acteurs</li>
          </ul>
          <Link href="/mediatheque">
            Consulter la médiathèque
            <ArrowUpRight aria-hidden />
          </Link>
        </aside>

        <div className="csirt-pubs__main">
          <div className="csirt-pubs__explore">
            <h2>Explorer les publications</h2>
            <form className="csirt-pubs__search" action="/recherche" method="get">
              <Search aria-hidden />
              <input
                type="search"
                name="q"
                placeholder="Rechercher une publication, un mot-clé…"
                aria-label="Rechercher une publication"
              />
            </form>
            <Link href="/publications">
              Voir toutes
              <ArrowRight aria-hidden />
            </Link>
          </div>

          <div className="csirt-pubs__cards">
            {cards.map((card) => {
              const Icon = card.icon
              return (
                <Link key={card.href} href={card.href} className={`csirt-pubs__card is-${card.tone}`}>
                  <Icon aria-hidden />
                  <span>
                    <strong>
                      {card.title}
                      <em>{card.count}</em>
                    </strong>
                    <small>{card.text}</small>
                  </span>
                  <span className="csirt-pubs__go" aria-hidden>
                    <ArrowRight />
                  </span>
                </Link>
              )
            })}
          </div>

          <div className="csirt-pubs__lists">
            <section className="csirt-pubs__col">
              <header>
                <FileText aria-hidden />
                <h3>Types de publications</h3>
                <Link href="/publications">Voir tout</Link>
              </header>
              <ul>
                {types.map((row) => {
                  const Icon = row.icon
                  return (
                    <li key={row.label}>
                      <Link href={row.href}>
                        <Icon className={`is-${row.tone}`} aria-hidden />
                        <span>{row.label}</span>
                        <em>{row.count}</em>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </section>

            <section className="csirt-pubs__col">
              <header>
                <ShieldAlert aria-hidden />
                <h3>Thématiques</h3>
                <Link href="/actualites">Voir tout</Link>
              </header>
              <ul>
                {themes.map((row) => {
                  const Icon = row.icon
                  return (
                    <li key={row.label}>
                      <Link href={row.href}>
                        <Icon className={`is-${row.tone}`} aria-hidden />
                        <span>{row.label}</span>
                        <em>{row.count}</em>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </section>

            <section className="csirt-pubs__col csirt-pubs__latest">
              <header>
                <Bell aria-hidden />
                <h3>Dernières publications</h3>
                <Link href="/actualites">Voir tout…</Link>
              </header>
              {data.latest.length === 0 ? (
                <p className="csirt-pubs__empty">Aucune publication récente.</p>
              ) : (
                <ul>
                  {data.latest.map((item, index) => (
                    <li key={item.href}>
                      <Link href={item.href}>
                        <time dateTime={item.iso}>
                          <i style={{ background: LATEST_DOTS[index % LATEST_DOTS.length] }} aria-hidden />
                          {item.date}
                        </time>
                        <strong>{item.title}</strong>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </div>
      </div>

      <footer className="csirt-pubs__foot">
        <div className="csirt-pubs__help">
          <Headset aria-hidden />
          <p>
            <strong>Besoin d’aide ?</strong>
            <span>Contactez l’équipe du CSIRT-ARPT, disponible 24h/24 et 7j/7.</span>
          </p>
        </div>
        <div>
          <Link href="/signalement" className="is-alert">
            Signaler un incident
            <ArrowRight aria-hidden />
          </Link>
          <Link href="/contacts">
            <Mail aria-hidden />
            Nous contacter
          </Link>
          <Link href="/guides">
            <Library aria-hidden />
            Base de connaissances
          </Link>
          <Link href="/bonnes-pratiques#faq">
            <HelpCircle aria-hidden />
            FAQ
          </Link>
        </div>
      </footer>
    </div>
  )
}
