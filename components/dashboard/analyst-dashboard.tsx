'use client'

import type { CSSProperties } from 'react'
import Link from 'next/link'
import {
  AlertTriangle,
  ArrowRight,
  ClipboardList,
  Flame,
  Inbox,
  Search,
  ShieldCheck,
} from 'lucide-react'
import type { AnalystDashboardStats } from '@/lib/services/analyst-dashboard-stats'
import '@/components/dashboard/cert-dashboard.css'
import '@/components/dashboard/analyst-dashboard.css'

type Props = {
  stats: AnalystDashboardStats
  firstName: string
}

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString('fr-FR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function kpiIcon(id: string) {
  const cls = 'h-3.5 w-3.5'
  switch (id) {
    case 'assigned':
      return <ClipboardList className={cls} />
    case 'nouveaux':
      return <Inbox className={cls} />
    case 'investigation':
      return <Search className={cls} />
    case 'critiques':
      return <Flame className={cls} />
    case 'resolus':
      return <ShieldCheck className={cls} />
    default:
      return <AlertTriangle className={cls} />
  }
}

export function AnalystDashboard({ stats, firstName }: Props) {
  const posture =
    stats.attentionNeeded > 0
      ? { key: 'attention' as const, label: stats.workloadLabel }
      : stats.stats.total > 0
        ? { key: 'operational' as const, label: stats.workloadLabel }
        : { key: 'operational' as const, label: 'En attente d’affectation' }

  return (
    <div className="cert-dashboard analyst-dashboard">
      <div className="cert-dashboard-status-row">
        <span className={`cert-dashboard-status-pill cert-dashboard-status-pill--${posture.key}`}>
          <span className="cert-dashboard-status-dot" aria-hidden />
          {posture.label}
        </span>
        <span className="cert-dashboard-meta-chip">Périmètre : dossiers qui vous sont assignés</span>
        <span className="cert-dashboard-meta-chip">Analyste · {firstName}</span>
      </div>

      <section className="cert-dashboard-kpi-band" aria-label="Charge opérationnelle analyste">
        <div className="cert-dashboard-kpi-band-head">
          <div>
            <p className="cert-dashboard-kpi-band-eyebrow">Espace analyste</p>
            <h2 className="cert-dashboard-kpi-band-title">Ma charge de traitement</h2>
          </div>
          <p className="cert-dashboard-kpi-band-meta">
            {stats.stats.total} dossier{stats.stats.total > 1 ? 's' : ''} · mise à jour live
          </p>
        </div>
        <div className="cert-dashboard-kpi-band-grid analyst-dashboard-kpi-grid">
          {stats.kpis.map((kpi) => (
            <article
              key={kpi.id}
              className="cert-dashboard-kpi-tile"
              style={{ '--kpi-accent': kpi.accent } as CSSProperties}
            >
              <div className="cert-dashboard-kpi-tile-top">
                <span className="cert-dashboard-kpi-tile-icon">{kpiIcon(kpi.id)}</span>
              </div>
              <p className="cert-dashboard-kpi-tile-value">{kpi.value.toLocaleString('fr-FR')}</p>
              <p className="cert-dashboard-kpi-tile-label">{kpi.label}</p>
              {kpi.hint ? <p className="cert-dashboard-kpi-tile-hint">{kpi.hint}</p> : null}
              <span className="cert-dashboard-kpi-tile-glow" aria-hidden />
            </article>
          ))}
        </div>
      </section>

      <section className="cert-dashboard-panel cert-dashboard-panel--pro analyst-dashboard-cases" aria-label="Dossiers prioritaires">
        <header className="cert-dashboard-panel-header cert-dashboard-panel-header--pro">
          <div className="cert-dashboard-panel-heading">
            <h2>Dossiers prioritaires</h2>
            <p>Triés par gravité puis statut — uniquement vos affectations</p>
          </div>
          <Link href="/dg/incidents" className="cert-dashboard-panel-link">
            Ouvrir la console incidents →
          </Link>
        </header>

        {stats.cases.length === 0 ? (
          <div className="analyst-dashboard-empty">
            <div className="analyst-dashboard-empty-icon" aria-hidden>
              <Inbox className="h-5 w-5" />
            </div>
            <h3>Aucun signalement assigné</h3>
            <p>
              Dès qu’un administrateur vous affectera un dossier, il apparaîtra ici avec les
              indicateurs de charge.
            </p>
            <Link href="/dg/incidents" className="analyst-dashboard-empty-cta">
              Accéder aux incidents
              <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
          </div>
        ) : (
          <ul className="analyst-dashboard-case-list">
            {stats.cases.map((item) => (
              <li key={item.id}>
                <Link
                  href={`/dg/incidents?open=${encodeURIComponent(item.id)}`}
                  className="analyst-dashboard-case"
                >
                  <div className="analyst-dashboard-case-main">
                    <span className="analyst-dashboard-case-ref">{item.reference}</span>
                    <span className="analyst-dashboard-case-org">{item.organization}</span>
                    <span className="analyst-dashboard-case-target">{item.target}</span>
                  </div>
                  <div className="analyst-dashboard-case-meta">
                    <span
                      className="analyst-dashboard-sev"
                      style={{ '--sev': item.severityColor } as CSSProperties}
                    >
                      {item.severityLabel}
                    </span>
                    <span className="analyst-dashboard-status">{item.statusLabel}</span>
                    <span className="analyst-dashboard-when">{formatWhen(item.updatedAt)}</span>
                    <ArrowRight className="h-3.5 w-3.5 analyst-dashboard-case-arrow" aria-hidden />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
