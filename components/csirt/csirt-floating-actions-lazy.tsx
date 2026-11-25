'use client'

import dynamic from 'next/dynamic'

const CsirtFloatingActions = dynamic(
  () =>
    import('@/components/csirt/csirt-floating-actions').then((mod) => mod.CsirtFloatingActions),
  { ssr: false },
)

export function CsirtFloatingActionsLazy() {
  return <CsirtFloatingActions />
}
