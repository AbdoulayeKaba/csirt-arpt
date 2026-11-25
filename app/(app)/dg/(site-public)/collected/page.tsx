import { Suspense } from 'react'
import { SiteCollectedEditor } from '@/components/admin/site/site-collected-editor'

export default function SiteCollectedPage() {
  return (
    <Suspense fallback={null}>
      <SiteCollectedEditor />
    </Suspense>
  )
}
