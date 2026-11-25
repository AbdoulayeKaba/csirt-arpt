'use client'

import {
  cloneElement,
  isValidElement,
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactElement,
  type MouseEvent,
} from 'react'
import { ArrowRight, CheckCircle2, Loader2, Lock, Mail, ShieldCheck } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { CSIRT_BRAND, CSIRT_LOGO_SRC } from '@/lib/csirt/brand'
import { PLATFORM_BRANDING_LOGO_PATH } from '@/lib/dg/platform-branding'
import { InstitutionLogoImage } from '@/components/layout/institution-logo-image'

const NEWSLETTER_DIALOG_ID = 'csirt-newsletter-dialog'
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const DUPLICATE_EMAIL_MESSAGE =
  'Cette adresse e-mail est déjà inscrite. Vous recevez déjà les alertes CSIRT-ARPT.'
const CONSENT_MESSAGE = 'Vous devez accepter de recevoir les alertes officielles.'

type Props = {
  trigger?: ReactElement
  open?: boolean
  onOpenChange?: (open: boolean) => void
  title?: string
  description?: string
  submitLabel?: string
  onSubscribed?: () => void
  onDismiss?: () => void
  initialEmail?: string
}

function openTrigger(trigger: ReactElement, open: boolean, onOpen: () => void) {
  if (!isValidElement(trigger)) return trigger
  const props = trigger.props as {
    type?: string
    onClick?: (event: MouseEvent<HTMLElement>) => void
  }
  return cloneElement(trigger, {
    type: props.type ?? 'button',
    'aria-haspopup': 'dialog',
    'aria-expanded': open,
    'aria-controls': open ? NEWSLETTER_DIALOG_ID : undefined,
    onClick: (event: MouseEvent<HTMLElement>) => {
      props.onClick?.(event)
      if (!event.defaultPrevented) onOpen()
    },
  } as Record<string, unknown>)
}

export function CsirtNewsletterModal({
  trigger,
  open: controlledOpen,
  onOpenChange,
  title = 'S’abonner aux alertes',
  description = 'Recevez les alertes et publications officielles du CSIRT-ARPT.',
  submitLabel = 'Confirmer l’abonnement',
  onSubscribed,
  onDismiss,
  initialEmail = '',
}: Props) {
  const isControlled = controlledOpen !== undefined
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false)
  const open = isControlled ? controlledOpen : uncontrolledOpen

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [consent, setConsent] = useState(false)
  const [pending, setPending] = useState(false)
  const [checkingEmail, setCheckingEmail] = useState(false)
  const [emailError, setEmailError] = useState('')
  const [consentError, setConsentError] = useState('')
  const [nameError, setNameError] = useState('')
  const [done, setDone] = useState<{ reference: string } | null>(null)
  const checkSeq = useRef(0)

  function resetForm() {
    setFullName('')
    setEmail('')
    setConsent(false)
    setPending(false)
    setCheckingEmail(false)
    setEmailError('')
    setConsentError('')
    setNameError('')
    setDone(null)
    checkSeq.current += 1
  }

  useEffect(() => {
    if (!open) return
    const next = initialEmail.trim()
    if (next) setEmail(next)
  }, [open, initialEmail])

  function setOpen(next: boolean) {
    if (!isControlled) setUncontrolledOpen(next)
    onOpenChange?.(next)
  }

  function handleOpenChange(next: boolean) {
    if (!next) {
      if (!done) onDismiss?.()
      resetForm()
    }
    setOpen(next)
  }

  const checkEmailAvailability = useCallback(async (value: string) => {
    const normalized = value.trim().toLowerCase()
    if (!EMAIL_PATTERN.test(normalized)) {
      setCheckingEmail(false)
      if (value.trim()) setEmailError('Adresse e-mail invalide.')
      else setEmailError('')
      return
    }

    const seq = ++checkSeq.current
    setCheckingEmail(true)
    try {
      const res = await fetch(`/api/abonnement?email=${encodeURIComponent(normalized)}`)
      const data = (await res.json().catch(() => ({}))) as { exists?: boolean }
      if (seq !== checkSeq.current) return
      setEmailError(data.exists ? DUPLICATE_EMAIL_MESSAGE : '')
    } catch {
      if (seq !== checkSeq.current) return
      setEmailError('')
    } finally {
      if (seq === checkSeq.current) setCheckingEmail(false)
    }
  }, [])

  useEffect(() => {
    if (!open) return
    const value = email.trim()
    if (!value) {
      setEmailError('')
      setCheckingEmail(false)
      return
    }

    const timer = window.setTimeout(() => {
      void checkEmailAvailability(value)
    }, 350)

    return () => window.clearTimeout(timer)
  }, [email, open, checkEmailAvailability])

  useEffect(() => {
    if (!open) return
    if (consent) {
      setConsentError('')
      return
    }
    if (fullName.trim().length >= 2 && EMAIL_PATTERN.test(email.trim())) {
      setConsentError(CONSENT_MESSAGE)
    }
  }, [consent, fullName, email, open])

  useEffect(() => {
    if (!open) return
    if (!fullName.trim()) {
      setNameError('')
      return
    }
    setNameError(fullName.trim().length < 2 ? 'Le nom est obligatoire.' : '')
  }, [fullName, open])

  const canSubmit =
    !pending &&
    !checkingEmail &&
    !emailError &&
    !nameError &&
    fullName.trim().length >= 2 &&
    EMAIL_PATTERN.test(email.trim()) &&
    consent

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canSubmit) return
    setPending(true)

    try {
      const res = await fetch('/api/abonnement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName, email, consent }),
      })
      const data = (await res.json().catch(() => ({}))) as {
        error?: string
        code?: string
        reference?: string
      }
      if (!res.ok) {
        if (data.code === 'EMAIL_ALREADY_SUBSCRIBED' || res.status === 409) {
          setEmailError(data.error || DUPLICATE_EMAIL_MESSAGE)
        } else if (data.error?.toLowerCase().includes('accepter')) {
          setConsentError(data.error || CONSENT_MESSAGE)
        } else if (data.error?.toLowerCase().includes('nom')) {
          setNameError(data.error || 'Le nom est obligatoire.')
        } else {
          setEmailError(data.error || 'Impossible d’envoyer la demande.')
        }
        return
      }
      setDone({ reference: data.reference || '' })
      onSubscribed?.()
    } catch {
      setEmailError('Impossible d’envoyer la demande. Réessayez.')
    } finally {
      setPending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {trigger ? openTrigger(trigger, open, () => setOpen(true)) : null}
      <DialogContent
        id={NEWSLETTER_DIALOG_ID}
        className="csirt-nl-modal z-[120]"
        showCloseButton
      >
        <header className="csirt-nl-modal__brand">
          <div className="csirt-nl-modal__brand-top">
            <div className="csirt-nl-modal__identity">
              <span className="csirt-nl-modal__seal">
                <InstitutionLogoImage
                  src={PLATFORM_BRANDING_LOGO_PATH}
                  fallbackSrc={CSIRT_LOGO_SRC}
                  alt=""
                  mode="strip-white"
                />
              </span>
              <div className="csirt-nl-modal__identity-copy">
                <strong>{CSIRT_BRAND.name}</strong>
                <span>{CSIRT_BRAND.fullName}</span>
              </div>
            </div>
            <span className="csirt-nl-modal__status">Officiel</span>
          </div>
          <p className="csirt-nl-modal__brand-meta">
            {CSIRT_BRAND.parent} · {CSIRT_BRAND.country}
          </p>
          <span className="csirt-nl-modal__brand-bar" aria-hidden />
        </header>

        <div className="csirt-nl-modal__body">
          <DialogHeader className="csirt-nl-modal__head">
            <p className="csirt-nl-modal__kicker">
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
              Canal d’alerte officiel
            </p>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>

          <ul className="csirt-nl-modal__assurances" aria-label="Garanties">
            <li>
              <Lock className="h-3.5 w-3.5" aria-hidden />
              <span>Diffusion contrôlée</span>
            </li>
            <li>
              <Mail className="h-3.5 w-3.5" aria-hidden />
              <span>E-mail institutionnel</span>
            </li>
            <li>
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
              <span>Source CSIRT</span>
            </li>
          </ul>

          {done ? (
            <div className="csirt-nl-modal__success" role="status">
              <span className="csirt-nl-modal__success-icon" aria-hidden>
                <CheckCircle2 className="h-6 w-6" />
              </span>
              <div className="csirt-nl-modal__success-copy">
                <strong>Inscription enregistrée</strong>
                <p>Votre demande d’abonnement a bien été prise en compte par le CSIRT-ARPT.</p>
                {done.reference ? (
                  <p className="csirt-nl-modal__ref">Référence {done.reference}</p>
                ) : null}
              </div>
              <button
                type="button"
                className="csirt-nl-modal__submit"
                onClick={() => handleOpenChange(false)}
              >
                Fermer
              </button>
            </div>
          ) : (
            <form className="csirt-nl-modal__form" onSubmit={onSubmit} noValidate>
              <div className="csirt-nl-modal__fields">
                <label className="csirt-nl-modal__field">
                  <span>Nom complet</span>
                  <input
                    type="text"
                    name="fullName"
                    autoComplete="name"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Prénom Nom"
                    aria-invalid={nameError ? true : undefined}
                  />
                </label>
                {nameError ? (
                  <p className="csirt-nl-modal__error" role="alert">
                    {nameError}
                  </p>
                ) : null}

                <label className="csirt-nl-modal__field">
                  <span>E-mail professionnel</span>
                  <input
                    type="email"
                    name="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="vous@organisation.gn"
                    aria-invalid={emailError ? true : undefined}
                    aria-describedby={emailError ? 'csirt-nl-email-error' : undefined}
                  />
                </label>
                {checkingEmail && !emailError ? (
                  <p className="csirt-nl-modal__hint" role="status">
                    Vérification de l’adresse…
                  </p>
                ) : null}
                {emailError ? (
                  <p id="csirt-nl-email-error" className="csirt-nl-modal__error" role="alert">
                    {emailError}
                  </p>
                ) : null}
              </div>

              <label className="csirt-nl-modal__consent">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  required
                />
                <span>
                  J’accepte de recevoir les alertes et informations officielles du{' '}
                  {CSIRT_BRAND.name}.
                </span>
              </label>
              {consentError ? (
                <p className="csirt-nl-modal__error" role="alert">
                  {consentError}
                </p>
              ) : null}

              <button type="submit" className="csirt-nl-modal__submit" disabled={!canSubmit}>
                {pending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    <span>Transmission en cours…</span>
                  </>
                ) : (
                  <>
                    <span>{submitLabel}</span>
                    <ArrowRight className="csirt-nl-modal__submit-arrow h-4 w-4" aria-hidden />
                  </>
                )}
              </button>
            </form>
          )}
        </div>

        <footer className="csirt-nl-modal__foot">
          <Lock className="h-3.5 w-3.5" aria-hidden />
          <span>envoi sécurisé et confidentiel au CSIRT-ARPT.</span>
        </footer>
      </DialogContent>
    </Dialog>
  )
}
