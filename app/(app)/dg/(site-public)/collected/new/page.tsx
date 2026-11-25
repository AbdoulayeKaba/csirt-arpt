import { Suspense } from 'react'
import { SiteCollectedAlertEditor } from '@/components/admin/site/site-collected-alert-editor'

export default function SiteCollectedAlertNewPage() {
  return (
    <Suspense fallback={null}>
      <SiteCollectedAlertEditor mode="create" />
    </Suspense>
  )
}
