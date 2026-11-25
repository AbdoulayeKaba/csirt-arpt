'use client'

import { useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent, type ClipboardEvent } from 'react'
import Link from 'next/link'
import { ArrowRight, Eye, EyeOff, Lock, Mail, Play, Shield, ShieldCheck } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { isDirectVideoFile, toVideoEmbedUrl } from '@/lib/site/video-embed'
import './csirt-signalement-access.css'

const CREATE_ERRORS: Record<string, string> = {
  INVALID_TOKEN: 'Ce lien d’invitation est invalide.',
  EXPIRED: 'Ce lien d’invitation a expiré. Demandez un nouvel envoi.',
  CANCELLED: 'Cette invitation a été annulée.',
  ACCEPTED: 'Cette invitation a déjà été utilisée. Connectez-vous.',
  ORG_INACTIVE: 'L’organisation associée n’est plus active.',
  EMAIL_EXISTS: 'Un compte existe déjà pour cette adresse. Connectez-vous.',
  PASSWORD_MISMATCH: 'Les mots de passe ne correspondent pas.',
  VALIDATION_ERROR: 'Vérifiez les informations saisies.',
  PASSWORD_TOO_SHORT: 'Le mot de passe est trop court.',
  PASSWORD_TOO_WEAK: 'Le mot de passe ne respecte pas la politique de sécurité.',
  PASSWORD_NEEDS_UPPERCASE: 'Une majuscule est requise.',
  PASSWORD_NEEDS_LOWERCASE: 'Une minuscule est requise.',
  PASSWORD_NEEDS_DIGIT: 'Un chiffre est requis.',
  PASSWORD_NEEDS_SPECIAL: 'Un caractère spécial est requis.',
}

type Props = {
  invitationToken?: string
  notice?: string
  guideVideoUrl?: string
  onAuthenticated: () => void
}

type InvitePreview = {
  email: string
  organizationName: string
  expiresAt: string
}

export function CsirtSignalementAccess({
  invitationToken,
  notice,
  guideVideoUrl = '',
  onAuthenticated,
}: Props) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [remember, setRemember] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(notice ?? null)
  const [invite, setInvite] = useState<InvitePreview | null>(null)
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [accountReady, setAccountReady] = useState(false)
  const [readyMessage, setReadyMessage] = useState<string | null>(null)
  const [needsMfa, setNeedsMfa] = useState(false)
  const [mfaCode, setMfaCode] = useState('')
  const [otpDeadline, setOtpDeadline] = useState<number | null>(null)
  const [otpRemaining, setOtpRemaining] = useState(0)
  const [resending, setResending] = useState(false)
  const otpRefs = useRef<Array<HTMLInputElement | null>>([])
  const [guideOpen, setGuideOpen] = useState(false)
  const guideHref = guideVideoUrl.trim()
  const guideEmbed = useMemo(() => (guideHref ? toVideoEmbedUrl(guideHref, true) : null), [guideHref])
  const guideFile = Boolean(guideHref) && isDirectVideoFile(guideHref)

  useEffect(() => {
    if (!invitationToken || accountReady) return
    let cancelled = false
    void fetch(`/api/invitation/${encodeURIComponent(invitationToken)}`)
      .then(async (res) => {
        const json = await res.json().catch(() => ({}))
        if (cancelled) return
        if (!res.ok) {
          if (json.error === 'ACCEPTED') {
            setAccountReady(true)
            setReadyMessage(
              'Ce compte est déjà activé. Connectez-vous pour signaler un incident et consulter votre historique.'
            )
            return
          }
          setInviteError(
            json.error === 'EXPIRED'
              ? 'Ce lien d’activation a expiré. Demandez un nouvel envoi.'
              : 'Ce lien d’activation est invalide.'
          )
          return
        }
        setInvite({
          email: String(json.email ?? ''),
          organizationName: String(json.organizationName ?? ''),
          expiresAt: String(json.expiresAt ?? ''),
        })
        setEmail(String(json.email ?? ''))
      })
      .catch(() => {
        if (!cancelled) setInviteError('Impossible de vérifier le lien d’activation.')
      })
    return () => {
      cancelled = true
    }
  }, [invitationToken, accountReady])

  useEffect(() => {
    if (!otpDeadline) return
    const tick = () => setOtpRemaining(Math.max(0, Math.ceil((otpDeadline - Date.now()) / 1000)))
    tick()
    const timer = window.setInterval(tick, 1000)
    return () => window.clearInterval(timer)
  }, [otpDeadline])

  const startOtpWindow = (seconds?: number | null) => {
    const span = typeof seconds === 'number' && seconds > 0 ? seconds : 5 * 60
    setOtpRemaining(span)
    setOtpDeadline(Date.now() + span * 1000)
  }

  const formatOtpRemaining = (total: number) => {
    const minutes = Math.floor(total / 60)
    const seconds = total % 60
    if (total <= 0) return 'Code expiré'
    return `Expire dans ${minutes} min ${String(seconds).padStart(2, '0')} s`
  }

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    const code = mfaCode.replace(/\D/g, '')
    if (needsMfa && code.length !== 6) {
      setError('Saisissez le code de vérification à 6 chiffres.')
      return
    }
    if (needsMfa && otpDeadline !== null && otpRemaining <= 0) {
      setError('Ce code a expiré. Demandez-en un nouveau.')
      return
    }
    setBusy(true)
    try {
      const pre = await fetch('/api/auth/credentials-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
          ...(needsMfa ? { totpCode: code } : {}),
        }),
      })
      const preJson = (await pre.json().catch(() => ({}))) as {
        ok?: boolean
        message?: string
        requiresMfa?: boolean
        expiresInSeconds?: number | null
      }
      if (preJson.requiresMfa) {
        setNeedsMfa(true)
        setMfaCode('')
        startOtpWindow(preJson.expiresInSeconds)
        window.setTimeout(() => otpRefs.current[0]?.focus(), 0)
        return
      }
      if (!pre.ok || !preJson.ok) {
        setError(preJson.message ?? 'Identifiants incorrects.')
        return
      }
      const login = await fetch('/api/auth/portal/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
          ...(needsMfa ? { totpCode: code } : {}),
        }),
      })
      const loginJson = (await login.json().catch(() => ({}))) as { ok?: boolean; message?: string }
      if (!login.ok || !loginJson.ok) {
        setError(loginJson.message ?? 'Connexion refusée. Réessayez.')
        return
      }
      onAuthenticated()
    } catch {
      setError('Erreur réseau. Réessayez.')
    } finally {
      setBusy(false)
    }
  }

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!invitationToken) return
    setError(null)
    if (password !== passwordConfirm) {
      setError('Les mots de passe ne correspondent pas.')
      return
    }
    setBusy(true)
    try {
      const res = await fetch(`/api/invitation/${encodeURIComponent(invitationToken)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstName, lastName, password, passwordConfirm }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        const code = String(json.error ?? '')
        setError(CREATE_ERRORS[code] ?? 'Activation impossible. Vérifiez les informations saisies.')
        if (code === 'EMAIL_EXISTS' || code === 'ACCEPTED') {
          setAccountReady(true)
          setReadyMessage(CREATE_ERRORS[code])
        }
        return
      }
      setAccountReady(true)
      setReadyMessage('Compte créé. Connectez-vous avec votre adresse et le mot de passe choisi.')
      setPassword('')
      setPasswordConfirm('')
    } finally {
      setBusy(false)
    }
  }

  const creating = Boolean(invitationToken && invite && !accountReady)
  const inviteLoading = Boolean(invitationToken && !invite && !inviteError && !accountReady)
  const expiryLabel =
    invite?.expiresAt && !Number.isNaN(new Date(invite.expiresAt).getTime())
      ? new Date(invite.expiresAt).toLocaleString('fr-FR', { dateStyle: 'long', timeStyle: 'short' })
      : null

  return (
    <div className="sig-in">
      <section className="sig-in__hero" aria-labelledby="sig-in-title">
        <div className="sig-in__wrap sig-in__hero-grid">
          <div>
            <nav className="sig-in__crumb" aria-label="Fil d’Ariane">
              <Link href="/">Accueil</Link>
              <span aria-hidden>›</span>
              <span>Signalement d’incident</span>
            </nav>
            <p className="sig-in__eyebrow">Espace correspondant</p>
            <h1 id="sig-in-title">
              Signaler un <span>incident</span>
            </h1>
            <ul className="sig-in__pills">
              <li>
                <ShieldCheck aria-hidden />
                <span>
                  <strong>Confidentiel</strong>
                  Données protégées
                </span>
              </li>
              <li>
                <Lock aria-hidden />
                <span>
                  <strong>Sécurisé</strong>
                  Chiffrement PGP
                </span>
              </li>
              <li>
                <Shield aria-hidden />
                <span>
                  <strong>Disponible 24h/24 et 7j/7</strong>
                  Une équipe à votre écoute
                </span>
              </li>
            </ul>
          </div>
          <button type="button" className="sig-in__guide" onClick={() => setGuideOpen(true)}>
            <span className="sig-in__guide-play" aria-hidden>
              <Play />
            </span>
            <span>
              <small>Vidéo</small>
              <strong>
                Comment signaler <span className="sig-in__guide-q">?</span>
              </strong>
            </span>
          </button>
        </div>
      </section>

      <Dialog open={guideOpen} onOpenChange={setGuideOpen}>
        <DialogContent className="sig-in-guide" showCloseButton>
          <DialogHeader className="sig-in-guide__head">
            <DialogTitle>Comment signaler un incident</DialogTitle>
            <DialogDescription>
              Connexion, description du dossier, chiffrement et transmission au CSIRT-ARPT.
            </DialogDescription>
          </DialogHeader>
          <div className="sig-in-guide__stage">
            {guideOpen && guideEmbed ? (
              <iframe
                src={guideEmbed}
                title="Comment signaler un incident"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                referrerPolicy="strict-origin-when-cross-origin"
              />
            ) : guideOpen && guideFile ? (
              <video src={guideHref} controls autoPlay playsInline>
                Votre navigateur ne peut pas lire cette vidéo.
              </video>
            ) : (
              <p>La vidéo explicative n’est pas encore publiée.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <div className="sig-in__wrap sig-in__board">
        <section className="sig-in__login" aria-labelledby="sig-in-login">
          <p className="sig-in__badge">Accès réservé</p>
          <header>
            <span>
              <ShieldCheck aria-hidden />
            </span>
            <div>
              <h2 id="sig-in-login">{creating ? 'Créer mon compte' : 'Connexion correspondant'}</h2>
              <p className="sig-in__lead">
                {creating
                  ? `Activez votre accès correspondant pour ${invite?.organizationName}${expiryLabel ? ` avant le ${expiryLabel}` : ''}.`
                  : 'Connectez-vous pour signaler un incident et consulter votre historique.'}
              </p>
            </div>
          </header>

          {readyMessage ? <p className="sig-in__note">{readyMessage}</p> : null}
          {inviteLoading ? <p className="sig-in__note">Vérification du lien d’activation…</p> : null}
          {inviteError ? <p className="sig-in__error">{inviteError}</p> : null}
          {error ? <p className="sig-in__error">{error}</p> : null}

          {creating ? (
            <form onSubmit={(event) => void handleCreate(event)}>
              <label>
                Organisation
                <span className="sig-in__field">
                  <input value={invite?.organizationName ?? ''} readOnly />
                </span>
              </label>
              <label>
                Adresse e-mail
                <span className="sig-in__field">
                  <Mail aria-hidden />
                  <input type="email" value={invite?.email ?? ''} readOnly />
                </span>
              </label>
              <label>
                Prénom
                <span className="sig-in__field">
                  <input value={firstName} onChange={(event) => setFirstName(event.target.value)} required />
                </span>
              </label>
              <label>
                Nom
                <span className="sig-in__field">
                  <input value={lastName} onChange={(event) => setLastName(event.target.value)} required />
                </span>
              </label>
              <label>
                Mot de passe
                <span className="sig-in__field">
                  <Lock aria-hidden />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                  />
                </span>
              </label>
              <label>
                Confirmer le mot de passe
                <span className="sig-in__field">
                  <Lock aria-hidden />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={passwordConfirm}
                    onChange={(event) => setPasswordConfirm(event.target.value)}
                    required
                  />
                </span>
              </label>
              <button type="submit" className="sig-in__submit" disabled={busy}>
                {busy ? 'Activation…' : 'Activer mon compte'}
                <ArrowRight aria-hidden />
              </button>
            </form>
          ) : (
          <form onSubmit={(event) => void handleLogin(event)}>
            <label>
              Adresse e-mail
              <span className="sig-in__field">
                <Mail aria-hidden />
                <input
                  type="email"
                  autoComplete="username"
                  placeholder="nom@organisation.gn"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
              </span>
            </label>
            <label>
              Mot de passe
              <span className="sig-in__field">
                <Lock aria-hidden />
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
                <button
                  type="button"
                  aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                  onClick={() => setShowPassword((value) => !value)}
                >
                  {showPassword ? <EyeOff aria-hidden /> : <Eye aria-hidden />}
                </button>
              </span>
            </label>
            {needsMfa ? (
              <div className="sig-in__otp-block">
                <span className="sig-in__otp-label" id="sig-in-otp-label">
                  Code de vérification
                </span>
                <p className="sig-in__otp-hint">Un code à 6 chiffres a été envoyé sur votre e-mail.</p>
                <div className="sig-in__otp" role="group" aria-labelledby="sig-in-otp-label">
                  {Array.from({ length: 6 }, (_, index) => (
                    <input
                      key={index}
                      ref={(node) => {
                        otpRefs.current[index] = node
                      }}
                      inputMode="numeric"
                      autoComplete={index === 0 ? 'one-time-code' : 'off'}
                      aria-label={`Chiffre ${index + 1}`}
                      maxLength={1}
                      className={mfaCode[index] ? 'is-filled' : undefined}
                      value={mfaCode[index] ?? ''}
                      onChange={(event) => {
                        const digits = event.target.value.replace(/\D/g, '')
                        if (digits.length > 1) {
                          const merged = (mfaCode.slice(0, index) + digits).replace(/\D/g, '').slice(0, 6)
                          setMfaCode(merged)
                          otpRefs.current[Math.min(merged.length, 5)]?.focus()
                          return
                        }
                        const next = Array.from({ length: 6 }, (_, slot) => mfaCode[slot] ?? '')
                        next[index] = digits
                        setMfaCode(next.join(''))
                        if (digits && index < 5) otpRefs.current[index + 1]?.focus()
                      }}
                      onKeyDown={(event: KeyboardEvent<HTMLInputElement>) => {
                        if (event.key === 'Backspace' && !mfaCode[index] && index > 0) {
                          const next = Array.from({ length: 6 }, (_, slot) => mfaCode[slot] ?? '')
                          next[index - 1] = ''
                          setMfaCode(next.join(''))
                          otpRefs.current[index - 1]?.focus()
                        }
                      }}
                      onPaste={(event: ClipboardEvent<HTMLInputElement>) => {
                        const text = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
                        if (!text) return
                        event.preventDefault()
                        setMfaCode(text)
                        otpRefs.current[Math.min(text.length, 5)]?.focus()
                      }}
                    />
                  ))}
                </div>
                <div className="sig-in__otp-meta">
                  <span className={otpRemaining <= 0 ? 'is-expired' : undefined}>{formatOtpRemaining(otpRemaining)}</span>
                  <button
                    type="button"
                    disabled={resending || busy}
                    onClick={() => {
                      setResending(true)
                      setError(null)
                      void fetch('/api/auth/credentials-check', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          email: email.trim().toLowerCase(),
                          password,
                        }),
                      })
                        .then(async (res) => {
                          const json = (await res.json().catch(() => ({}))) as {
                            message?: string
                            requiresMfa?: boolean
                            expiresInSeconds?: number | null
                          }
                          if (json.requiresMfa) {
                            setMfaCode('')
                            startOtpWindow(json.expiresInSeconds)
                            otpRefs.current[0]?.focus()
                            return
                          }
                          setError(json.message ?? 'Nouveau code non envoyé.')
                        })
                        .catch(() => setError('Erreur réseau. Réessayez.'))
                        .finally(() => setResending(false))
                    }}
                  >
                    {resending ? 'Envoi…' : 'Renvoyer le code'}
                  </button>
                </div>
              </div>
            ) : null}
            <div className="sig-in__row">
              <label className="sig-in__remember">
                <Checkbox checked={remember} onCheckedChange={(checked) => setRemember(checked === true)} />
                Se souvenir de moi
              </label>
              <Link href="/forgot-password">Mot de passe oublié ?</Link>
            </div>
            <button type="submit" className="sig-in__submit" disabled={busy}>
              {busy ? 'Connexion…' : 'Se connecter et continuer'}
              <ArrowRight aria-hidden />
            </button>
          </form>
          )}
          <p className="sig-in__footnote">
            <Lock aria-hidden />
            <span>
              <strong>Accès réservé aux correspondants habilités.</strong>
              Le contenu du signalement est chiffré avant transmission.
            </span>
          </p>
        </section>
      </div>
    </div>
  )
}
