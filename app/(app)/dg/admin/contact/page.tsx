import { redirect } from 'next/navigation'
import { DG_SITE_ROUTES } from '@/lib/dg/site-routes'

export default function AdminContactRedirectPage() {
  redirect(DG_SITE_ROUTES.contact)
}
