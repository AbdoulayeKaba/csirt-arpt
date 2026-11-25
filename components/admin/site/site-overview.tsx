'use client'

import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import {
  FileText,
  Globe,
  Home,
  Images,
  Menu,
  PanelBottom,
} from 'lucide-react'
import { SiteShell } from '@/components/admin/site/site-shell'
import { useSiteEditor } from '@/components/admin/site/use-site-editor'
import { DG_SITE_NAV_ITEMS } from '@/lib/layout/dg-nav'
import { DG_SITE_ROUTES } from '@/lib/dg/site-routes'
import '@/components/admin/site/site-admin.css'

const ICONS = {
  [DG_SITE_ROUTES.overview]: Globe,
  [DG_SITE_ROUTES.home]: Home,
  [DG_SITE_ROUTES.pages]: FileText,
  [DG_SITE_ROUTES.media]: Images,
  [DG_SITE_ROUTES.menus]: Menu,
  [DG_SITE_ROUTES.footer]: PanelBottom,
} as const

const DESCRIPTIONS: Record<string, string> = {
  [DG_SITE_ROUTES.overview]: 'Pilotage global du site public.',
  [DG_SITE_ROUTES.home]: 'Diaporama, accès rapides, actualités, vidéos et bandeaux.',
  [DG_SITE_ROUTES.pages]: 'Titres, introductions et contenus des pages du site.',
  [DG_SITE_ROUTES.media]: 'Vidéos, visuels et bibliothèque d’images.',
  [DG_SITE_ROUTES.menus]: 'Création de menus, sous-menus associés, activation et publication.',
  [DG_SITE_ROUTES.footer]: 'Colonnes, mentions et appel au signalement.',
}

export function SiteOverview() {
  const { site, loading } = useSiteEditor()
  const updated = site?.updatedAt
    ? formatDistanceToNow(new Date(site.updatedAt), { addSuffix: true, locale: fr })
    : 'jamais publié (contenu d’origine)'

  return (
    <SiteShell
      title="Espace éditorial"
      description="Administrez le site public CSIRT-ARPT comme un éditeur de site : page d’accueil, pages, médias, menus et pied de page."
      canEdit={false}
      dirty={false}
      saving={false}
      loading={loading}
    >
      {site ? (
        <>
          <div className="site-overview-kpis">
            <div className="site-kpi">
              <strong>{site.pages.length}</strong>
              <span>Pages publiques</span>
            </div>
            <div className="site-kpi">
              <strong>{site.videos.length}</strong>
              <span>Vidéos</span>
            </div>
            <div className="site-kpi">
              <strong>{site.menus.length}</strong>
              <span>Menus</span>
            </div>
            <div className="site-kpi">
              <strong>{updated}</strong>
              <span>Dernière publication</span>
            </div>
          </div>

          <div className="site-nav-cards" style={{ marginTop: '0.85rem' }}>
            {DG_SITE_NAV_ITEMS.filter((item) => item.href !== DG_SITE_ROUTES.overview).map((item) => {
              const Icon = ICONS[item.href as keyof typeof ICONS] ?? Globe
              return (
                <Link key={item.href} href={item.href} className="site-nav-card">
                  <span className="site-nav-card-icon">
                    <Icon className="h-4 w-4" aria-hidden />
                  </span>
                  <div>
                    <h3>{item.label}</h3>
                    <p>{DESCRIPTIONS[item.href]}</p>
                  </div>
                </Link>
              )
            })}
          </div>
        </>
      ) : null}
    </SiteShell>
  )
}
