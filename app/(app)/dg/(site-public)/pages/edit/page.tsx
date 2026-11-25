import { SitePageWorkspace } from '@/components/admin/site/site-page-workspace'

type Props = {
  searchParams: Promise<{ path?: string }>
}

export default async function SitePagesEditPage({ searchParams }: Props) {
  const params = await searchParams
  return <SitePageWorkspace mode="edit" editPath={params.path ?? null} />
}
