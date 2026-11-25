/** Routes éditoriales du site public. */
export const DG_SITE_ROUTES = {
  overview: '/dg/site',
  home: '/dg/home',
  pages: '/dg/pages',
  pagesNew: '/dg/pages/new',
  media: '/dg/media',
  menus: '/dg/menus',
  footer: '/dg/footer',
  newsletter: '/dg/newsletter',
  contact: '/dg/contact',
  assistant: '/dg/assistant',
  sources: '/dg/sources',
  collected: '/dg/collected',
} as const

export function dgSitePageEditHref(path: string) {
  return `${DG_SITE_ROUTES.pages}/edit?path=${encodeURIComponent(path)}`
}

const SITE_PUBLIC_PREFIXES = Object.values(DG_SITE_ROUTES)

export function isSitePublicNavActive(pathname: string): boolean {
  return SITE_PUBLIC_PREFIXES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  )
}

/** Chemins à revalider après une mise à jour du contenu du site. */
export const DG_SITE_REVALIDATE_PATHS = [
  DG_SITE_ROUTES.overview,
  DG_SITE_ROUTES.home,
  DG_SITE_ROUTES.pages,
  DG_SITE_ROUTES.media,
  DG_SITE_ROUTES.menus,
  DG_SITE_ROUTES.footer,
  DG_SITE_ROUTES.newsletter,
  DG_SITE_ROUTES.contact,
  DG_SITE_ROUTES.assistant,
  DG_SITE_ROUTES.sources,
  DG_SITE_ROUTES.collected,
] as const
