'use client'

import { useRef, useState, type FormEvent, type ReactNode } from 'react'
import {
  ChevronDown,
  Eraser,
  FileText,
  Loader2,
  Mail,
  Paperclip,
  Phone,
  Send,
  User,
  X,
} from 'lucide-react'
import { GuineaFlag } from '@/components/csirt/csirt-flag-icons'

const SUBJECTS = [
  'Demande d’information',
  'Accompagnement',
  'Partenariat',
  'Presse et communication',
  'Autre demande',
] as const

const MAX_CHARS = 2000
const MAX_FILE_BYTES = 10 * 1024 * 1024
const ACCEPT = '.pdf,.doc,.docx,.jpg,.jpeg,.png'

type Props = {
  brandName: string
}

export function CsirtContactForm({ brandName }: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [honeypot, setHoneypot] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const reset = () => {
    setFullName('')
    setEmail('')
    setPhone('')
    setSubject('')
    setBody('')
    setFiles([])
    setError(null)
    setSuccess(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  const addFiles = (list: FileList | null) => {
    if (!list?.length) return
    const next = [...files]
    for (const file of list) {
      if (file.size > MAX_FILE_BYTES) {
        setError('Chaque fichier doit faire moins de 10 Mo.')
        continue
      }
      if (next.some((item) => item.name === file.name && item.size === file.size)) continue
      next.push(file)
    }
    setFiles(next.slice(0, 5))
  }

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    setSuccess(false)
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName,
          email,
          phone,
          subject,
          body,
          attachmentNames: files.map((file) => file.name).join(', '),
          website: honeypot,
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        const code = String(json.error ?? '')
        setError(
          code === 'UNAUTHORIZED'
            ? 'L’envoi n’est pas autorisé pour le moment. Réessayez dans un instant.'
            : code || 'Envoi impossible. Réessayez.'
        )
        return
      }
      setSuccess(true)
      setFullName('')
      setEmail('')
      setPhone('')
      setSubject('')
      setBody('')
      setFiles([])
      if (fileRef.current) fileRef.current.value = ''
    } catch {
      setError('Impossible de joindre le serveur.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form className="csirt-contacts__form" onSubmit={(event) => void onSubmit(event)}>
      <header className="csirt-contacts__form-head">
        <span className="csirt-contacts__form-mark" aria-hidden>
          <Mail />
        </span>
        <div>
          <h2 id="contacts-form">Envoyer un message au {brandName}</h2>
        </div>
      </header>

      <div className="csirt-contacts__form-grid">
        <Field icon={User} label="Nom complet" required>
          <input
            type="text"
            name="fullName"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            placeholder="Votre nom et prénom"
            required
            autoComplete="name"
          />
        </Field>
        <Field icon={Mail} label="Adresse e-mail" required>
          <input
            type="email"
            name="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="exemple@domaine.gov.gn"
            required
            autoComplete="email"
          />
        </Field>
        <Field icon={Phone} label="Téléphone">
          <span className="csirt-contacts__dial">
            <GuineaFlag />
            <strong>+224</strong>
          </span>
          <input
            type="tel"
            name="phone"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            placeholder="620 00 00 00"
            autoComplete="tel-national"
          />
        </Field>
        <Field icon={FileText} label="Objet" required wide>
          <select
            name="subject"
            value={subject}
            required
            onChange={(event) => setSubject(event.target.value)}
          >
            <option value="">Sélectionnez l’objet de votre demande</option>
            {SUBJECTS.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          <ChevronDown aria-hidden className="csirt-contacts__chevron" />
        </Field>
        <Field icon={Mail} label="Message" required wide>
          <textarea
            name="body"
            rows={5}
            maxLength={MAX_CHARS}
            value={body}
            onChange={(event) => setBody(event.target.value)}
            placeholder="Décrivez votre demande en détail…"
            required
          />
          <small className="csirt-contacts__count">
            {body.length}/{MAX_CHARS}
          </small>
        </Field>
      </div>

      <div
        className="csirt-contacts__drop"
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault()
          addFiles(event.dataTransfer.files)
        }}
      >
        <span className="csirt-contacts__drop-icon" aria-hidden>
          <Paperclip />
        </span>
        <div>
          <strong>Ajouter des pièces jointes (optionnel)</strong>
          <p>Glissez-déposez vos fichiers ou cliquez pour parcourir</p>
          <small>Formats acceptés : PDF, DOC, DOCX, JPG, PNG (Max. 10 Mo)</small>
          {files.length ? (
            <ul>
              {files.map((file) => (
                <li key={`${file.name}-${file.size}`}>
                  {file.name}
                  <button
                    type="button"
                    aria-label={`Retirer ${file.name}`}
                    onClick={() => setFiles((current) => current.filter((item) => item !== file))}
                  >
                    <X aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        <button type="button" className="csirt-contacts__browse" onClick={() => fileRef.current?.click()}>
          Parcourir les fichiers
        </button>
        <input
          ref={fileRef}
          type="file"
          accept={ACCEPT}
          multiple
          hidden
          onChange={(event) => addFiles(event.target.files)}
        />
      </div>

      <input
        type="text"
        name="website"
        value={honeypot}
        onChange={(event) => setHoneypot(event.target.value)}
        tabIndex={-1}
        autoComplete="off"
        className="csirt-contacts__honeypot"
        aria-hidden
      />

      {error ? <p className="csirt-contacts__form-error" role="alert">{error}</p> : null}
      {success ? (
        <p className="csirt-contacts__form-success" role="status">
          Message envoyé. L’équipe du {brandName} vous répondra dans les meilleurs délais.
        </p>
      ) : null}

      <div className="csirt-contacts__form-foot">
        <button type="button" className="csirt-contacts__clear" onClick={reset}>
          <Eraser aria-hidden />
          Effacer le formulaire
        </button>
        <button type="submit" className="csirt-contacts__btn is-submit" disabled={submitting}>
          {submitting ? <Loader2 aria-hidden className="animate-spin" /> : <Send aria-hidden />}
          {submitting ? 'Envoi…' : 'Envoyer le message'}
        </button>
      </div>
    </form>
  )
}

function Field({
  icon: Icon,
  label,
  required,
  wide,
  children,
}: {
  icon: typeof User
  label: string
  required?: boolean
  wide?: boolean
  children: ReactNode
}) {
  return (
    <label className={`csirt-contacts__field${wide ? ' is-wide' : ''}`}>
      <span className="csirt-contacts__field-label">
        <Icon aria-hidden />
        {label}
        {required ? <abbr title="obligatoire">*</abbr> : null}
      </span>
      <span className="csirt-contacts__control">{children}</span>
    </label>
  )
}
