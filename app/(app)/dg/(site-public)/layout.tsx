import { redirect } from 'next/navigation'
import { SiteEditorSeedProvider } from '@/components/admin/site/site-editor-seed'
import { getDgSession } from '@/lib/auth/session-server'
import { homePathForRoleId } from '@/lib/auth/post-login-redirect'
import { hasAnySiteMenuPermission } from '@/lib/dg/permission-catalog'
import { getEffectivePermissionMap } from '@/lib/auth/effective-permissions'
import { getSiteContent } from '@/lib/site/store'

export default async function SitePublicLayout({ children }: { children: React.ReactNode }) {
  const [session, site] = await Promise.all([getDgSession(), getSiteContent()])
  if (!session) {
    redirect('/login')
  }

  const permissions = await getEffectivePermissionMap(session.userId, session.role)
  const canOpenSiteMenu = Boolean(permissions['site.manage']) || hasAnySiteMenuPermission(permissions)

  if (!canOpenSiteMenu) {
    redirect(await homePathForRoleId(session.role))
  }

  return <SiteEditorSeedProvider initialSite={site}>{children}</SiteEditorSeedProvider>
}
