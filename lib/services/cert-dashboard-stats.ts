import { getSiteContent } from '@/lib/site/store';
import { listAuditJournal } from '@/lib/services/audit-journal-admin';
import { listIncidents } from '@/lib/services/incidents-store';
import { isMockDataEnabled } from '@/lib/mock/config';
import { prisma } from '@/lib/prisma';

export type CertDashboardKpi = {
  id: string;
  label: string;
  value: number;
  hint?: string;
  trendPct?: number;
  accent?: string;
};

export type CertDashboardActivityPoint = {
  date: string;
  label: string;
  events: number;
  logins: number;
};

export type CertDashboardPosture = {
  platformStatus: 'operational' | 'degraded' | 'attention';
  platformLabel: string;
  siteUpdatedAt: string | null;
};

export type CertDashboardStats = {
  kpis: CertDashboardKpi[];
  activityTimeline: CertDashboardActivityPoint[];
  posture: CertDashboardPosture;
};

/** Palette SOC / CERT */
export const CERT_CHART_COLORS = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#eab308',
  info: '#3b82f6',
  success: '#10b981',
  purple: '#8b5cf6',
  cyan: '#06b6d4',
  pink: '#ec4899',
  indigo: '#6366f1',
  teal: '#14b8a6',
  emerald: '#059669',
  slate: '#64748b',
  violet: '#7c3aed',
  rose: '#f43f5e',
  amber: '#d97706',
  sky: '#0ea5e9',
  lime: '#84cc16',
  fuchsia: '#d946ef',
} as const;

export const CERT_KPI_ACCENTS: Record<string, string> = {
  'active-users': CERT_CHART_COLORS.indigo,
  'audit-24h': CERT_CHART_COLORS.sky,
  'audit-7d': CERT_CHART_COLORS.purple,
  incidents: CERT_CHART_COLORS.rose,
  pages: CERT_CHART_COLORS.success,
};

const DAY_MS = 24 * 60 * 60 * 1000;

function formatDayLabel(date: Date): string {
  return date.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' });
}

function formatIsoDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function buildActivityTimeline(
  entries: { createdAt: string; category: string }[]
): CertDashboardActivityPoint[] {
  const now = new Date();
  const buckets = new Map<string, CertDashboardActivityPoint>();

  for (let i = 6; i >= 0; i -= 1) {
    const d = new Date(now.getTime() - i * DAY_MS);
    d.setHours(0, 0, 0, 0);
    const key = formatIsoDay(d);
    buckets.set(key, { date: key, label: formatDayLabel(d), events: 0, logins: 0 });
  }

  const cutoff = now.getTime() - 7 * DAY_MS;
  for (const entry of entries) {
    const t = new Date(entry.createdAt).getTime();
    if (t < cutoff) continue;
    const bucket = buckets.get(formatIsoDay(new Date(entry.createdAt)));
    if (!bucket) continue;
    bucket.events += 1;
    if (entry.category === 'LOGIN') bucket.logins += 1;
  }

  return [...buckets.values()];
}

function trendPct(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

export async function getCertDashboardStats(): Promise<CertDashboardStats> {
  const [{ items: auditEntries, stats: auditStats }, siteContent, userCount, incidentList] = await Promise.all([
    listAuditJournal(),
    getSiteContent(),
    isMockDataEnabled()
      ? Promise.resolve(12)
      : prisma.user.count({ where: { archived: false } }).catch(() => 0),
    listIncidents({ limit: 5000 }).catch(() => null),
  ]);

  const now = Date.now();
  const inLast7d = (iso: string) => now - new Date(iso).getTime() <= 7 * DAY_MS;
  const inPrev7d = (iso: string) => {
    const age = now - new Date(iso).getTime();
    return age > 7 * DAY_MS && age <= 14 * DAY_MS;
  };

  const publishedPages = siteContent.pages.filter((p) => p.published).length;

  const kpis: CertDashboardKpi[] = [
    {
      id: 'active-users',
      label: 'Analystes actifs (24 h)',
      value: auditStats.activeUsers24h,
      hint: `${userCount} comptes enregistrés`,
      accent: CERT_KPI_ACCENTS['active-users'],
    },
    {
      id: 'audit-24h',
      label: 'Événements audit (24 h)',
      value: auditStats.actions24h,
      hint: `${auditStats.businessOps24h.toLocaleString('fr-FR')} opération${auditStats.businessOps24h > 1 ? 's' : ''} métier`,
      trendPct: auditStats.actions24hTrendPct,
      accent: CERT_KPI_ACCENTS['audit-24h'],
    },
    {
      id: 'incidents',
      label: 'Signalements actifs',
      value: incidentList?.stats.total ?? 0,
      hint: `${(incidentList?.stats.nouveaux ?? 0).toLocaleString('fr-FR')} nouveau${(incidentList?.stats.nouveaux ?? 0) > 1 ? 'x' : ''}`,
      trendPct: incidentList
        ? trendPct(
            incidentList.items.filter((item) => inLast7d(item.createdAt)).length,
            incidentList.items.filter((item) => inPrev7d(item.createdAt)).length,
          )
        : undefined,
      accent: CERT_KPI_ACCENTS.incidents,
    },
    {
      id: 'pages',
      label: 'Pages publiées',
      value: publishedPages,
      hint: `${siteContent.pages.length} pages sur le site public`,
      accent: CERT_KPI_ACCENTS.pages,
    },
  ];

  return {
    kpis,
    activityTimeline: buildActivityTimeline(auditEntries),
    posture: {
      platformStatus: 'operational',
      platformLabel: 'Plateforme opérationnelle',
      siteUpdatedAt: siteContent.updatedAt,
    },
  };
}
