'use client'

import { useState } from 'react'
import { LogOut } from 'lucide-react'
import { useRouter } from 'next/navigation'

type Props = {
  className?: string
  label?: string
  busyLabel?: string
  iconOnly?: boolean
}

export function CsirtCorrespondentLogout({
  className,
  label = 'Se déconnecter',
  busyLabel = 'Déconnexion…',
  iconOnly = false,
}: Props) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  const logout = async () => {
    setBusy(true)
    try {
      await fetch('/api/auth/portal/logout', { method: 'POST' })
      router.push('/signalement')
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  return (
    <button
      type="button"
      className={className}
      onClick={() => void logout()}
      disabled={busy}
      aria-label={label}
    >
      <LogOut aria-hidden />
      {iconOnly ? null : <span>{busy ? busyLabel : label}</span>}
    </button>
  )
}
