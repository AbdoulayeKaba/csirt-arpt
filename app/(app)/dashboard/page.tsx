import { AdminPageHeader } from '@/components/admin/admin-page-header'
import { AnalystDashboard } from '@/components/dashboard/analyst-dashboard-lazy'
import { CertDashboard } from '@/components/dashboard/cert-dashboard-lazy'
import { getDgSession } from '@/lib/auth/session-server'
import { canViewAllIncidents } from '@/lib/csirt/incident-access'
import { getAnalystDashboardStats } from '@/lib/services/analyst-dashboard-stats'
import { getCertDashboardStats, type CertDashboardPosture } from '@/lib/services/cert-dashboard-stats'

function supervisionLead(firstName: string, focus: string) {
  return `Bonjour ${firstName}. Vous suivez ${focus}.`
}

function formatSiteUpdated(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('fr-FR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function platformStatus(posture: CertDashboardPosture) {
  return (
    <div className="cert-dashboard-status-row">
      <span className={`cert-dashboard-status-pill cert-dashboard-status-pill--${posture.platformStatus}`}>
        <span className="cert-dashboard-status-dot" aria-hidden />
        {posture.platformLabel}
      </span>
      <span className="cert-dashboard-meta-chip">
        Site mis à jour : {formatSiteUpdated(posture.siteUpdatedAt)}
      </span>
    </div>
  )
}

export default async function DashboardPage() {
  const session = await getDgSession()
  const firstName = session?.firstName?.trim() || 'Analyste'
  const viewAll = session ? await canViewAllIncidents(session.role) : false

  if (!viewAll && session) {
    const analystStats = await getAnalystDashboardStats({
      userId: session.userId,
      email: session.email,
    })

    return (
      <div className="app-page admin-theme dg-dashboard-page cert-dashboard-page analyst-dashboard-page">
        <AdminPageHeader
          variant="flat"
          eyebrow="CSIRT-ARPT · Espace analyste"
          title="Centre de supervision"
          description={supervisionLead(firstName, 'uniquement les signalements qui vous sont assignés')}
        />
        <AnalystDashboard stats={analystStats} firstName={firstName} />
      </div>
    )
  }

  const stats = await getCertDashboardStats()

  return (
    <div className="app-page admin-theme dg-dashboard-page cert-dashboard-page">
        <AdminPageHeader
          variant="flat"
          eyebrow="CSIRT-ARPT · Tableau de bord"
          title="Centre de supervision"
          description={supervisionLead(firstName, 'la veille, l’audit et l’activité de la plateforme')}
          actions={platformStatus(stats.posture)}
        />
      <CertDashboard stats={stats} />
    </div>
  )
}
