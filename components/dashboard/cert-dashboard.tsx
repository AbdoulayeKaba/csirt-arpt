'use client'

import Link from 'next/link'
import type { CSSProperties } from 'react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { CertDashboardKpi, CertDashboardStats } from '@/lib/services/cert-dashboard-stats'
import '@/components/dashboard/cert-dashboard.css'

type Props = {
  stats: CertDashboardStats
}

const PRO = {
  forest: '#10261c',
  primary: '#0d5c3d',
  light: '#3d8a62',
  grid: '#e4ece7',
  axis: '#5d6b64',
} as const

const AXIS_LABEL: Record<string, string> = {
  'active-users': 'Analystes',
  'audit-24h': 'Audit 24 h',
  incidents: 'Signalements',
  pages: 'Pages',
}

const TOOLTIP_STYLE = {
  borderRadius: 8,
  border: '1px solid #d8e3dd',
  fontSize: 11,
  padding: '4px 8px',
  boxShadow: '0 4px 12px rgba(13, 92, 61, 0.08)',
}

function RadarTip({
  active,
  payload,
}: {
  active?: boolean
  payload?: Array<{ payload?: CertDashboardKpi & { shape: number } }>
}) {
  const kpi = payload?.[0]?.payload
  if (!active || !kpi) return null
  return (
    <div className="cert-dashboard-kpi-tip">
      <p>{kpi.label}</p>
      <strong>{kpi.value.toLocaleString('fr-FR')}</strong>
      {kpi.hint ? <small>{kpi.hint}</small> : null}
    </div>
  )
}

export function CertDashboard({ stats }: Props) {
  const { kpis, activityTimeline } = stats
  const radar = kpis.map((kpi) => ({
    ...kpi,
    axis: AXIS_LABEL[kpi.id] ?? kpi.label,
    shape: Math.log10(kpi.value + 1),
  }))

  return (
    <div className="cert-dashboard">
      <ul className="cert-dashboard-kpis">
        {kpis.map((kpi) => (
          <li key={kpi.id} className="cert-kpi" style={{ '--kpi': kpi.accent ?? PRO.primary } as CSSProperties}>
            <p>
              <i aria-hidden />
              {AXIS_LABEL[kpi.id] ?? kpi.label}
            </p>
            <strong>{kpi.value.toLocaleString('fr-FR')}</strong>
            <small>
              {kpi.hint ? <span>{kpi.hint}</span> : null}
              {typeof kpi.trendPct === 'number' ? (
                <em className={kpi.trendPct > 0 ? 'is-up' : kpi.trendPct < 0 ? 'is-down' : 'is-flat'}>
                  {kpi.trendPct > 0 ? '+' : ''}
                  {kpi.trendPct} %
                </em>
              ) : null}
            </small>
          </li>
        ))}
      </ul>

      <div className="cert-dashboard-stage">
        <section className="cert-dashboard-plot" aria-label="Indicateurs opérationnels">
          <header className="cert-dashboard-plot-head">
            <div>
              <p>Métriques temps réel</p>
              <h2>Vue synthétique CSIRT</h2>
            </div>
            <span>Échelle logarithmique</span>
          </header>
          <div className="cert-dashboard-chart cert-dashboard-chart--radar">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radar} cx="50%" cy="52%" outerRadius="72%">
                <PolarGrid stroke={PRO.grid} />
                <PolarAngleAxis dataKey="axis" tick={{ fill: PRO.forest, fontSize: 11, fontWeight: 650 }} />
                <PolarRadiusAxis tick={false} axisLine={false} />
                <Radar dataKey="shape" stroke={PRO.primary} fill={PRO.primary} fillOpacity={0.22} strokeWidth={2} />
                <RechartsTooltip content={<RadarTip />} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="cert-dashboard-plot" aria-label="Activité de la plateforme">
          <header className="cert-dashboard-plot-head">
            <div>
              <p>Sept derniers jours</p>
              <h2>Activité de la plateforme</h2>
            </div>
            <Link href="/dg/audit" className="cert-dashboard-plot-link">
              Journal d’audit
            </Link>
          </header>
          <ul className="cert-dashboard-series" aria-hidden>
            <li>
              <i style={{ background: PRO.primary }} />
              Événements
            </li>
            <li>
              <i style={{ background: PRO.light }} />
              Connexions
            </li>
          </ul>
          <div className="cert-dashboard-chart cert-dashboard-chart--trend">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={activityTimeline} margin={{ top: 10, right: 8, left: -16, bottom: 0 }}>
                <defs>
                  <linearGradient id="certEventsFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={PRO.primary} stopOpacity={0.28} />
                    <stop offset="100%" stopColor={PRO.primary} stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="certLoginsFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={PRO.light} stopOpacity={0.22} />
                    <stop offset="100%" stopColor={PRO.light} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={PRO.grid} vertical={false} />
                <XAxis dataKey="label" tick={{ fill: PRO.axis, fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis
                  allowDecimals={false}
                  tick={{ fill: PRO.axis, fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  width={32}
                />
                <RechartsTooltip contentStyle={TOOLTIP_STYLE} />
                <Area
                  type="monotone"
                  dataKey="events"
                  name="Événements"
                  stroke={PRO.primary}
                  fill="url(#certEventsFill)"
                  strokeWidth={2.25}
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 0, fill: PRO.primary }}
                />
                <Area
                  type="monotone"
                  dataKey="logins"
                  name="Connexions"
                  stroke={PRO.light}
                  fill="url(#certLoginsFill)"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 3.5, strokeWidth: 0, fill: PRO.light }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>
    </div>
  )
}
