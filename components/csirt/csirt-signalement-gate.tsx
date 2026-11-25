'use client'

import { useCallback, useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { CsirtSignalementAccess } from '@/components/csirt/csirt-signalement-access'
import { CsirtSignalementForm } from '@/components/csirt/csirt-signalement-form'
import { CsirtSignalementHistory } from '@/components/csirt/csirt-signalement-history'
import { CsirtSignalementWizard } from '@/components/csirt/csirt-signalement-wizard'

export type SignalementSessionState = {
  authenticated: boolean
  anonymousEnabled: boolean
  canSubmit: boolean
  reason: string | null
  role?: string
  email?: string
  firstName?: string
  lastName?: string
  phone?: string
  jobTitle?: string
  organizationId?: string
  organizationName?: string
  declarantType?: string
  declarantTypeLabel?: string
  cooldownUntil?: string | null
}

const BLOCKED: Record<string, string> = {
  FORBIDDEN: 'Ce compte n’est pas un compte correspondant. Utilisez l’invitation de votre organisation.',
  ACCOUNT_INACTIVE: 'Ce compte correspondant est désactivé.',
  ORG_INACTIVE: 'L’organisation partenaire est désactivée.',
  ORG_REQUIRED: 'Aucune organisation n’est rattachée à ce compte.',
}

export function CsirtSignalementGate({
  invitationToken,
  guideVideoUrl = '',
}: {
  invitationToken?: string
  guideVideoUrl?: string
}) {
  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState<SignalementSessionState | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/signalement/session', { cache: 'no-store' })
      const json = (await res.json().catch(() => ({}))) as SignalementSessionState
      setSession(json)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  if (loading || !session) {
    return (
      <div className="csirt-sig-gate flex min-h-[240px] items-center justify-center gap-2 text-sm text-slate-600">
        <Loader2 className="h-4 w-4 animate-spin" />
        Vérification de l’accès…
      </div>
    )
  }

  if (session.canSubmit) {
    return (
      <>
        <CsirtSignalementWizard
          initialEmail={session.email ?? ''}
          initialOrganization={session.organizationName ?? ''}
          initialFullName={[session.firstName, session.lastName].filter(Boolean).join(' ')}
          initialJobTitle={session.jobTitle ?? ''}
          initialPhone={session.phone ?? ''}
          initialOrgType={session.declarantType ?? ''}
          initialOrgTypeLabel={session.declarantTypeLabel ?? ''}
          initialCooldownUntil={session.cooldownUntil ?? null}
        />
        <CsirtSignalementHistory />
      </>
    )
  }

  if (
    session.anonymousEnabled &&
    (!session.authenticated || session.reason === 'FORBIDDEN') &&
    !invitationToken
  ) {
    return <CsirtSignalementForm anonymousEnabled mode="public" />
  }

  return (
    <CsirtSignalementAccess
      invitationToken={invitationToken}
      guideVideoUrl={guideVideoUrl}
      notice={session.authenticated && session.reason ? BLOCKED[session.reason] : undefined}
      onAuthenticated={() => void refresh()}
    />
  )
}
