'use client'

import { Area, AreaChart, Bar, BarChart, ResponsiveContainer, Tooltip, XAxis } from 'recharts'

export type DeactivationHistoryEntry = {
  id: string
  subject: string
  detail?: string
  refused: boolean
  requestedBy: string
  requestedAt: string
  decidedBy: string
  decidedAt: string
  decidedAtRaw: string
}

type Props = {
  entries: DeactivationHistoryEntry[]
  subjectLabel: string
  emptyLabel: string
}

const APPROVED = '#10b981'
const REFUSED = '#ef4444'

export function DeactivationHistoryView({ entries, subjectLabel, emptyLabel }: Props) {
  const groups = new Map<string, { approved: number; refused: number }>()
  entries.forEach((entry) => {
    const current = groups.get(entry.subject) ?? { approved: 0, refused: 0 }
    if (entry.refused) current.refused += 1
    else current.approved += 1
    groups.set(entry.subject, current)
  })
  const columns = [...groups.entries()]
    .map(([name, counts]) => ({ name, Autorisées: counts.approved, Refusées: counts.refused }))
    .sort((a, b) => b.Autorisées + b.Refusées - (a.Autorisées + a.Refusées) || a.name.localeCompare(b.name, 'fr'))

  const ordered = [...entries].sort(
    (a, b) => new Date(a.decidedAtRaw).getTime() - new Date(b.decidedAtRaw).getTime(),
  )
  let approvedRun = 0
  let refusedRun = 0
  const trend = ordered.map((entry) => {
    if (entry.refused) refusedRun += 1
    else approvedRun += 1
    const time = entry.decidedAt.match(/(\d{1,2}:\d{2})/)
    return {
      label: time?.[1] ?? entry.decidedAt,
      Autorisées: approvedRun,
      Refusées: refusedRun,
    }
  })

  if (entries.length === 0) {
    return <p className="deact-viz__empty is-compact">{emptyLabel}</p>
  }

  const tip = {
    background: '#fff',
    border: '1px solid #e2ebe6',
    borderRadius: 8,
    fontSize: 11,
    padding: '3px 6px',
  }

  return (
    <div className="deact-viz">
      <div className="deact-viz__charts">
        <article className="deact-viz__card">
          <header>
            <h3>Chronologie</h3>
            <span>Cumul</span>
          </header>
          <div className="deact-viz__plot">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend} margin={{ top: 6, right: 6, left: 0, bottom: 0 }}>
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tip} />
                <Area type="monotone" dataKey="Autorisées" stroke={APPROVED} fill="#10b98133" strokeWidth={2} />
                <Area type="monotone" dataKey="Refusées" stroke={REFUSED} fill="#ef444433" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="deact-viz__card">
          <header>
            <h3>Comparaison</h3>
            <span>Par {subjectLabel.toLowerCase()}</span>
          </header>
          <div className="deact-viz__plot">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={columns} barGap={3} barSize={12} margin={{ top: 6, right: 4, left: 0, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#334155' }} axisLine={false} tickLine={false} interval={0} />
                <Tooltip contentStyle={tip} />
                <Bar dataKey="Autorisées" fill={APPROVED} radius={[3, 3, 0, 0]} />
                <Bar dataKey="Refusées" fill={REFUSED} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>
      </div>

      <section className="deact-viz__journal" aria-label="Journal des décisions">
        <h3>Journal des décisions</h3>
        {entries.length === 0 ? (
          <p className="deact-viz__empty">{emptyLabel}</p>
        ) : (
          <ul>
            {entries.map((entry) => (
              <li key={entry.id} className={entry.refused ? 'is-refused' : 'is-approved'}>
                <header>
                  <strong>{entry.subject}</strong>
                  <span>{entry.refused ? 'Refusée' : 'Autorisée'}</span>
                </header>
                <p>
                  {entry.detail ? <em>{entry.detail}</em> : null}
                  {entry.requestedBy} · {entry.requestedAt}
                  <i aria-hidden>→</i>
                  {entry.decidedBy} · {entry.decidedAt}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
