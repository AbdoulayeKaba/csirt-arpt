'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import {
  ArrowRight,
  Building2,
  Check,
  ChevronDown,
  ChevronRight,
  Clock,
  Copy,
  FileText,
  Headphones,
  Info,
  Lock,
  Mail,
  Shield,
  ShieldCheck,
  UserRound,
  X,
} from 'lucide-react'
import { CSIRT_BRAND } from '@/lib/csirt/brand'
import { CSIRT_PGP_SHORT, encryptForCsirt, pgpShortKeyMatches } from '@/lib/csirt/csirt-pgp'
import { cooldownMessage, formatCooldownWait } from '@/lib/csirt/signalement-cooldown'
import { CSIRT_INCIDENT_TYPES } from '@/lib/csirt/signalement'
import type { SignalementNature } from '@/lib/csirt/signalement-natures'
import type { IncidentSeverity } from '@/lib/types/incident'
import { CsirtCorrespondentLogout } from '@/components/csirt/csirt-correspondent-logout'
import './csirt-signalement-wizard.css'

const SEVERITIES: Array<{ id: IncidentSeverity; label: string; hint: string }> = [
  { id: 'CRITIQUE', label: 'Critique', hint: 'Service essentiel interrompu' },
  { id: 'ELEVE', label: 'Élevée', hint: 'Impact important' },
  { id: 'MOYEN', label: 'Moyenne', hint: 'Impact limité' },
  { id: 'FAIBLE', label: 'Faible', hint: 'Incident contenu' },
]

const STEPS = [
  { title: 'Informations personnelles', text: 'Votre identité et votre organisation' },
  { title: 'Nature du signalement', text: 'Type et contexte de l’incident' },
  { title: 'Détails de l’incident', text: 'Description, impact et preuves' },
  { title: 'Récapitulatif', text: 'Vérification et envoi' },
] as const

type Draft = {
  fullName: string
  role: string
  phone: string
  orgType: string
  orgName: string
  email: string
  types: string[]
  severity: IncidentSeverity | ''
  description: string
  measures: string
  target: string
  pgpKey: string
}

const EMPTY: Draft = {
  fullName: '',
  role: '',
  phone: '',
  orgType: '',
  orgName: '',
  email: '',
  types: [],
  severity: '',
  description: '',
  measures: '',
  target: '',
  pgpKey: '',
}

type Props = {
  initialEmail?: string
  initialOrganization?: string
  initialFullName?: string
  initialJobTitle?: string
  initialPhone?: string
  initialOrgType?: string
  initialOrgTypeLabel?: string
  initialCooldownUntil?: string | null
  onCancel?: () => void
}

export function CsirtSignalementWizard({
  initialEmail = '',
  initialOrganization = '',
  initialFullName = '',
  initialJobTitle = '',
  initialPhone = '',
  initialOrgType = '',
  initialOrgTypeLabel = '',
  initialCooldownUntil = null,
  onCancel,
}: Props) {
  const [step, setStep] = useState(0)
  const [cooldownUntil, setCooldownUntil] = useState<string | null>(initialCooldownUntil)
  const [now, setNow] = useState(() => Date.now())
  const [whyOpen, setWhyOpen] = useState(false)
  const [draft, setDraft] = useState<Draft>({
    ...EMPTY,
    fullName: initialFullName,
    role: initialJobTitle,
      phone: localPhone(initialPhone),
    email: initialEmail,
    orgName: initialOrganization,
    orgType: initialOrgType,
  })
  const [files, setFiles] = useState<File[]>([])
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)
  const [pgpCopied, setPgpCopied] = useState(false)
  const [reference, setReference] = useState('')
  const [natures, setNatures] = useState<SignalementNature[]>(
    CSIRT_INCIDENT_TYPES.map((item) => ({ id: item.id, label: item.label }))
  )

  useEffect(() => {
    setDraft((current) => ({
      ...current,
      fullName: initialFullName,
      role: initialJobTitle,
      phone: localPhone(initialPhone),
      email: initialEmail,
      orgName: initialOrganization,
      orgType: initialOrgType,
    }))
  }, [initialEmail, initialFullName, initialJobTitle, initialOrganization, initialOrgType, initialPhone])

  useEffect(() => {
    let mounted = true
    fetch('/api/signalement/referentials')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!mounted || !data) return
        if (Array.isArray(data.incidentTypes) && data.incidentTypes.length) setNatures(data.incidentTypes)
      })
      .catch(() => {})
    return () => {
      mounted = false
    }
  }, [])

  const patch = (partial: Partial<Draft>) => setDraft((current) => ({ ...current, ...partial }))

  const copyPgpKey = async () => {
    try {
      await navigator.clipboard.writeText(CSIRT_PGP_SHORT)
      setPgpCopied(true)
      window.setTimeout(() => setPgpCopied(false), 1600)
    } catch {
      setError('Impossible de copier la clé. Sélectionnez B71F 81AF 4410 EE2B.')
    }
  }

  useEffect(() => {
    if (!cooldownUntil) return
    if (Date.parse(cooldownUntil) <= Date.now()) {
      setCooldownUntil(null)
      return
    }
    const timer = window.setInterval(() => {
      const next = Date.now()
      if (Date.parse(cooldownUntil) <= next) {
        setCooldownUntil(null)
        return
      }
      setNow(next)
    }, 1000)
    return () => window.clearInterval(timer)
  }, [cooldownUntil])

  const cooldownRemainingMs = cooldownUntil ? Math.max(0, Date.parse(cooldownUntil) - now) : 0
  const coolingDown = Number.isFinite(cooldownRemainingMs) && cooldownRemainingMs > 0

  const natureLabels = useMemo(
    () => natures.filter((item) => draft.types.includes(item.id)).map((item) => item.label),
    [natures, draft.types]
  )

  const validateStep = (index: number) => {
    if (index === 0) {
      if (!initialFullName.trim()) return 'Complétez votre nom dans votre profil avant de signaler.'
      if (!initialEmail.trim()) return 'Aucune adresse e-mail n’est associée à ce compte.'
      if (!initialOrganization.trim()) return 'Aucune organisation n’est associée à ce compte.'
      if (!pgpShortKeyMatches(draft.pgpKey)) {
        return 'Copiez la clé publique affichée à côté de « Besoin d’aide ? ».'
      }
    }
    if (index === 1 && draft.types.length === 0) return 'Sélectionnez au moins un type d’incident.'
    if (index === 1 && !draft.severity) return 'Indiquez la gravité de l’incident.'
    if (index === 2 && draft.description.trim().length < 20) {
      return 'Décrivez l’incident avec un peu plus de détail (20 caractères minimum).'
    }
    return ''
  }

  const goNext = () => {
    if (coolingDown) {
      setError(cooldownMessage(cooldownRemainingMs))
      return
    }
    const message = validateStep(step)
    setError(message)
    if (!message) setStep((current) => Math.min(current + 1, STEPS.length - 1))
  }

  const submit = async () => {
    if (coolingDown) {
      setError(cooldownMessage(cooldownRemainingMs))
      return
    }
    for (let index = 0; index < 3; index += 1) {
      const message = validateStep(index)
      if (message) {
        setStep(index)
        setError(message)
        return
      }
    }
    setSending(true)
    setError('')
    try {
      const phone = draft.phone.trim() ? `+224 ${draft.phone.trim()}` : ''
      const context = `Fonction : ${draft.role.trim()}`
      const plain = [
        draft.description.trim(),
        draft.measures.trim() ? `Mesures déjà prises :\n${draft.measures.trim()}` : '',
        draft.target.trim() ? `Cible : ${draft.target.trim()}` : '',
        context,
      ]
        .filter(Boolean)
        .join('\n\n')
      const sealed = await encryptForCsirt(plain)
      const formData = new FormData()
      formData.set('identify', 'yes')
      formData.set('fullName', draft.fullName.trim())
      formData.set('declarantType', draft.orgType)
      formData.set('organization', draft.orgName.trim())
      formData.set('email', draft.email.trim())
      formData.set('phone', phone)
      formData.set('types', JSON.stringify(draft.types))
      formData.set('severity', draft.severity)
      formData.set('pgpKey', draft.pgpKey.trim())
      formData.set('description', sealed)
      formData.set('measures', '')
      formData.set('target', '')
      formData.set('reported', 'no')
      for (const file of files) formData.append('files', file)
      const response = await fetch('/api/signalement', { method: 'POST', body: formData })
      const raw = await response.text()
      const data = raw.trim()
        ? (JSON.parse(raw) as { ok?: boolean; reference?: string; error?: string; retryAt?: string })
        : {}
      if (response.status === 429 && data.retryAt) setCooldownUntil(data.retryAt)
      if (!response.ok || !data.ok || !data.reference) {
        throw new Error(data.error || 'Envoi impossible pour le moment.')
      }
      setReference(data.reference)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Envoi impossible pour le moment.')
    } finally {
      setSending(false)
    }
  }

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (step < STEPS.length - 1) goNext()
    else void submit()
  }

  if (reference) {
    return (
      <div className="sig-wiz sig-wiz__done">
        <ShieldCheck aria-hidden />
        <h1>Signalement transmis</h1>
        <p>
          Votre déclaration a été reçue par le {CSIRT_BRAND.name}. Conservez la référence <strong>{reference}</strong>.
          Un nouvel envoi sera possible dans 5 minutes.
        </p>
        <Link href="/">Retour à l’accueil</Link>
        <CsirtCorrespondentLogout className="sig-wiz__logout" />
      </div>
    )
  }

  return (
    <div className="sig-wiz">
      <div className="sig-wiz__wrap">
        <ol className="sig-wiz__steps" aria-label="Étapes du signalement">
          {STEPS.map((item, index) => (
            <li key={item.title} className={index === step ? 'is-current' : index < step ? 'is-done' : undefined}>
              {index > 0 ? <ChevronRight aria-hidden /> : null}
              <button type="button" disabled={index > step} onClick={() => index < step && setStep(index)}>
                <span>{index < step ? <Check aria-hidden /> : index + 1}</span>
                <span>
                  <strong>{item.title}</strong>
                  <small>{item.text}</small>
                </span>
              </button>
            </li>
          ))}
        </ol>

        <div className="sig-wiz__layout">
          <aside className="sig-wiz__side">
            <article className="is-session">
              <header>
                <UserRound aria-hidden />
                <strong>{initialEmail || 'Session correspondant'}</strong>
              </header>
              <CsirtCorrespondentLogout className="sig-wiz__logout" />
              <Link href="/signalement/profil" className="sig-wiz__profile">
                Mon profil
              </Link>
            </article>
            <article className={whyOpen ? 'is-why is-open' : 'is-why'}>
              <button
                type="button"
                aria-expanded={whyOpen}
                onClick={() => setWhyOpen((value) => !value)}
              >
                <Info aria-hidden />
                <strong>Pourquoi ces informations ?</strong>
                <ChevronDown aria-hidden />
              </button>
              {whyOpen ? (
                <p>
                  Ces informations permettent au {CSIRT_BRAND.name} de vous recontacter si nécessaire pour
                  obtenir des précisions, assurer le suivi et vous communiquer le traitement de votre signalement.
                </p>
              ) : null}
            </article>
            {whyOpen ? (
              <ul>
                <li>
                  <Lock aria-hidden />
                  <span>
                    <strong>Confidentialité garantie</strong>
                    Vos données sont chiffrées et accessibles uniquement à l’équipe habilitée du {CSIRT_BRAND.name}.
                  </span>
                </li>
                <li>
                  <ShieldCheck aria-hidden />
                  <span>
                    <strong>Utilisation unique</strong>
                    Ces informations sont utilisées uniquement dans le cadre du traitement de l’incident.
                  </span>
                </li>
                <li>
                  <UserRound aria-hidden />
                  <span>
                    <strong>Signalement en tant qu’organisation</strong>
                    Vous signalez pour le compte d’une organisation, avec votre adresse e-mail professionnelle.
                  </span>
                </li>
              </ul>
            ) : null}
            <article className="is-help">
              <header>
                <Headphones aria-hidden />
                <strong>Besoin d’aide ?</strong>
              </header>
              <div className="sig-wiz__pgp">
                <span>Clé publique</span>
                <code>{CSIRT_PGP_SHORT}</code>
                <button type="button" onClick={() => void copyPgpKey()}>
                  {pgpCopied ? <Check aria-hidden /> : <Copy aria-hidden />}
                  {pgpCopied ? 'Copiée' : 'Copier'}
                </button>
              </div>
            </article>
          </aside>

          <form className="sig-wiz__card" onSubmit={onSubmit}>
            <header className="sig-wiz__card-head">
              <span>{step + 1}</span>
              <UserRound aria-hidden />
              <div>
                <h2>{STEPS[step].title}</h2>
                <p>
                  {step === 0 ? (
                    <Link href="/signalement/profil" className="sig-wiz__profile">
                      Pour modifier le nom, la fonction ou l’organisation, ouvrez votre profil.
                    </Link>
                  ) : (
                    STEPS[step].text
                  )}
                </p>
              </div>
            </header>

            {coolingDown ? (
              <p className="sig-wiz__wait" role="status">
                <Clock aria-hidden />
                <span>
                  Une déclaration vient d’être envoyée. Vous pourrez soumettre un autre incident dans{' '}
                  <strong>{formatCooldownWait(cooldownRemainingMs)}</strong>.
                </span>
              </p>
            ) : null}

            {step === 0 ? (
              <>
                <fieldset>
                  <legend>
                    <UserRound aria-hidden /> Identité du déclarant
                  </legend>
                  <div className="is-3">
                    <Field label="Nom et prénom">
                      <input readOnly value={shown(initialFullName)} />
                    </Field>
                    <Field label="Fonction">
                      <input readOnly value={shown(initialJobTitle)} />
                    </Field>
                    <Field label="Téléphone">
                      <PhoneInput value={draft.phone} onChange={(phone) => patch({ phone })} />
                    </Field>
                  </div>
                </fieldset>
                <fieldset>
                  <legend>
                    <Building2 aria-hidden /> Informations de l’organisation
                  </legend>
                  <div className="is-3">
                    <Field label="Type d’organisation">
                      <input readOnly value={shown(initialOrgTypeLabel)} />
                    </Field>
                    <Field label="Nom de l’organisation">
                      <input readOnly value={shown(initialOrganization)} />
                    </Field>
                    <Field label="Adresse e-mail professionnelle">
                      <span className="sig-wiz__icon-field">
                        <Mail aria-hidden />
                        <input type="email" readOnly value={shown(initialEmail)} />
                      </span>
                    </Field>
                  </div>
                </fieldset>
                <Field label="Clé publique" required>
                  <input
                    value={draft.pgpKey}
                    spellCheck={false}
                    autoComplete="off"
                    placeholder={CSIRT_PGP_SHORT}
                    onChange={(event) => patch({ pgpKey: event.target.value })}
                  />
                  <small className="sig-wiz__pgp-hint">
                    Copiez la clé affichée à côté de « Besoin d’aide ? ». Le signalement est chiffré avec cette clé.
                  </small>
                </Field>
                <p className="sig-wiz__note">
                  <Info aria-hidden />
                  Ces informations peuvent être utilisées par l’équipe du {CSIRT_BRAND.name} pour vous recontacter si
                  des précisions supplémentaires sont nécessaires.
                </p>
              </>
            ) : null}

            {step === 1 ? (
              <fieldset>
                <legend>
                  <Shield aria-hidden /> Type d’incident
                </legend>
                <div className="sig-wiz__types">
                  {natures.map((item) => {
                    const checked = draft.types.includes(item.id)
                    return (
                      <label key={item.id} className={checked ? 'is-on' : undefined}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() =>
                            patch({
                              types: checked
                                ? draft.types.filter((id) => id !== item.id)
                                : [...draft.types, item.id],
                            })
                          }
                        />
                        <span>{item.label}</span>
                      </label>
                    )
                  })}
                </div>
                <p className="sig-wiz__severity-label">
                  Gravité de l’incident <em>*</em>
                </p>
                <div className="sig-wiz__severity" role="radiogroup" aria-label="Gravité de l’incident">
                  {SEVERITIES.map((item) => (
                    <label key={item.id} className={draft.severity === item.id ? `is-on is-${item.id.toLowerCase()}` : `is-${item.id.toLowerCase()}`}>
                      <input
                        type="radio"
                        name="incident-severity"
                        value={item.id}
                        checked={draft.severity === item.id}
                        onChange={() => patch({ severity: item.id })}
                      />
                      <span>
                        <strong>{item.label}</strong>
                        <small>{item.hint}</small>
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>
            ) : null}

            {step === 2 ? (
              <fieldset className="sig-wiz__details">
                <legend>
                  <FileText aria-hidden /> Description
                </legend>
                <Field label="Description détaillée" required>
                  <textarea
                    required
                    rows={5}
                    placeholder="Chronologie, systèmes concernés, symptômes, impact..."
                    value={draft.description}
                    onChange={(event) => patch({ description: event.target.value })}
                  />
                </Field>
                <Field label="Mesures déjà prises">
                  <textarea
                    rows={3}
                    placeholder="Actions déjà entreprises..."
                    value={draft.measures}
                    onChange={(event) => patch({ measures: event.target.value })}
                  />
                </Field>
                <Field label="Cible (URL / IP / domaine)">
                  <input
                    placeholder="https://exemple.gov.gn ou 192.0.2.1"
                    value={draft.target}
                    onChange={(event) => patch({ target: event.target.value })}
                  />
                </Field>
                <Field label="Pièces jointes">
                  <input
                    type="file"
                    multiple
                    onChange={(event) => setFiles(Array.from(event.target.files ?? []).slice(0, 6))}
                  />
                </Field>
              </fieldset>
            ) : null}

            {step === 3 ? (
              <dl className="sig-wiz__recap">
                <div>
                  <dt>Déclarant</dt>
                  <dd>
                    {draft.fullName} — {draft.role}
                  </dd>
                </div>
                <div>
                  <dt>Organisation</dt>
                  <dd>
                    {draft.orgName}
                    {initialOrgTypeLabel ? ` (${initialOrgTypeLabel})` : ''}
                  </dd>
                </div>
                <div>
                  <dt>Contact</dt>
                  <dd>
                    {draft.email}
                    {draft.phone.trim() ? ` — +224 ${draft.phone.trim()}` : ''}
                  </dd>
                </div>
                <div>
                  <dt>Nature</dt>
                  <dd>{natureLabels.join(', ') || '—'}</dd>
                </div>
                <div>
                  <dt>Gravité</dt>
                  <dd>{SEVERITIES.find((item) => item.id === draft.severity)?.label || '—'}</dd>
                </div>
                <div>
                  <dt>Clé publique</dt>
                  <dd>{draft.pgpKey.trim() || '—'}</dd>
                </div>
                <div>
                  <dt>Description</dt>
                  <dd>{draft.description}</dd>
                </div>
              </dl>
            ) : null}

            {error ? (
              <p className="sig-wiz__error" role="alert">
                {error}
              </p>
            ) : null}

            <footer className="sig-wiz__actions">
              {onCancel ? (
                <button type="button" className="is-ghost" onClick={onCancel}>
                  <X aria-hidden /> Annuler
                </button>
              ) : (
                <Link href="/" className="is-ghost">
                  <X aria-hidden /> Annuler
                </Link>
              )}
              {step > 0 ? (
                <button type="button" className="is-ghost" onClick={() => setStep((current) => current - 1)}>
                  Précédent
                </button>
              ) : null}
              <button type="submit" className="is-next" disabled={sending || coolingDown}>
                {step === STEPS.length - 1 ? (sending ? 'Envoi…' : 'Envoyer') : 'Suivant'}
                <ArrowRight aria-hidden />
              </button>
            </footer>
          </form>
        </div>
      </div>
    </div>
  )
}

function shown(value: string) {
  const text = value.trim()
  return text || 'Non renseigné'
}

function localPhone(value: string) {
  return value.replace(/^\+?\s*224\s*/, '').trim()
}

function Field({ label, required, children }: { label: string; required?: boolean; children: ReactNode }) {
  return (
    <label>
      <span>
        {label}
        {required ? <em> *</em> : null}
      </span>
      {children}
    </label>
  )
}

function PhoneInput({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <span className="sig-wiz__phone">
      <i aria-hidden />
      <b>+224</b>
      <input
        inputMode="tel"
        placeholder="620 00 00 00"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </span>
  )
}
