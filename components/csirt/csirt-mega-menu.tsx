'use client'

import Link from 'next/link'
import {
  ArrowRight,
  ArrowUpRight,
  Bell,
  BookMarked,
  BookOpen,
  Building2,
  ClipboardCheck,
  FileText,
  GraduationCap,
  Headset,
  History,
  Landmark,
  Lightbulb,
  Megaphone,
  Newspaper,
  Radar,
  Scale,
  Shield,
  ShieldAlert,
  User,
  Users,
} from 'lucide-react'
import '@/components/csirt/csirt-portal-menu.css'
import type { CsirtMegaIcon, CsirtNavItem } from '@/lib/csirt/nav'

const ICONS: Record<CsirtMegaIcon, typeof ShieldAlert> = {
  presentation: Landmark,
  missions: Shield,
  equipe: Users,
  historique: History,
  incidents: ShieldAlert,
  veille: Radar,
  menaces: FileText,
  abonnement: Bell,
  lois: Scale,
  cadres: BookMarked,
  normes: BookOpen,
  audit: ClipboardCheck,
  formation: GraduationCap,
  conseil: Lightbulb,
  assistance: Headset,
  actualites: Newspaper,
  rapports: FileText,
  guides: BookOpen,
  communiques: Megaphone,
  particuliers: User,
  entreprises: Building2,
  institutions: Landmark,
}

export function CsirtMegaMenu({
  item,
}: {
  item: CsirtNavItem
  alertCount?: number
  publications?: unknown
}) {
  const mega = item.mega
  if (!mega) return null
  const cards = mega.cards.slice(0, 4)

  return (
    <div className="csirt-portal" role="region" aria-label={`Menu ${mega.title}`}>
      {mega.description ? (
        <div className="csirt-portal__lead">
          <span aria-hidden />
          <p>{mega.description}</p>
        </div>
      ) : null}

      {cards.length > 0 ? (
        <ul className="csirt-portal__grid">
          {cards.map((card) => {
            const Icon = ICONS[card.icon] ?? Landmark
            return (
              <li key={`${card.href}-${card.title}`}>
                <Link href={card.href}>
                  <span className="csirt-portal__meta">
                    <span className="csirt-portal__icon" aria-hidden>
                      <Icon />
                    </span>
                    <small>{card.kicker || 'Lien'}</small>
                    {card.badge ? <em>{card.badge}</em> : null}
                  </span>
                  <strong>
                    {card.title}
                    <ArrowUpRight aria-hidden />
                  </strong>
                  {card.description ? <span className="csirt-portal__desc">{card.description}</span> : null}
                </Link>
              </li>
            )
          })}
        </ul>
      ) : null}

      {mega.cta.label ? (
        <div className="csirt-portal__foot">
          <Link href={mega.cta.href || item.href}>
            {mega.cta.label}
            <ArrowRight aria-hidden />
          </Link>
        </div>
      ) : null}
    </div>
  )
}
