'use client'

import { useEffect, useRef, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeftRight,
  Briefcase,
  Building2,
  Camera,
  Check,
  ChevronRight,
  Clock,
  Copy,
  Eye,
  EyeOff,
  Home,
  KeyRound,
  Loader2,
  Lock,
  Mail,
  Monitor,
  Pencil,
  Phone,
  Save,
  ShieldCheck,
  UserRound,
} from 'lucide-react'
import { passwordPolicyErrorMessage } from '@/lib/auth/password-policy'
import './csirt-correspondent-profile.css'

type Profile = {
  firstName: string
  lastName: string
  phone: string
  department: string
  email: string
  lastLoginAt: string | null
  avatarUrl: string | null
}

type SessionIdentity = {
  canSubmit?: boolean
  organizationName?: string
  organizationSlug?: string
  organizationNotes?: string
  organizationActive?: boolean
  declarantTypeLabel?: string
}

export function CsirtCorrespondentProfile() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [denied, setDenied] = useState(false)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [organizationName, setOrganizationName] = useState('')
  const [organizationSlug, setOrganizationSlug] = useState('')
  const [organizationNotes, setOrganizationNotes] = useState('')
  const [organizationActive, setOrganizationActive] = useState(true)
  const [declarantLabel, setDeclarantLabel] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false)
  const [copied, setCopied] = useState(false)
  const [orgNotice, setOrgNotice] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [savingInfo, setSavingInfo] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)
  const [mfaEnabled, setMfaEnabled] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const avatarInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    let cancelled = false
    void Promise.all([
      fetch('/api/signalement/session', { cache: 'no-store' }).then((res) => res.json()),
      fetch('/api/account', { cache: 'no-store', headers: { 'x-csirt-realm': 'portal' } }).then(async (res) => ({
        ok: res.ok,
        json: await res.json().catch(() => ({})),
      })),
      fetch('/api/account/two-factor', { cache: 'no-store', headers: { 'x-csirt-realm': 'portal' } }).then(async (res) => ({
        ok: res.ok,
        json: await res.json().catch(() => ({})),
      })),
    ])
      .then(([session, account, mfa]) => {
        if (cancelled) return
        const identity = session as SessionIdentity
        if (!identity.canSubmit) {
          setDenied(true)
          router.replace('/signalement')
          return
        }
        const user = account.json.user as Profile | undefined
        if (!account.ok || !user) {
          setError('Impossible de charger le profil.')
          return
        }
        setOrganizationName(identity.organizationName ?? '')
        setOrganizationSlug(identity.organizationSlug ?? '')
        setOrganizationNotes(identity.organizationNotes ?? '')
        setOrganizationActive(identity.organizationActive !== false)
        setDeclarantLabel(identity.declarantTypeLabel ?? '')
        setProfile({
          firstName: user.firstName ?? '',
          lastName: user.lastName ?? '',
          phone: user.phone ?? '',
          department: user.department ?? '',
          email: user.email ?? '',
          lastLoginAt: user.lastLoginAt ?? null,
          avatarUrl: user.avatarUrl ?? null,
        })
        setAvatarUrl(user.avatarUrl ?? null)
        if (mfa.ok) setMfaEnabled(Boolean(mfa.json.enabled))
      })
      .catch(() => {
        if (!cancelled) setError('Impossible de charger le profil.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [router])

  const saveInfo = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!profile) return
    setError('')
    setMessage('')
    if (!profile.firstName.trim() || !profile.lastName.trim()) {
      setError('Le prénom et le nom sont obligatoires.')
      return
    }
    setSavingInfo(true)
    try {
      const res = await fetch('/api/account', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-csirt-realm': 'portal' },
        body: JSON.stringify({
          firstName: profile.firstName.trim(),
          lastName: profile.lastName.trim(),
          phone: profile.phone.trim(),
          department: profile.department.trim(),
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError('Enregistrement impossible.')
        return
      }
      setMessage('Informations enregistrées. Elles seront reprises sur le formulaire de signalement.')
      if (json.user) {
        setProfile((current) =>
          current
            ? {
                ...current,
                firstName: json.user.firstName ?? current.firstName,
                lastName: json.user.lastName ?? current.lastName,
                phone: json.user.phone ?? '',
                department: json.user.department ?? '',
              }
            : current
        )
      }
    } finally {
      setSavingInfo(false)
    }
  }

  const savePassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!profile) return
    setError('')
    setMessage('')
    if (password !== passwordConfirm) {
      setError('Les mots de passe ne correspondent pas.')
      return
    }
    setSavingPassword(true)
    try {
      const res = await fetch('/api/account', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-csirt-realm': 'portal' },
        body: JSON.stringify({
          firstName: profile.firstName.trim(),
          lastName: profile.lastName.trim(),
          phone: profile.phone.trim(),
          department: profile.department.trim(),
          password,
          passwordConfirm,
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(passwordPolicyErrorMessage(String(json.error ?? '')))
        return
      }
      await fetch('/api/auth/portal/logout', { method: 'POST' })
      router.push('/signalement')
      router.refresh()
    } finally {
      setSavingPassword(false)
    }
  }

  const uploadAvatar = async (file: File) => {
    setError('')
    setMessage('')
    if (!file.type.startsWith('image/')) {
      setError('Choisissez une image JPG, PNG, WebP ou GIF.')
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      setError('Image trop lourde (2 Mo maximum).')
      return
    }
    setUploadingAvatar(true)
    try {
      const body = new FormData()
      body.set('file', file)
      const res = await fetch('/api/account/avatar', {
        method: 'POST',
        headers: { 'x-csirt-realm': 'portal' },
        body,
      })
      const json = (await res.json().catch(() => ({}))) as { avatarUrl?: string; error?: string }
      if (!res.ok || !json.avatarUrl) {
        setError(
          json.error === 'UNSUPPORTED_FILE_TYPE'
            ? 'Formats acceptés : JPG, PNG, WebP ou GIF.'
            : 'Photo non enregistrée.'
        )
        return
      }
      setAvatarUrl(json.avatarUrl)
      setMessage('Photo de profil mise à jour.')
    } finally {
      setUploadingAvatar(false)
      if (avatarInputRef.current) avatarInputRef.current.value = ''
    }
  }

  const removeAvatar = async () => {
    setError('')
    setMessage('')
    setUploadingAvatar(true)
    try {
      const res = await fetch('/api/account/avatar', {
        method: 'DELETE',
        headers: { 'x-csirt-realm': 'portal' },
      })
      if (!res.ok) {
        setError('Suppression de la photo impossible.')
        return
      }
      setAvatarUrl(null)
      setMessage('Photo de profil retirée.')
    } finally {
      setUploadingAvatar(false)
    }
  }

  if (loading || denied || !profile && !error) {
    return (
      <div className="sig-profile sig-profile__loading">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        Chargement du profil…
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="sig-profile">
        <p className="sig-profile__error">{error || 'Profil indisponible.'}</p>
        <Link href="/signalement">Retour au signalement</Link>
      </div>
    )
  }

  const loginLabel = formatLogin(profile.lastLoginAt)
  const initials =
    [profile.firstName, profile.lastName]
      .map((part) => part.trim().charAt(0).toUpperCase())
      .filter(Boolean)
      .slice(0, 2)
      .join('') || 'C'

  const copySlug = async () => {
    if (!organizationSlug) return
    try {
      await navigator.clipboard.writeText(organizationSlug)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    } catch {
      setError('Copie impossible.')
    }
  }

  return (
    <div className="sig-profile">
      <div className="sig-profile__wrap">
        <nav className="sig-profile__crumb" aria-label="Fil d’Ariane">
          <Link href="/" aria-label="Accueil">
            <Home aria-hidden />
          </Link>
          <ChevronRight aria-hidden />
          <Link href="/signalement">Signalement</Link>
          <ChevronRight aria-hidden />
          <span aria-current="page">Mon profil</span>
        </nav>

        <header className="sig-profile__banner">
          <div className="sig-profile__photo">
            <button
              type="button"
              className="sig-profile__photo-btn"
              onClick={() => avatarInputRef.current?.click()}
              disabled={uploadingAvatar}
              aria-label={avatarUrl ? 'Changer la photo de profil' : 'Ajouter une photo de profil'}
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt="" />
              ) : (
                <span className="sig-profile__photo-fallback">{initials}</span>
              )}
              <span className="sig-profile__photo-badge" aria-hidden>
                {uploadingAvatar ? <Loader2 className="animate-spin" /> : <Camera />}
              </span>
            </button>
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              hidden
              onChange={(event) => {
                const file = event.target.files?.[0]
                if (file) void uploadAvatar(file)
              }}
            />
            <span className="sig-profile__photo-actions">
              <button type="button" className="sig-profile__photo-link" onClick={() => avatarInputRef.current?.click()} disabled={uploadingAvatar}>
                {avatarUrl ? 'Changer' : 'Ajouter'}
              </button>
              {avatarUrl ? (
                <button type="button" className="sig-profile__photo-remove" onClick={() => void removeAvatar()} disabled={uploadingAvatar}>
                  Retirer
                </button>
              ) : null}
            </span>
          </div>
          <div>
            <h1>Mon profil</h1>
            <p>
              Ces informations alimentent le formulaire de signalement. L’organisation et l’e-mail restent ceux de votre
              compte.
            </p>
          </div>
        </header>

        {message ? (
          <p className="sig-profile__note" role="status">
            {message}
          </p>
        ) : null}
        {error ? (
          <p className="sig-profile__error" role="alert">
            {error}
          </p>
        ) : null}

        <div className="sig-profile__layout">
          <div className="sig-profile__col">
            <form id="sig-profile-info" className="sig-profile__card" onSubmit={(event) => void saveInfo(event)}>
              <header className="sig-profile__card-head">
                <span className="sig-profile__ico" aria-hidden>
                  <UserRound />
                </span>
                <div>
                  <h2>Informations personnelles</h2>
                  <p>Vos informations d’identification et de contact.</p>
                </div>
                <button type="submit" className="sig-profile__ghost" disabled={savingInfo}>
                  <Pencil aria-hidden />
                  Mettre à jour
                </button>
              </header>

              <div className="sig-profile__fields sig-profile__fields--3">
                <label className="sig-field">
                  <span>
                    Prénom <abbr title="obligatoire">*</abbr>
                  </span>
                  <span className="sig-field__control">
                    <UserRound aria-hidden />
                    <input
                      required
                      autoComplete="given-name"
                      value={profile.firstName}
                      onChange={(event) => setProfile({ ...profile, firstName: event.target.value })}
                    />
                  </span>
                </label>
                <label className="sig-field">
                  <span>
                    Nom <abbr title="obligatoire">*</abbr>
                  </span>
                  <span className="sig-field__control">
                    <UserRound aria-hidden />
                    <input
                      required
                      autoComplete="family-name"
                      value={profile.lastName}
                      onChange={(event) => setProfile({ ...profile, lastName: event.target.value })}
                    />
                  </span>
                </label>
                <label className="sig-field">
                  <span>Fonction</span>
                  <span className="sig-field__control">
                    <Briefcase aria-hidden />
                    <input
                      placeholder="Votre fonction"
                      value={profile.department}
                      onChange={(event) => setProfile({ ...profile, department: event.target.value })}
                    />
                  </span>
                </label>
              </div>
              <div className="sig-profile__fields sig-profile__fields--2">
                <label className="sig-field">
                  <span>Téléphone</span>
                  <span className="sig-field__control">
                    <Phone aria-hidden />
                    <input
                      type="tel"
                      autoComplete="tel"
                      placeholder="+224 …"
                      value={profile.phone}
                      onChange={(event) => setProfile({ ...profile, phone: event.target.value })}
                    />
                  </span>
                </label>
                <label className="sig-field">
                  <span>
                    Adresse e-mail <abbr title="obligatoire">*</abbr>
                  </span>
                  <span className="sig-field__control">
                    <Mail aria-hidden />
                    <input readOnly value={profile.email} aria-readonly="true" title="Adresse du compte, non modifiable" />
                  </span>
                </label>
              </div>
            </form>

            <section className="sig-profile__card" aria-labelledby="sig-org-title">
              <header className="sig-profile__card-head">
                <span className="sig-profile__ico" aria-hidden>
                  <Building2 />
                </span>
                <div>
                  <h2 id="sig-org-title">Organisation</h2>
                  <p>L’organisation est liée à votre compte et utilisée lors des signalements.</p>
                </div>
              </header>

              <div className="sig-org">
                <span className="sig-org__mark" aria-hidden>
                  <Building2 />
                </span>
                <div className="sig-org__body">
                  <small>Organisation actuelle</small>
                  <strong>{organizationName || 'Non renseignée'}</strong>
                  {organizationNotes ? <span>{organizationNotes}</span> : null}
                </div>
                <span className={organizationActive ? 'sig-pill is-on' : 'sig-pill'}>
                  <i aria-hidden />
                  {organizationActive ? 'Active' : 'Inactive'}
                </span>
                <button type="button" className="sig-profile__outline" onClick={() => setOrgNotice((open) => !open)}>
                  <ArrowLeftRight aria-hidden />
                  Changer d’organisation
                </button>
              </div>
              {orgNotice ? (
                <p className="sig-profile__hint">
                  Le rattachement est défini par le CSIRT-ARPT. Contactez l’administrateur pour le modifier.
                </p>
              ) : null}

              <div className="sig-profile__fields sig-profile__fields--2">
                <div className="sig-field">
                  <span>Type d’organisation</span>
                  <span className="sig-field__control is-static">
                    {declarantLabel ? <em className="sig-type">{declarantLabel}</em> : <em className="sig-type is-empty">Non renseigné</em>}
                  </span>
                </div>
                <div className="sig-field">
                  <span>Code / SLUG</span>
                  <span className="sig-field__control is-slug">
                    <input readOnly value={organizationSlug || '—'} aria-label="Code de l’organisation" />
                    <button
                      type="button"
                      className="sig-field__copy"
                      onClick={() => void copySlug()}
                      disabled={!organizationSlug}
                      aria-label={copied ? 'Code copié' : 'Copier le code'}
                    >
                      {copied ? <Check aria-hidden /> : <Copy aria-hidden />}
                    </button>
                  </span>
                </div>
              </div>
            </section>

            <button type="submit" form="sig-profile-info" className="sig-profile__btn" disabled={savingInfo}>
              <Save aria-hidden />
              {savingInfo ? 'Enregistrement…' : 'Enregistrer les informations'}
            </button>
          </div>

          <div className="sig-profile__col">
            <form className="sig-profile__card" onSubmit={(event) => void savePassword(event)}>
              <header className="sig-profile__card-head">
                <span className="sig-profile__ico" aria-hidden>
                  <Lock />
                </span>
                <div>
                  <h2>Sécurité du compte</h2>
                  <p>Gérez votre mot de passe et l’authentification.</p>
                </div>
              </header>
              <div className="sig-profile__subhead">
                <KeyRound aria-hidden />
                <div>
                  <strong>Changer le mot de passe</strong>
                  <p>Après le changement, une nouvelle connexion sera demandée.</p>
                </div>
              </div>
              <div className="sig-profile__fields sig-profile__fields--2">
                <label className="sig-field">
                  <span>
                    Nouveau mot de passe <abbr title="obligatoire">*</abbr>
                  </span>
                  <span className="sig-field__control">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      required
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                    />
                    <button
                      type="button"
                      className="sig-field__eye"
                      onClick={() => setShowPassword((open) => !open)}
                      aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                    >
                      {showPassword ? <EyeOff aria-hidden /> : <Eye aria-hidden />}
                    </button>
                  </span>
                </label>
                <label className="sig-field">
                  <span>
                    Confirmer le mot de passe <abbr title="obligatoire">*</abbr>
                  </span>
                  <span className="sig-field__control">
                    <input
                      type={showPasswordConfirm ? 'text' : 'password'}
                      autoComplete="new-password"
                      required
                      value={passwordConfirm}
                      onChange={(event) => setPasswordConfirm(event.target.value)}
                    />
                    <button
                      type="button"
                      className="sig-field__eye"
                      onClick={() => setShowPasswordConfirm((open) => !open)}
                      aria-label={showPasswordConfirm ? 'Masquer la confirmation' : 'Afficher la confirmation'}
                    >
                      {showPasswordConfirm ? <EyeOff aria-hidden /> : <Eye aria-hidden />}
                    </button>
                  </span>
                </label>
              </div>
              <button type="submit" className="sig-profile__btn is-block" disabled={savingPassword}>
                <KeyRound aria-hidden />
                {savingPassword ? 'Changement…' : 'Changer le mot de passe'}
              </button>
            </form>

            <section className="sig-profile__card" aria-labelledby="sig-mfa-title">
              <header className="sig-profile__card-head">
                <span className="sig-profile__ico" aria-hidden>
                  <ShieldCheck />
                </span>
                <div>
                  <h2 id="sig-mfa-title">Authentification à deux facteurs</h2>
                  <p>Ce réglage est appliqué par l’administrateur du CSIRT.</p>
                </div>
              </header>
              <p className={`sig-profile__info${mfaEnabled ? ' is-ok' : ''}`}>
                <ShieldCheck aria-hidden />
                <span>
                  {mfaEnabled
                    ? 'La double authentification est activée. Un code à 6 chiffres est envoyé sur votre e-mail à chaque connexion.'
                    : 'La double authentification n’est pas activée. Seul un administrateur peut l’activer ou la désactiver.'}
                </span>
              </p>
            </section>

            <section className="sig-profile__card" aria-labelledby="sig-activity-title">
              <header className="sig-profile__card-head">
                <span className="sig-profile__ico" aria-hidden>
                  <Clock />
                </span>
                <div>
                  <h2 id="sig-activity-title">Activité récente</h2>
                  <p>Dernières connexions à votre compte.</p>
                </div>
              </header>
              {loginLabel ? (
                <div className="sig-activity">
                  <span aria-hidden>
                    <Monitor />
                  </span>
                  <div>
                    <strong>Connexion réussie</strong>
                    <small>Dernière connexion enregistrée</small>
                  </div>
                  <time dateTime={profile.lastLoginAt ?? undefined}>{loginLabel}</time>
                </div>
              ) : (
                <p className="sig-profile__empty">Aucune connexion enregistrée pour le moment.</p>
              )}
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}

function formatLogin(value: string | null) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}
