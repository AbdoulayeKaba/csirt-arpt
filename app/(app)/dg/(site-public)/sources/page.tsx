import { redirect } from 'next/navigation'
import { DG_SITE_ROUTES } from '@/lib/dg/site-routes'

export default function SiteSourcesPage() {
  redirect(DG_SITE_ROUTES.collected)
}
