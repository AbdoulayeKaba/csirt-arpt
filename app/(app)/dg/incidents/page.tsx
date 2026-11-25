import { Suspense } from 'react'
import { IncidentManagement } from '@/components/admin/incidents/incident-management'

export default function IncidentsPage() {
  return (
    <Suspense fallback={null}>
      <IncidentManagement />
    </Suspense>
  )
}
