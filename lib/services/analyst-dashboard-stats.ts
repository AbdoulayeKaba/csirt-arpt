import { listIncidents } from '@/lib/services/incidents-store'
import {
  getIncidentSeverityMeta,
  getIncidentStatusMeta,
  type CsirtIncident,
  type IncidentStats,
} from '@/lib/types/incident'
import { CERT_CHART_COLORS } from '@/lib/services/cert-dashboard-stats'

export type AnalystDashboardKpi = {
  id: string
  label: string
  value: number
  hint?: string
  accent: string
}

export type AnalystDashboardCase = {
  id: string
  reference: string
  statusLabel: string
  severityLabel: string
  severityColor: string
  organization: string
  target: string
  updatedAt: string
  createdAt: string
}

export type AnalystDashboardStats = {
  kpis: AnalystDashboardKpi[]
  cases: AnalystDashboardCase[]
  stats: IncidentStats
  workloadLabel: string
  attentionNeeded: number
}

function toCase(incident: CsirtIncident): AnalystDashboardCase {
  const severity = getIncidentSeverityMeta(incident.severity)
  const status = getIncidentStatusMeta(incident.status)
  return {
    id: incident.id,
    reference: incident.reference,
    statusLabel: status.label,
    severityLabel: severity.label,
    severityColor: severity.color,
    organization: incident.organization || incident.fullName || 'Signalement',
    target: incident.target || '—',
    updatedAt: incident.updatedAt,
    createdAt: incident.createdAt,
  }
}

export async function getAnalystDashboardStats(actor: {
  userId: string
  email: string
}): Promise<AnalystDashboardStats> {
  const { items, stats } = await listIncidents({
    status: 'ALL',
    limit: 200,
    assignedToActor: actor,
  })

  const attentionNeeded =
    stats.nouveaux + stats.investigation + stats.enCours + stats.critiques

  const kpis: AnalystDashboardKpi[] = [
    {
      id: 'assigned',
      label: 'Dossiers assignés',
      value: stats.total,
      hint: 'Signalements qui vous sont affectés',
      accent: CERT_CHART_COLORS.emerald,
    },
    {
      id: 'nouveaux',
      label: 'À qualifier',
      value: stats.nouveaux,
      hint: 'Statut Nouveau',
      accent: CERT_CHART_COLORS.critical,
    },
    {
      id: 'investigation',
      label: 'En investigation',
      value: stats.investigation,
      hint: 'Analyse technique en cours',
      accent: CERT_CHART_COLORS.info,
    },
    {
      id: 'en-cours',
      label: 'En traitement',
      value: stats.enCours,
      hint: 'Qualification / contention',
      accent: CERT_CHART_COLORS.high,
    },
    {
      id: 'critiques',
      label: 'Critiques (P1)',
      value: stats.critiques,
      hint: 'Priorité maximale',
      accent: CERT_CHART_COLORS.rose,
    },
    {
      id: 'resolus',
      label: 'Résolus',
      value: stats.resolus,
      hint: 'Clôturés sur votre périmètre',
      accent: CERT_CHART_COLORS.success,
    },
  ]

  const priorityRank: Record<string, number> = {
    CRITIQUE: 0,
    ELEVE: 1,
    MOYEN: 2,
    FAIBLE: 3,
  }
  const statusRank: Record<string, number> = {
    NOUVEAU: 0,
    INVESTIGATION: 1,
    EN_COURS: 2,
    CONTENU: 3,
    RESOLU: 4,
    REJETE: 5,
  }

  const sorted = [...items].sort((a, b) => {
    const sev = (priorityRank[a.severity] ?? 9) - (priorityRank[b.severity] ?? 9)
    if (sev !== 0) return sev
    const st = (statusRank[a.status] ?? 9) - (statusRank[b.status] ?? 9)
    if (st !== 0) return st
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  })

  const workloadLabel =
    stats.total === 0
      ? 'Aucun dossier assigné'
      : attentionNeeded > 0
        ? `${attentionNeeded} dossier${attentionNeeded > 1 ? 's' : ''} à traiter`
        : 'Charge sous contrôle'

  return {
    kpis,
    cases: sorted.slice(0, 8).map(toCase),
    stats,
    workloadLabel,
    attentionNeeded,
  }
}
