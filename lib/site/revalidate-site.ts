import { revalidatePath, revalidateTag } from 'next/cache'
import { DG_SITE_REVALIDATE_PATHS } from '@/lib/dg/site-routes'

const PUBLIC_SITE_PATHS = [
  '/',
  '/csirt-arpt',
  '/actualites',
  '/signalement',
  '/contacts',
  '/reglementations',
  '/historique',
] as const

/** Revalide les écrans éditoriaux et pages publiques après une sauvegarde. */
export function revalidateSitePublicPaths() {
  revalidateTag('site-content', 'max')
  revalidatePath('/', 'layout')
  revalidatePath('/site-cms', 'layout')
  for (const path of DG_SITE_REVALIDATE_PATHS) {
    revalidatePath(path, 'layout')
  }
  for (const path of PUBLIC_SITE_PATHS) {
    revalidatePath(path)
  }
}
