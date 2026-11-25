'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { History, Rss } from 'lucide-react'
import { DG_SITE_ROUTES } from '@/lib/dg/site-routes'
import { cn } from '@/lib/utils'

const TABS = [
  {
    href: DG_SITE_ROUTES.sources,
    label: 'Sources',
    icon: Rss,
  },
  {
    href: DG_SITE_ROUTES.collected,
    label: 'Historique',
    icon: History,
  },
] as const

export function SiteNewsSectionNav() {
  const pathname = usePathname()

  return (
    <nav className="site-news-section-nav site-news-section-nav--compact" aria-label="Sources & Collecte">
      {TABS.map((tab) => {
        const Icon = tab.icon
        const active = pathname === tab.href || pathname.startsWith(`${tab.href}/`)
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn('site-news-section-nav__tab', active && 'is-active')}
            aria-current={active ? 'page' : undefined}
          >
            <Icon className="h-3.5 w-3.5" aria-hidden />
            <strong>{tab.label}</strong>
          </Link>
        )
      })}
    </nav>
  )
}
