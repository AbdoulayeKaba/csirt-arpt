'use client'

import { useEffect, useMemo, useState } from 'react'
import { X } from 'lucide-react'
import {
  SITE_SOURCE_COUNTRIES,
  SITE_SOURCE_FREQUENCIES,
  SITE_SOURCE_THEMES,
  type SiteNewsSource,
} from '@/lib/site/news-sources'
import { cn } from '@/lib/utils'

export type SourceFormValues = {
  name: string
  type: SiteNewsSource['type']
  url: string
  frequency: string
  country: string
  themes: string[]
}

type Props = {
  open: boolean
  mode: 'create' | 'edit'
  initial?: Partial<SourceFormValues> | null
  canEdit: boolean
  onClose: () => void
  onSubmit: (values: SourceFormValues) => void
}

const EMPTY: SourceFormValues = {
  name: '',
  type: 'rss',
  url: '',
  frequency: 'Quotidien',
  country: '',
  themes: [],
}

function urlLabel(type: SiteNewsSource['type']) {
  if (type === 'html') return 'URL de la page'
  if (type === 'api') return 'URL de l’API'
  return 'URL du flux RSS'
}

function urlHint(type: SiteNewsSource['type']) {
  if (type === 'html') {
    return 'Collez l’URL de la page à scraper (liste d’articles ou actualités).'
  }
  if (type === 'api') {
    return 'Collez l’URL JSON de l’API officielle.'
  }
  return 'Collez l’URL XML/Atom du flux officiel (ex: /feed, /rss, .xml)'
}

export function SiteSourceFormModal({
  open,
  mode,
  initial,
  canEdit,
  onClose,
  onSubmit,
}: Props) {
  const [values, setValues] = useState<SourceFormValues>(EMPTY)
  const [touched, setTouched] = useState(false)
  const [availableThemes, setAvailableThemes] = useState<string[]>([...SITE_SOURCE_THEMES])

  useEffect(() => {
    if (!open) return
    fetch('/api/admin/referentials/thematiques?archived=0')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.items && Array.isArray(data.items) && data.items.length > 0) {
          const names = data.items.map((i: { name: string }) => i.name)
          // Merge unique with existing defaults
          const merged = Array.from(new Set([...names, ...SITE_SOURCE_THEMES]))
          setAvailableThemes(merged)
        }
      })
      .catch(() => {})
  }, [open])

  useEffect(() => {
    if (!open) return
    setValues({
      name: initial?.name ?? '',
      type: initial?.type ?? 'rss',
      url: initial?.url ?? '',
      frequency: initial?.frequency || 'Quotidien',
      country: initial?.country ?? '',
      themes: initial?.themes ?? [],
    })
    setTouched(false)
  }, [open, initial])

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  const errors = useMemo(() => {
    const next: Partial<Record<keyof SourceFormValues, string>> = {}
    if (!values.name.trim()) next.name = 'Nom requis'
    if (!values.url.trim()) next.url = 'URL requise'
    else if (!/^https?:\/\//i.test(values.url.trim())) next.url = 'URL invalide (http/https)'
    if (!values.country) next.country = 'Pays requis'
    if (values.themes.length === 0) next.themes = 'Sélectionnez au moins une thématique'
    return next
  }, [values])

  if (!open) return null

  const title = mode === 'create' ? 'Ajouter une source' : 'Modifier la source'
  const subtitle =
    mode === 'create'
      ? 'Configurez une nouvelle source de veille réglementaire'
      : 'Mettez à jour la configuration de cette source'
  const submitLabel = mode === 'create' ? 'Ajouter' : 'Enregistrer'

  const toggleTheme = (theme: string) => {
    setValues((prev) => ({
      ...prev,
      themes: prev.themes.includes(theme)
        ? prev.themes.filter((t) => t !== theme)
        : [...prev.themes, theme],
    }))
  }

  const handleSubmit = () => {
    setTouched(true)
    if (Object.keys(errors).length > 0) return
    onSubmit({
      ...values,
      name: values.name.trim(),
      url: values.url.trim(),
    })
  }

  return (
    <div className="site-src-modal" role="dialog" aria-modal="true" aria-labelledby="site-src-modal-title">
      <button type="button" className="site-src-modal__backdrop" aria-label="Fermer" onClick={onClose} />
      <div className="site-src-modal__panel">
        <header className="site-src-modal__head">
          <div>
            <h2 id="site-src-modal-title">{title}</h2>
            <p>{subtitle}</p>
          </div>
          <button type="button" className="site-src-modal__close" onClick={onClose} aria-label="Fermer">
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="site-src-modal__body">
          <label className="site-src-modal__field">
            <span>Nom de la source</span>
            <input
              className={cn('site-input', touched && errors.name && 'is-invalid')}
              placeholder="Ex: Journal Officiel"
              value={values.name}
              disabled={!canEdit}
              autoFocus
              onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))}
            />
            {touched && errors.name ? <em className="site-src-modal__error">{errors.name}</em> : null}
          </label>

          <div className="site-src-modal__row">
            <label className="site-src-modal__field">
              <span>Type</span>
              <select
                className="site-input"
                value={values.type}
                disabled={!canEdit}
                onChange={(e) =>
                  setValues((v) => ({ ...v, type: e.target.value as SiteNewsSource['type'] }))
                }
              >
                <option value="rss">Flux RSS</option>
                <option value="html">Page HTML</option>
                <option value="api">API JSON</option>
              </select>
            </label>

            <label className="site-src-modal__field">
              <span>Fréquence de synchronisation</span>
              <select
                className="site-input"
                value={values.frequency}
                disabled={!canEdit}
                onChange={(e) => setValues((v) => ({ ...v, frequency: e.target.value }))}
              >
                {SITE_SOURCE_FREQUENCIES.map((freq) => (
                  <option key={freq} value={freq}>
                    {freq}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="site-src-modal__field">
            <span>{urlLabel(values.type)}</span>
            <input
              className={cn('site-input', touched && errors.url && 'is-invalid')}
              placeholder="https://exemple.com/feed.xml"
              value={values.url}
              disabled={!canEdit}
              onChange={(e) => setValues((v) => ({ ...v, url: e.target.value }))}
            />
            <small>{urlHint(values.type)}</small>
            {touched && errors.url ? <em className="site-src-modal__error">{errors.url}</em> : null}
          </label>

          <label className="site-src-modal__field">
            <span>Pays cibles</span>
            <select
              className={cn('site-input', touched && errors.country && 'is-invalid')}
              value={values.country}
              disabled={!canEdit}
              onChange={(e) => setValues((v) => ({ ...v, country: e.target.value }))}
            >
              <option value="">Sélectionner un pays</option>
              {SITE_SOURCE_COUNTRIES.map((country) => (
                <option key={country} value={country}>
                  {country}
                </option>
              ))}
            </select>
            {touched && errors.country ? (
              <em className="site-src-modal__error">{errors.country}</em>
            ) : null}
          </label>

          <fieldset className="site-src-modal__field site-src-modal__themes">
            <legend>
              Thématiques
              <span className="site-src-modal__hint">
                {values.themes.length} sélectionnée{values.themes.length > 1 ? 's' : ''}
              </span>
            </legend>
            <div className="site-src-modal__themes-list" role="group" aria-label="Thématiques">
              {availableThemes.map((theme) => {
                const checked = values.themes.includes(theme)
                return (
                  <label key={theme} className={cn('site-src-theme', checked && 'is-checked')}>
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={!canEdit}
                      onChange={() => toggleTheme(theme)}
                    />
                    <span>{theme}</span>
                  </label>
                )
              })}
            </div>
            {touched && errors.themes ? (
              <em className="site-src-modal__error">{errors.themes}</em>
            ) : null}
          </fieldset>
        </div>

        <footer className="site-src-modal__foot">
          <button type="button" className="site-btn site-btn-warn site-src-modal__btn" onClick={onClose}>
            Annuler
          </button>
          <button
            type="button"
            className="site-btn site-btn-primary site-src-modal__btn"
            disabled={!canEdit}
            onClick={handleSubmit}
          >
            {submitLabel}
          </button>
        </footer>
      </div>
    </div>
  )
}
