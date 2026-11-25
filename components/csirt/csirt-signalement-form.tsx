'use client'

import Link from 'next/link'
import { useEffect, useMemo, useRef, useState, type ChangeEvent, type DragEvent, type FormEvent } from 'react'
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronRight,
  FileText,
  FileUp,
  Lock,
  Mail,
  Paperclip,
  Search,
  ShieldAlert,
  ShieldCheck,
  UserRound,
  X,
} from 'lucide-react'
import { CSIRT_INCIDENT_TYPES } from '@/lib/csirt/signalement'
import type { SignalementNature } from '@/lib/csirt/signalement-natures'
import {
  evaluateSignalementEmail,
  filterOrganisationsByDeclarantType,
  findOrganisationByLabel,
  formatEmailDomainsHint,
  formatEmailExample,
  validateSignalementEmail,
  type SignalementOrganisation,
} from '@/lib/csirt/signalement-referentials'
import {
  DEFAULT_DECLARANT_TYPES_SEED,
  DEFAULT_NATURES_SIGNALEMENT_SEED,
  DEFAULT_ORGANISATIONS_SEED,
} from '@/lib/seed/referentials-default'
import {
  CsirtSignalementCaptcha,
  type CaptchaValue,
} from '@/components/csirt/csirt-signalement-captcha'

type IdentityChoice = 'yes' | 'no' | ''

type FormState = {
  identify: IdentityChoice
  declarantType: string
  organization: string
  email: string
  types: string[]
  description: string
  measures: string
  target: string
}

const INITIAL: FormState = {
  identify: '',
  declarantType: '',
  organization: '',
  email: '',
  types: [],
  description: '',
  measures: '',
  target: '',
}

export type SignalementCorrespondentIdentity = {
  email: string
  firstName: string
  lastName: string
  organizationName: string
}

type FormProps = {
  /** Flag serveur : parcours anonyme conservé mais désactivé par défaut. */
  anonymousEnabled?: boolean
  mode?: 'public' | 'correspondent'
  correspondent?: SignalementCorrespondentIdentity
}

export function CsirtSignalementForm({
  anonymousEnabled = false,
  mode = 'public',
  correspondent,
}: FormProps) {
  const isCorrespondent = mode === 'correspondent'
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [form, setForm] = useState<FormState>(() =>
    isCorrespondent
      ? {
          ...INITIAL,
          identify: 'yes',
          organization: correspondent?.organizationName ?? '',
          email: correspondent?.email ?? '',
        }
      : INITIAL
  )
  const [typeQuery, setTypeQuery] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [legalOpen, setLegalOpen] = useState(true)
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)
  const [reference, setReference] = useState('')
  const [ackEmailSent, setAckEmailSent] = useState(false)
  const [emailTouched, setEmailTouched] = useState(false)
  const [captcha, setCaptcha] = useState<CaptchaValue>(null)

  useEffect(() => {
    if (!isCorrespondent || !correspondent) return
    setForm((current) => ({
      ...current,
      identify: 'yes',
      organization: correspondent.organizationName,
      email: correspondent.email,
    }))
  }, [isCorrespondent, correspondent])

  // Options dynamiques chargées depuis les Référentiels & Nomenclatures
  const [declarantOptions, setDeclarantOptions] = useState<Array<{ id: string; label: string }>>(() =>
    DEFAULT_DECLARANT_TYPES_SEED.map((d) => ({ id: d.value || d.name, label: d.name }))
  )
  const [organisationOptions, setOrganisationOptions] = useState<SignalementOrganisation[]>(() =>
    DEFAULT_ORGANISATIONS_SEED.map((o) => ({
      id: o.value || o.name,
      label: o.name,
      declarantType: o.meta?.declarantType || '',
      emailDomains: o.meta?.emailDomains || [],
    }))
  )
  const [incidentTypeOptions, setIncidentTypeOptions] = useState<SignalementNature[]>(() =>
    DEFAULT_NATURES_SIGNALEMENT_SEED.length > 0
      ? DEFAULT_NATURES_SIGNALEMENT_SEED.map((item) => ({
          id: item.value || item.name,
          label: item.name,
        }))
      : CSIRT_INCIDENT_TYPES.map((item) => ({ id: item.id, label: item.label }))
  )

  useEffect(() => {
    let mounted = true
    fetch('/api/signalement/referentials')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!mounted || !data) return
        if (Array.isArray(data.declarantTypes) && data.declarantTypes.length > 0) {
          setDeclarantOptions(data.declarantTypes)
        }
        if (Array.isArray(data.organisations) && data.organisations.length > 0) {
          setOrganisationOptions(data.organisations)
        }
        if (Array.isArray(data.incidentTypes) && data.incidentTypes.length > 0) {
          setIncidentTypeOptions(data.incidentTypes)
        }
      })
      .catch(() => {})
    return () => {
      mounted = false
    }
  }, [])

  // Organisations strictement liées au type de déclarant sélectionné
  const availableOrganisations = useMemo(
    () => filterOrganisationsByDeclarantType(organisationOptions, form.declarantType),
    [form.declarantType, organisationOptions]
  )

  const selectedOrganisation = useMemo(
    () =>
      form.organization
        ? findOrganisationByLabel(availableOrganisations, form.organization)
        : undefined,
    [availableOrganisations, form.organization]
  )

  const emailDomainHint = useMemo(() => {
    if (!selectedOrganisation?.emailDomains?.length) return ''
    return formatEmailDomainsHint(selectedOrganisation.emailDomains)
  }, [selectedOrganisation])

  const emailEvaluation = useMemo(
    () =>
      form.identify === 'yes'
        ? evaluateSignalementEmail({
            email: form.email,
            organization: form.organization,
            organisations: organisationOptions,
            declarantType: form.declarantType,
          })
        : { valid: true, error: null, hint: null },
    [form.identify, form.email, form.organization, form.declarantType, organisationOptions]
  )

  const emailExample = useMemo(
    () => formatEmailExample(selectedOrganisation?.emailDomains),
    [selectedOrganisation]
  )

  /** Étapes 02/03 verrouillées tant que l’étape 01 n’est pas complète (coords ou captcha). */
  const identityReady =
    isCorrespondent ||
    (form.identify === 'yes' &&
      Boolean(form.declarantType) &&
      (availableOrganisations.length === 0 || Boolean(form.organization)) &&
      Boolean(form.email.trim()) &&
      emailEvaluation.valid)

  const laterStepsLocked =
    !form.identify ||
    (!isCorrespondent && form.identify === 'no' && !captcha?.token) ||
    (form.identify === 'yes' && !identityReady)

  const laterStepsLockReason = !form.identify
    ? 'Indiquez d’abord si vous souhaitez communiquer votre identité.'
    : form.identify === 'no'
      ? 'Validez d’abord la vérification anti-robot pour continuer.'
      : 'Renseignez d’abord vos coordonnées (type, organisation et e-mail valide) pour continuer.'

  const showEmailBlock =
    form.identify === 'yes' &&
    !!form.organization &&
    form.email.trim().length > 0 &&
    !!emailEvaluation.error &&
    (emailTouched || form.email.includes('@'))

  const filteredTypes = useMemo(() => {
    const q = typeQuery.trim().toLowerCase()
    if (!q) return incidentTypeOptions
    return incidentTypeOptions.filter((item) => item.label.toLowerCase().includes(q))
  }, [typeQuery, incidentTypeOptions])

  const patch = (partial: Partial<FormState>) => {
    setError('')
    setForm((current) => ({ ...current, ...partial }))
  }

  const toggleType = (id: string) => {
    setError('')
    setForm((current) => ({
      ...current,
      types: current.types.includes(id)
        ? current.types.filter((item) => item !== id)
        : [...current.types, id],
    }))
  }

  const addFiles = (list: FileList | File[]) => {
    const incoming = Array.from(list).filter((file) => file.size <= 8 * 1024 * 1024)
    setFiles((current) => {
      const names = new Set(current.map((file) => `${file.name}-${file.size}`))
      return [...current, ...incoming.filter((file) => !names.has(`${file.name}-${file.size}`))].slice(
        0,
        6,
      )
    })
  }

  const onDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault()
    if (event.dataTransfer.files.length) addFiles(event.dataTransfer.files)
  }

  const validate = () => {
    if (!form.identify) return 'Indiquez si vous souhaitez communiquer votre identité.'
    if (!anonymousEnabled && form.identify === 'no') {
      return 'Le signalement anonyme est désactivé. Connectez-vous comme correspondant.'
    }
    if (!isCorrespondent && form.identify === 'yes' && !form.declarantType) {
      return 'Indiquez le type de déclarant.'
    }
    if (
      !isCorrespondent &&
      form.identify === 'yes' &&
      availableOrganisations.length > 0 &&
      !form.organization
    ) {
      return 'Sélectionnez votre organisation.'
    }
    if (!isCorrespondent && form.identify === 'yes' && !form.email.trim()) {
      return 'Un e-mail de contact est requis si vous communiquez votre identité.'
    }
    if (!isCorrespondent && form.identify === 'yes') {
      const emailError = validateSignalementEmail({
        email: form.email,
        organization: form.organization,
        organisations: organisationOptions,
        declarantType: form.declarantType,
      })
      if (emailError) return emailError
    }
    if (form.identify === 'no' && !captcha?.token) {
      return 'Confirmez que vous n’êtes pas un robot avant d’envoyer un signalement anonyme.'
    }
    if (form.types.length === 0) return 'Sélectionnez au moins un type d’incident.'
    if (form.description.trim().length < 20) {
      return 'Décrivez l’incident avec un peu plus de détail (20 caractères minimum).'
    }
    return ''
  }

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const message = validate()
    if (message) {
      setError(message)
      return
    }
    setSending(true)
    setError('')
    try {
      const formData = new FormData()
      formData.set('identify', form.identify)
      formData.set('declarantType', form.declarantType)
      formData.set('organization', form.organization)
      formData.set('email', form.email)
      formData.set('types', JSON.stringify(form.types))
      formData.set('description', form.description)
      formData.set('measures', form.measures)
      formData.set('target', form.target)
      formData.set('reported', 'no')
      if (form.identify === 'no' && captcha?.provider) {
        formData.set('captchaProvider', captcha.provider)
      }
      if (form.identify === 'no' && captcha?.token) {
        formData.set('captchaToken', captcha.token)
      }
      for (const file of files) {
        formData.append('files', file)
      }
      const response = await fetch('/api/signalement', {
        method: 'POST',
        body: formData,
      })
      const raw = await response.text()
      let data: { ok?: boolean; reference?: string; error?: string } = {}
      if (raw.trim()) {
        try {
          data = JSON.parse(raw) as typeof data
        } catch {
          throw new Error('Réponse serveur invalide. Veuillez réessayer.')
        }
      }
      if (!response.ok || !data.ok || !data.reference) {
        if (response.status === 401) {
          throw new Error('Session expirée. Connectez-vous à nouveau pour envoyer le signalement.')
        }
        if (response.status === 403) {
          throw new Error(
            data.error || 'Votre compte n’est pas autorisé à déposer un signalement.'
          )
        }
        throw new Error(data.error || 'Envoi impossible pour le moment.')
      }
      setAckEmailSent(form.identify === 'yes' && !!form.email.trim())
      setReference(data.reference)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Envoi impossible pour le moment.')
    } finally {
      setSending(false)
    }
  }

  if (reference) {
    return (
      <div className="csirt-sig-success">
        <ShieldCheck className="csirt-sig-success-icon" aria-hidden />
        <h1>Signalement transmis</h1>
        <p>
          Votre déclaration a été reçue par le CSIRT-ARPT. Conservez la référence{' '}
          <strong>{reference}</strong> pour tout suivi.
        </p>
        {ackEmailSent ? (
          <p>
            Un e-mail de confirmation vous a été envoyé avec votre numéro de référence et les prochaines
            étapes. Notre équipe vous recontactera dans les plus brefs délais si nécessaire.
          </p>
        ) : null}
        <Link href="/" className="csirt-sig-back-home">
          Retour à l’accueil
        </Link>
      </div>
    )
  }

  return (
    <form className="csirt-sig" onSubmit={onSubmit} noValidate>
      <header className="csirt-sig-hero">
        <div className="csirt-sig-hero-inner">
          <Link href="/" className="csirt-sig-home">
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Retour à l’accueil
          </Link>
          <div className="csirt-sig-hero-row">
            <div className="csirt-sig-hero-copy">
              <p className="csirt-sig-official">
                <ShieldCheck className="h-4 w-4" aria-hidden />
                Plateforme officielle CSIRT-ARPT
              </p>
              <h1>Signalement d’incident de cybersécurité</h1>
              <p className="csirt-sig-lead">
                Déclarez un incident de sécurité numérique. Votre signalement est traité de manière
                confidentielle par l’équipe CSIRT-ARPT de l’ARPT Guinée.
              </p>
            </div>
            <ul className="csirt-sig-badges">
              <li>
                <strong>Disponible 24h/24</strong>
                <span>Prise en charge continue</span>
              </li>
              <li>
                <strong>Signalement confidentiel</strong>
                <span>Données protégées</span>
              </li>
              <li>
                <strong>Traitement sécurisé</strong>
                <span>Conforme à la législation</span>
              </li>
            </ul>
          </div>
        </div>
      </header>

      <ol className="csirt-sig-steps" aria-label="Étapes du signalement">
        <li className="is-identity">
          <span>
            {form.identify ? <Check className="h-3.5 w-3.5" aria-hidden /> : '1'}
          </span>
          Identité
        </li>
        <li className="csirt-sig-steps-sep" aria-hidden>
          <ChevronRight className="h-4 w-4" />
        </li>
        <li className={laterStepsLocked ? 'is-nature is-locked' : 'is-nature'}>
          <span>{form.types.length ? <Check className="h-3.5 w-3.5" aria-hidden /> : '2'}</span>
          Nature
        </li>
        <li className="csirt-sig-steps-sep" aria-hidden>
          <ChevronRight className="h-4 w-4" />
        </li>
        <li className={laterStepsLocked ? 'is-details is-locked' : 'is-details'}>
          <span>
            {form.description.trim().length >= 20 ? (
              <Check className="h-3.5 w-3.5" aria-hidden />
            ) : (
              '3'
            )}
          </span>
          Détails
        </li>
      </ol>

      <aside className={legalOpen ? 'csirt-sig-legal is-open' : 'csirt-sig-legal'}>
        <button
          type="button"
          className="csirt-sig-legal-toggle"
          aria-expanded={legalOpen}
          onClick={() => setLegalOpen((value) => !value)}
        >
          <AlertTriangle className="h-4 w-4" aria-hidden />
          <span>Mentions légales & obligation de signalement</span>
          <ChevronDown className="csirt-sig-legal-chevron" aria-hidden />
        </button>
        {legalOpen ? (
          <p>
            Les opérateurs et administrations concernés transmettent sans délai tout incident de
            cybersécurité au CSIRT-ARPT, conformément à l’
            <strong>article 6 du décret n°2020-129 du 20 janvier 2020</strong>. Les données
            collectées servent uniquement à la qualification et à la réponse à incident.
          </p>
        ) : null}
      </aside>

      <div className="csirt-sig-grid">
        <section className="csirt-sig-card is-identity" aria-labelledby="sig-identity">
          <header className="csirt-sig-card-head">
            <span className="csirt-sig-index">01</span>
            <UserRound className="csirt-sig-card-icon" aria-hidden />
            <div>
              <h2 id="sig-identity">Informations personnelles</h2>
              <p>Identité et coordonnées (optionnelles)</p>
            </div>
          </header>
          <div className="csirt-sig-card-body">
            {isCorrespondent ? (
              <>
                <p className="csirt-sig-question">
                  Signalement déposé en tant que correspondant d’organisation partenaire.
                </p>
                <div className="csirt-sig-identity-box">
                  <p>Ces informations sont issues de votre compte. Elles ne peuvent pas être modifiées ici.</p>
                  <label>
                    Organisation
                    <input type="text" value={correspondent?.organizationName ?? form.organization} readOnly />
                  </label>
                  <label>
                    E-mail
                    <input type="email" value={correspondent?.email ?? form.email} readOnly />
                  </label>
                  <label>
                    Type de déclarant (optionnel)
                    <select
                      value={form.declarantType}
                      onChange={(event) => patch({ declarantType: event.target.value })}
                    >
                      <option value="">Non précisé</option>
                      {declarantOptions.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </>
            ) : (
              <>
            <p className="csirt-sig-question">
              Souhaitez-vous communiquer votre identité pour être recontacté si besoin ? *
            </p>
            <div className="csirt-sig-choice">
              <button
                type="button"
                className={form.identify === 'yes' ? 'is-active' : undefined}
                onClick={() => {
                  setCaptcha(null)
                  patch({ identify: 'yes' })
                }}
              >
                {form.identify === 'yes' ? <Check className="csirt-sig-choice-check" aria-hidden /> : null}
                <strong>Oui</strong>
                <small>Avec coordonnées</small>
              </button>
              {anonymousEnabled ? (
              <button
                type="button"
                className={form.identify === 'no' ? 'is-active' : undefined}
                onClick={() => {
                  setCaptcha(null)
                  patch({ identify: 'no', declarantType: '', organization: '', email: '' })
                }}
              >
                {form.identify === 'no' ? <Check className="csirt-sig-choice-check" aria-hidden /> : null}
                <strong>Non</strong>
                <small>Anonyme</small>
              </button>
              ) : null}
            </div>
            {form.identify === 'no' && anonymousEnabled ? (
              <CsirtSignalementCaptcha
                value={captcha}
                onChange={setCaptcha}
                disabled={sending}
              />
            ) : null}
            {form.identify === 'yes' ? (
              <div className="csirt-sig-identity-box">
                <p>Renseignez vos coordonnées pour le suivi du signalement.</p>
                <label>
                  Type de déclarant *
                  <select
                    value={form.declarantType}
                    onChange={(event) =>
                      patch({
                        declarantType: event.target.value,
                        organization: '',
                        email: '',
                      })
                    }
                    required
                  >
                    <option value="">Sélectionner</option>
                    {declarantOptions.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Organisation{availableOrganisations.length > 0 ? ' *' : ''}
                  <select
                    value={form.organization}
                    onChange={(event) => {
                      setEmailTouched(false)
                      patch({
                        organization: event.target.value,
                        email: '',
                      })
                    }}
                    disabled={!form.declarantType}
                    required={availableOrganisations.length > 0}
                  >
                    <option value="">
                      {!form.declarantType
                        ? 'Sélectionner d’abord un type de déclarant'
                        : availableOrganisations.length === 0
                          ? 'Aucune organisation référencée pour ce profil'
                          : 'Sélectionner votre organisation'}
                    </option>
                    {availableOrganisations.map((item) => (
                      <option key={item.id} value={item.label}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </label>
                {form.declarantType && availableOrganisations.length === 0 ? (
                  <p className="csirt-sig-field-hint">
                    Aucune organisation n’est enregistrée pour ce type de déclarant. Contactez le
                    CSIRT-ARPT pour assistance.
                  </p>
                ) : null}
                <label>
                  E-mail professionnel *
                  <input
                    type="email"
                    value={form.email}
                    onChange={(event) => patch({ email: event.target.value })}
                    onBlur={() => setEmailTouched(true)}
                    autoComplete="email"
                    disabled={!form.organization}
                    className={
                      form.email.trim()
                        ? emailEvaluation.valid
                          ? 'is-email-valid'
                          : emailEvaluation.error
                            ? 'is-email-invalid'
                            : undefined
                        : undefined
                    }
                    aria-invalid={emailEvaluation.error ? true : undefined}
                    aria-describedby={
                      showEmailBlock ? 'sig-email-block sig-email-hint' : 'sig-email-hint'
                    }
                    placeholder={
                      emailDomainHint
                        ? emailExample
                        : form.organization
                          ? 'prenom.nom@domaine.gn'
                          : 'Sélectionnez d’abord une organisation'
                    }
                    required
                  />
                </label>
                {showEmailBlock ? (
                  <div id="sig-email-block" className="csirt-sig-email-block" role="alert">
                    <Mail className="csirt-sig-email-block-icon" aria-hidden />
                    <div>
                      <strong>Adresse e-mail non acceptée</strong>
                      <p>{emailEvaluation.error}</p>
                      {emailDomainHint ? (
                        <p className="csirt-sig-email-block-example">
                          Exemple valide : <code>{emailExample}</code>
                        </p>
                      ) : null}
                    </div>
                  </div>
                ) : null}
                <p
                  id="sig-email-hint"
                  className={
                    showEmailBlock
                      ? 'csirt-sig-field-hint'
                      : emailEvaluation.error
                        ? 'csirt-sig-field-error'
                        : emailEvaluation.valid
                          ? 'csirt-sig-field-success'
                          : 'csirt-sig-field-hint'
                  }
                  role={!showEmailBlock && emailEvaluation.error ? 'alert' : undefined}
                >
                  {showEmailBlock
                    ? emailEvaluation.hint ||
                      'L’adresse doit correspondre strictement au domaine de l’organisation sélectionnée.'
                    : emailEvaluation.error ||
                      emailEvaluation.hint ||
                      (emailDomainHint
                        ? `Domaine attendu pour ${form.organization} : ${emailDomainHint}`
                        : 'L’adresse doit correspondre strictement au domaine de l’organisation sélectionnée.')}
                </p>
              </div>
            ) : null}
              </>
            )}
          </div>
        </section>

        <section
          className={laterStepsLocked ? 'csirt-sig-card is-nature is-locked' : 'csirt-sig-card is-nature'}
          aria-labelledby="sig-nature"
          aria-disabled={laterStepsLocked || undefined}
        >
          <header className="csirt-sig-card-head">
            <span className="csirt-sig-index">02</span>
            <ShieldAlert className="csirt-sig-card-icon" aria-hidden />
            <div>
              <h2 id="sig-nature">Nature du signalement</h2>
              <p>Sélectionnez un ou plusieurs types</p>
            </div>
          </header>
          <div className="csirt-sig-card-body">
            {laterStepsLocked ? (
              <div className="csirt-sig-step-lock" role="status">
                <Lock className="csirt-sig-step-lock__icon" aria-hidden />
                <div>
                  <strong>Étape verrouillée</strong>
                  <p>{laterStepsLockReason}</p>
                </div>
              </div>
            ) : null}
            <fieldset disabled={laterStepsLocked} className="csirt-sig-fieldset">
              <legend className="sr-only">Types d’incident</legend>
              <p className="csirt-sig-nature-status">
                {form.types.length === 0
                  ? 'Aucun type sélectionné'
                  : `${form.types.length} type${form.types.length > 1 ? 's' : ''} sélectionné${form.types.length > 1 ? 's' : ''}`}
              </p>
              <label className="csirt-sig-filter">
                <Search className="h-4 w-4" aria-hidden />
                <span className="sr-only">Filtrer les types</span>
                <input
                  value={typeQuery}
                  onChange={(event) => setTypeQuery(event.target.value)}
                  placeholder="Filtrer les types..."
                />
              </label>
              <ul className="csirt-sig-types">
                {filteredTypes.map((item) => (
                  <li key={item.id}>
                    <label>
                      <input
                        type="checkbox"
                        checked={form.types.includes(item.id)}
                        onChange={() => toggleType(item.id)}
                      />
                      <span>{item.label}</span>
                    </label>
                  </li>
                ))}
              </ul>
            </fieldset>
          </div>
        </section>

        <section
          className={laterStepsLocked ? 'csirt-sig-card is-details is-locked' : 'csirt-sig-card is-details'}
          aria-labelledby="sig-details"
          aria-disabled={laterStepsLocked || undefined}
        >
          <header className="csirt-sig-card-head">
            <span className="csirt-sig-index">03</span>
            <FileText className="csirt-sig-card-icon" aria-hidden />
            <div>
              <h2 id="sig-details">Détails de l’incident</h2>
              <p>Description, cible et pièces jointes</p>
            </div>
          </header>
          <div className="csirt-sig-card-body">
            {laterStepsLocked ? (
              <div className="csirt-sig-step-lock" role="status">
                <Lock className="csirt-sig-step-lock__icon" aria-hidden />
                <div>
                  <strong>Étape verrouillée</strong>
                  <p>{laterStepsLockReason}</p>
                </div>
              </div>
            ) : null}
            <fieldset disabled={laterStepsLocked} className="csirt-sig-fieldset">
              <legend className="sr-only">Détails de l’incident</legend>
              <label>
                Description détaillée *
                <textarea
                  rows={5}
                  value={form.description}
                  onChange={(event) => patch({ description: event.target.value })}
                  placeholder="Chronologie, systèmes concernés, symptômes, impact..."
                  required={!laterStepsLocked}
                />
                <span className="csirt-sig-counter">{form.description.trim().length}/20</span>
              </label>
              <label>
                Mesure(s) corrective(s) (facultatif)
                <textarea
                  rows={3}
                  value={form.measures}
                  onChange={(event) => patch({ measures: event.target.value })}
                  placeholder="Actions déjà entreprises..."
                />
              </label>
              <label>
                Cible (URL / IP / domaine) (facultatif)
                <input
                  value={form.target}
                  onChange={(event) => patch({ target: event.target.value })}
                  placeholder="https://exemple.gov.gn ou 192.0.2.1"
                />
              </label>
              <div>
                <p className="csirt-sig-upload-label">Pièce(s) jointe(s) (facultatif)</p>
                <label
                  className="csirt-sig-drop"
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={laterStepsLocked ? undefined : onDrop}
                >
                  <FileUp className="h-5 w-5" aria-hidden />
                  Glisser-déposer ou parcourir
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    className="sr-only"
                    onChange={(event: ChangeEvent<HTMLInputElement>) => {
                      if (event.target.files) addFiles(event.target.files)
                      event.target.value = ''
                    }}
                  />
                </label>
                {files.length ? (
                  <ul className="csirt-sig-files">
                    {files.map((file) => (
                      <li key={`${file.name}-${file.size}`}>
                        <Paperclip className="h-3.5 w-3.5" aria-hidden />
                        {file.name}
                        <button
                          type="button"
                          aria-label={`Retirer ${file.name}`}
                          onClick={() =>
                            setFiles((current) => current.filter((item) => item !== file))
                          }
                        >
                          <X className="h-3.5 w-3.5" aria-hidden />
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
              <div className="csirt-sig-submit-wrap">
                {error ? <p className="csirt-sig-error">{error}</p> : null}
                <button
                  type="submit"
                  className="csirt-sig-submit"
                  disabled={
                    sending ||
                    laterStepsLocked ||
                    (form.identify === 'yes' &&
                      !!form.organization &&
                      (!form.email.trim() || !emailEvaluation.valid))
                  }
                >
                  {sending ? 'Envoi en cours…' : 'Envoyer le signalement'}
                </button>
              </div>
            </fieldset>
          </div>
        </section>
      </div>

      <div className="csirt-sig-foot">
        <p>
          <Lock className="h-4 w-4" aria-hidden />
          envoi sécurisé et confidentiel au CSIRT-ARPT.
        </p>
      </div>
    </form>
  )
}
