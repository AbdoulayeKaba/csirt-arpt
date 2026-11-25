'use client'

import dynamic from 'next/dynamic'

export const CertDashboard = dynamic(
  () => import('./cert-dashboard').then((m) => m.CertDashboard),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-[24rem] animate-pulse rounded-lg border border-border bg-muted/30" aria-busy />
    ),
  }
)
