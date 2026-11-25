'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { CSIRT_BRAND } from '@/lib/csirt/brand'

type PreviewState =
  | { status: 'loading' }
  | { status: 'invalid' }
  | { status: 'ready'; emailMasked: string; alreadyUnsubscribed: boolean }
  | { status: 'done'; message: string }
  | { status: 'error'; message: string }

export function NewsletterUnsubscribeClient() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')?.trim() ?? ''
  const [state, setState] = useState<PreviewState>({ status: 'loading' })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!token) {
        if (!cancelled) setState({ status: 'invalid' })
        return
      }
      try {
        const res = await fetch(
          `/api/abonnement/unsubscribe?token=${encodeURIComponent(token)}`
        )
        const json = await res.json().catch(() => ({}))
        if (cancelled) return
        if (!res.ok || !json.valid) {
          setState({ status: 'invalid' })
          return
        }
        setState({
          status: 'ready',
          emailMasked: String(json.emailMasked ?? ''),
          alreadyUnsubscribed: Boolean(json.alreadyUnsubscribed),
        })
      } catch {
        if (!cancelled) setState({ status: 'invalid' })
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [token])

  const confirm = async () => {
    if (!token) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/abonnement/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setState({
          status: 'error',
          message: String(json.message ?? json.error ?? 'Désabonnement impossible.'),
        })
        return
      }
      setState({
        status: 'done',
        message: String(json.message ?? 'Vous êtes désabonné(e).'),
      })
    } finally {
      setSubmitting(false)
    }
  }

  if (state.status === 'loading') {
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        Vérification du lien…
      </p>
    )
  }

  if (state.status === 'invalid') {
    return (
      <div className="space-y-3 text-sm leading-relaxed">
        <p>Ce lien de désabonnement est invalide ou a expiré.</p>
        <p>
          Contactez{' '}
          <a href={CSIRT_BRAND.mailto}>{CSIRT_BRAND.email}</a> si besoin.
        </p>
      </div>
    )
  }

  if (state.status === 'done') {
    return (
      <div className="space-y-3 text-sm leading-relaxed">
        <p className="font-semibold text-emerald-800">{state.message}</p>
        <p>Vous ne recevrez plus les alertes officielles du {CSIRT_BRAND.name}.</p>
      </div>
    )
  }

  if (state.status === 'error') {
    return <p className="text-sm text-red-700">{state.message}</p>
  }

  return (
    <div className="space-y-4 text-sm leading-relaxed">
      <p>
        Confirmez le désabonnement de l’adresse{' '}
        <strong>{state.emailMasked}</strong> aux alertes officielles du{' '}
        {CSIRT_BRAND.name}.
      </p>
      {state.alreadyUnsubscribed ? (
        <p className="font-medium text-emerald-800">Cette adresse est déjà désabonnée.</p>
      ) : (
        <button
          type="button"
          className="inline-flex items-center justify-center rounded-lg bg-[#166534] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#14532d] disabled:opacity-60"
          onClick={() => void confirm()}
          disabled={submitting}
        >
          {submitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
              Traitement…
            </>
          ) : (
            'Confirmer le désabonnement'
          )}
        </button>
      )}
    </div>
  )
}
