'use client'

import dynamic from 'next/dynamic'

export const AnalystDashboard = dynamic(
  () => import('./analyst-dashboard').then((m) => m.AnalystDashboard),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-[24rem] animate-pulse rounded-lg border border-border bg-muted/30" aria-busy />
    ),
  }
)
