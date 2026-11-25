'use client'

import { useState } from 'react'
import { Loader2, ShieldCheck } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  onFrenchInputChange,
  onFrenchInputInvalid,
  validateFrenchForm,
} from '@/lib/auth/french-input-validation'
import { CSIRT_BRAND } from '@/lib/csirt/brand'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAuthenticated: () => void
}

export function CsirtSignalementAuthModal({ open, onOpenChange, onAuthenticated }: Props) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    if (!validateFrenchForm(event.currentTarget)) return

    setLoading(true)
    try {
      const check = await fetch('/api/auth/credentials-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const checkJson = await check.json().catch(() => ({})) as {
        ok?: boolean
        error?: string
        role?: string
      }
      if (!check.ok || !checkJson.ok) {
        const code = String(checkJson.error ?? 'INVALID_CREDENTIALS')
        if (code === 'TWO_FACTOR_PENDING' || code === 'TWO_FACTOR_REQUIRED') {
          setError('La double authentification est requise. Connectez-vous via la page /login.')
          return
        }
        setError('Identifiants incorrects ou compte inactif.')
        return
      }

      if (checkJson.role !== 'CORRESPONDANT') {
        setError(
          'Ce compte n’est pas un compte correspondant. Utilisez l’invitation de votre organisation.'
        )
        return
      }

      const login = await fetch('/api/auth/portal/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const loginJson = (await login.json().catch(() => ({}))) as { ok?: boolean; message?: string }
      if (!login.ok || !loginJson.ok) {
        setError(loginJson.message ?? 'Connexion impossible. Vérifiez vos identifiants.')
        return
      }

      onAuthenticated()
      onOpenChange(false)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-emerald-700" aria-hidden />
            Connexion correspondant
          </DialogTitle>
          <DialogDescription>
            Pour signaler un incident auprès du {CSIRT_BRAND.name}, connectez-vous avec le compte
            correspondant de votre organisation.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleSubmit} noValidate>
          <div className="space-y-2">
            <Label htmlFor="sig-auth-email">E-mail</Label>
            <Input
              id="sig-auth-email"
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={onFrenchInputChange(setEmail)}
              onInvalid={onFrenchInputInvalid}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sig-auth-password">Mot de passe</Label>
            <Input
              id="sig-auth-password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error ? (
            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              {error}
            </p>
          ) : null}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Connexion…
              </>
            ) : (
              'Se connecter et continuer'
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
