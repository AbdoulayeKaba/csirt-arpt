'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, Home } from 'lucide-react';
import { useApp } from '@/lib/app-context';

const pathTranslations: Record<string, { fr: string; en: string }> = {
  dashboard: { fr: 'Tableau de bord', en: 'Dashboard' },
  login: { fr: 'Connexion', en: 'Login' },
  admin: { fr: 'Administration', en: 'Administration' },
  audit: { fr: 'Journal d’audit', en: 'Audit log' },
  incidents: { fr: 'Signalements & Incidents', en: 'Reports & Incidents' },
  dg: { fr: 'Console', en: 'Console' },
  users: { fr: 'Utilisateurs', en: 'Users' },
  organizations: { fr: 'Organisations partenaires', en: 'Partner organizations' },
  roles: { fr: 'Gestion des rôles', en: 'Role management' },
  referentiels: { fr: 'Référentiels', en: 'Referentials' },
  settings: { fr: 'Paramètres', en: 'Settings' },
  siteContent: { fr: 'Site public', en: 'Public site' },
  site: { fr: 'Vue d’ensemble', en: 'Overview' },
  home: { fr: 'Accueil', en: 'Home' },
  pages: { fr: 'Pages', en: 'Pages' },
  new: { fr: 'Nouvelle page', en: 'New page' },
  edit: { fr: 'Édition', en: 'Edit' },
  news: { fr: 'Actualités', en: 'News' },
  sources: { fr: 'Alertes', en: 'Alerts' },
  collected: { fr: 'Alertes', en: 'Alerts' },
  media: { fr: 'Médiathèque', en: 'Media' },
  menus: { fr: 'Menus', en: 'Menus' },
  footer: { fr: 'Pied de page', en: 'Footer' },
  newsletter: { fr: 'Newsletter', en: 'Newsletter' },
  contact: { fr: 'Contact', en: 'Contact' },
  account: { fr: 'Mon profil', en: 'My profile' },
};

type BreadcrumbsProps = {
  variant?: 'default' | 'pro';
};

export function Breadcrumbs({ variant = 'default' }: BreadcrumbsProps) {
  const pathname = usePathname();
  const { language } = useApp();

  if (pathname === '/') return null;
  if (pathname === '/login' || pathname === '/forgot-password') return null;

  const allSegments = pathname.split('/').filter(Boolean);

  const displaySegments =
    allSegments[0] === 'dg' && allSegments[1] === 'admin' ? allSegments.slice(1) : allSegments;

  const breadcrumbs = displaySegments.map((segment, index) => {
    const slice = displaySegments.slice(0, index + 1);
    const path =
      allSegments[0] === 'dg' && allSegments[1] === 'admin'
        ? `/dg/${slice.join('/')}`
        : `/${slice.join('/')}`;
    const isLast = index === displaySegments.length - 1;

    const isId = /^[0-9a-f-]+$/i.test(segment) && segment.length > 2;

    let label = pathTranslations[segment]?.[language] || segment;
    if (isId) {
      label = language === 'fr' ? 'Détails' : 'Details';
    }

    return {
      label,
      path,
      isLast,
    };
  });

  const homeHref =
    pathname.startsWith('/dg') || pathname.startsWith('/account') || pathname.startsWith('/dashboard')
      ? '/dashboard'
      : '/';

  if (variant === 'pro') {
    return (
      <nav aria-label="Breadcrumb" className="admin-breadcrumb">
        <ol className="admin-breadcrumb-list">
          <li className="admin-breadcrumb-item">
            <Link href={homeHref} className="admin-breadcrumb-link admin-breadcrumb-home">
              <Home className="admin-breadcrumb-home-icon" aria-hidden />
              <span className="sr-only">{language === 'fr' ? 'Accueil' : 'Home'}</span>
            </Link>
          </li>
          {breadcrumbs.map((crumb) => (
            <li key={crumb.path} className="admin-breadcrumb-item">
              <ChevronRight className="admin-breadcrumb-sep" aria-hidden />
              {crumb.isLast ? (
                <span className="admin-breadcrumb-current" aria-current="page">
                  {crumb.label}
                </span>
              ) : (
                <Link href={crumb.path} className="admin-breadcrumb-link">
                  {crumb.label}
                </Link>
              )}
            </li>
          ))}
        </ol>
      </nav>
    );
  }

  return (
    <nav aria-label="Breadcrumb" className="mb-4">
      <ol className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
        <li>
          <Link href={homeHref} className="hover:text-foreground">
            {language === 'fr' ? 'Accueil' : 'Home'}
          </Link>
        </li>
        {breadcrumbs.map((crumb) => (
          <li key={crumb.path} className="flex items-center gap-1">
            <ChevronRight className="h-3.5 w-3.5" aria-hidden />
            {crumb.isLast ? (
              <span className="text-foreground" aria-current="page">
                {crumb.label}
              </span>
            ) : (
              <Link href={crumb.path} className="hover:text-foreground">
                {crumb.label}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
