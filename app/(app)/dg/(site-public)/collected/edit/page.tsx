import { Suspense } from 'react'
import { SiteCollectedAlertEditor } from '@/components/admin/site/site-collected-alert-editor'

type Props = {
  searchParams: Promise<{ id?: string }>
}

export default async function SiteCollectedAlertEditPage({ searchParams }: Props) {
  const params = await searchParams
  return (
    <Suspense fallback={null}>
      <SiteCollectedAlertEditor mode="edit" alertId={params.id ?? null} />
    </Suspense>
  )
}
