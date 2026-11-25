'use client'

import { useId, useMemo } from 'react'
import { format, startOfMonth, subMonths } from 'date-fns'
import { fr } from 'date-fns/locale'
import {
  ArrowDownRight,
  ArrowUpRight,
  Minus,
} from 'lucide-react'
import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

type Subscriber = {
  id: string
  subscribedAt: string
}

type Campaign = {
  id: string
  status: 'scheduled' | 'sent' | 'cancelled' | 'failed'
  sentAt: string
  scheduledAt?: string | null
}

type Props = {
  subscribers: Subscriber[]
  campaigns: Campaign[]
  scheduledTotal: number
}

const PRO = {
  primary: '#17803d',
  grid: 'rgba(22,101,52,0.1)',
  axis: '#6b7872',
} as const

function monthKey(date: Date) {
  return format(date, 'yyyy-MM')
}

function lastMonths(count: number) {
  const now = startOfMonth(new Date())
  return Array.from({ length: count }, (_, index) => {
    const date = subMonths(now, count - 1 - index)
    return {
      key: monthKey(date),
      label: format(date, 'MMM', { locale: fr }),
    }
  })
}

function pctDelta(current: number, previous: number) {
  if (previous <= 0) return current > 0 ? 100 : 0
  return Math.round(((current - previous) / previous) * 100)
}

function Trend({ value, light }: { value: number; light?: boolean }) {
  if (value === 0) {
    return (
      <span className={`nl-hero-trend ${light ? 'nl-hero-trend--light' : ''} nl-hero-trend--flat`}>
        <Minus className="h-3 w-3" aria-hidden />
        stable
      </span>
    )
  }
  const up = value > 0
  return (
    <span
      className={`nl-hero-trend ${light ? 'nl-hero-trend--light' : ''} ${up ? 'nl-hero-trend--up' : 'nl-hero-trend--down'}`}
    >
      {up ? <ArrowUpRight className="h-3 w-3" aria-hidden /> : <ArrowDownRight className="h-3 w-3" aria-hidden />}
      {up ? '+' : '−'}
      {Math.abs(value)} %
    </span>
  )
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: Array<{ name?: string; value?: number; color?: string }>
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="nl-analytics-tooltip">
      {label ? <p className="nl-analytics-tooltip-label">{label}</p> : null}
      <ul>
        {payload.map((item) => (
          <li key={`${item.name}-${item.value}`}>
            <i style={{ background: item.color || PRO.primary }} aria-hidden />
            <span>{item.name}</span>
            <strong>{item.value ?? 0}</strong>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function NewsletterAnalytics({ subscribers, campaigns, scheduledTotal }: Props) {
  const uid = useId().replace(/:/g, '')
  const months = useMemo(() => lastMonths(8), [])

  const analytics = useMemo(() => {
    const growth = months.map((month) => ({
      ...month,
      nouveaux: 0,
      cumul: 0,
      envoyees: 0,
    }))

    const sortedSubs = [...subscribers].sort(
      (a, b) => new Date(a.subscribedAt).getTime() - new Date(b.subscribedAt).getTime()
    )

    let running = 0
    const firstKey = months[0]?.key
    if (firstKey) {
      running = sortedSubs.filter((item) => monthKey(new Date(item.subscribedAt)) < firstKey).length
    }

    for (const month of growth) {
      const added = sortedSubs.filter(
        (item) => monthKey(new Date(item.subscribedAt)) === month.key
      ).length
      running += added
      month.nouveaux = added
      month.cumul = running
    }

    for (const campaign of campaigns) {
      if (campaign.status !== 'sent') continue
      const key = monthKey(new Date(campaign.sentAt))
      const row = growth.find((item) => item.key === key)
      if (row) row.envoyees += 1
    }

    const now = new Date()
    const thisMonthKey = monthKey(now)
    const prevMonthKey = monthKey(subMonths(startOfMonth(now), 1))
    const newThisMonth = growth.find((item) => item.key === thisMonthKey)?.nouveaux ?? 0
    const newPrevMonth = growth.find((item) => item.key === prevMonthKey)?.nouveaux ?? 0
    const sentThisMonth = growth.find((item) => item.key === thisMonthKey)?.envoyees ?? 0
    const sentPrevMonth = growth.find((item) => item.key === prevMonthKey)?.envoyees ?? 0
    const sentTotal = campaigns.filter((item) => item.status === 'sent').length
    const failed = campaigns.filter((item) => item.status === 'failed').length
    const deliveryRate = sentTotal + failed > 0 ? Math.round((sentTotal / (sentTotal + failed)) * 100) : null

    return {
      growth,
      deliveryRate,
      kpis: {
        active: subscribers.length,
        newThisMonth,
        newDelta: pctDelta(newThisMonth, newPrevMonth),
        sentTotal,
        sentDelta: pctDelta(sentThisMonth, sentPrevMonth),
        scheduledTotal,
      },
    }
  }, [subscribers, campaigns, months, scheduledTotal])

  const periodLabel = useMemo(() => {
    if (months.length < 2) return '8 derniers mois'
    return `${months[0].label} → ${months[months.length - 1].label} ${format(new Date(), 'yyyy')}`
  }, [months])

  return (
    <section className="nl-analytics" aria-label="Analytique newsletter">
      <div className="nl-hero-panel">
        <div className="nl-hero-panel__glow" aria-hidden />
        <div className="nl-hero-panel__mesh" aria-hidden />

        <aside className="nl-hero-rail">
          <div className="nl-hero-rail-head">
            <p className="nl-hero-eyebrow">Pilotage</p>
            <p className="nl-hero-period">{periodLabel}</p>
          </div>
          <ul className="nl-hero-metrics">
            <li>
              <span>Abonnés</span>
              <strong>{analytics.kpis.active}</strong>
              <Trend value={analytics.kpis.newDelta} light />
            </li>
            <li>
              <span>Nouveaux</span>
              <strong>{analytics.kpis.newThisMonth}</strong>
              <Trend value={analytics.kpis.newDelta} light />
            </li>
            <li>
              <span>Envoyées</span>
              <strong>{analytics.kpis.sentTotal}</strong>
              <Trend value={analytics.kpis.sentDelta} light />
            </li>
            <li>
              <span>Planifiées</span>
              <strong>{analytics.kpis.scheduledTotal}</strong>
              <em className="nl-hero-rate">
                {analytics.deliveryRate !== null ? `${analytics.deliveryRate}%` : '—'}
              </em>
            </li>
          </ul>
        </aside>

        <div className="nl-hero-chart-wrap">
          <header className="nl-hero-chart-head">
            <h4>Audience & envois</h4>
            <div className="nl-hero-legend" aria-hidden>
              <span>
                <i style={{ background: '#17803d' }} /> Cumul
              </span>
              <span>
                <i style={{ background: '#c4a35a' }} /> Nouveaux
              </span>
              <span>
                <i style={{ background: '#0f766e' }} /> Envois
              </span>
            </div>
          </header>

          <div className="nl-hero-chart">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={analytics.growth} margin={{ top: 6, right: 6, left: -18, bottom: 0 }}>
                <defs>
                  <linearGradient id={`nlHeroFill-${uid}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#17803d" stopOpacity={0.22} />
                    <stop offset="100%" stopColor="#17803d" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={PRO.grid} vertical={false} strokeDasharray="3 6" />
                <XAxis
                  dataKey="label"
                  tick={{ fill: PRO.axis, fontSize: 10, fontWeight: 600 }}
                  axisLine={false}
                  tickLine={false}
                  height={22}
                />
                <YAxis
                  yAxisId="left"
                  tick={{ fill: PRO.axis, fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                  width={28}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tick={{ fill: PRO.axis, fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                  width={24}
                />
                <Tooltip
                  content={<ChartTooltip />}
                  cursor={{ stroke: 'rgba(23,128,61,0.28)', strokeWidth: 1 }}
                />
                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey="cumul"
                  name="Cumul abonnés"
                  stroke="#17803d"
                  strokeWidth={2}
                  fill={`url(#nlHeroFill-${uid})`}
                  activeDot={{ r: 3.5, fill: '#17803d', strokeWidth: 0 }}
                />
                <Bar
                  yAxisId="right"
                  dataKey="nouveaux"
                  name="Nouveaux"
                  fill="#c4a35a"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={16}
                  opacity={0.92}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="envoyees"
                  name="Campagnes envoyées"
                  stroke="#0f766e"
                  strokeWidth={2}
                  dot={{ r: 2.4, fill: '#0f766e', strokeWidth: 0 }}
                  activeDot={{ r: 4, fill: '#0f766e', strokeWidth: 0 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </section>
  )
}
