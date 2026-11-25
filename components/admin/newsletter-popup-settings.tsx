'use client'

import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { Check, Loader2, MousePointerClick, Save, Search, X } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { toast } from '@/hooks/use-toast'
import {
  DEFAULT_NEWSLETTER_POPUP,
  type NewsletterPopupConfig,
} from '@/lib/csirt/newsletter-popup-config'
import { cn } from '@/lib/utils'

type PageOption = {
  href: string
  label: string
  group: string
  published: boolean
}

type PopupAdminResponse = NewsletterPopupConfig & {
  pages?: PageOption[]
}

export function NewsletterPopupSettings() {
  const [form, setForm] = useState<NewsletterPopupConfig>({ ...DEFAULT_NEWSLETTER_POPUP })
  const [pages, setPages] = useState<PageOption[]>([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const applyPayload = useCallback((json: PopupAdminResponse) => {
    const { pages: pageList, ...config } = json
    const paths = Array.isArray(config.paths) ? config.paths : []
    setForm({
      enabled: Boolean(config.enabled),
      scrollPercent: config.scrollPercent ?? DEFAULT_NEWSLETTER_POPUP.scrollPercent,
      delayMs: config.delayMs ?? DEFAULT_NEWSLETTER_POPUP.delayMs,
      cookieDays: config.cookieDays ?? DEFAULT_NEWSLETTER_POPUP.cookieDays,
      paths,
      excludePaths: Array.isArray(config.excludePaths)
        ? config.excludePaths
        : [...DEFAULT_NEWSLETTER_POPUP.excludePaths],
      title: config.title || DEFAULT_NEWSLETTER_POPUP.title,
      description: config.description || DEFAULT_NEWSLETTER_POPUP.description,
      ctaLabel: config.ctaLabel || DEFAULT_NEWSLETTER_POPUP.ctaLabel,
      updatedAt: config.updatedAt,
    })
    if (Array.isArray(pageList)) setPages(pageList)
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/newsletter/popup', { cache: 'no-store' })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast({
          variant: 'destructive',
          title: 'Chargement impossible',
          description: String(json.error ?? `Erreur ${res.status}`),
        })
        return
      }
      applyPayload(json as PopupAdminResponse)
    } finally {
      setLoading(false)
    }
  }, [applyPayload])

  useEffect(() => {
    void load()
  }, [load])

  const selectedSet = useMemo(() => new Set(form.paths), [form.paths])
  const isLive = form.enabled && form.paths.length > 0

  const filteredPages = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return pages
    return pages.filter((page) =>
      `${page.label} ${page.href} ${page.group}`.toLowerCase().includes(needle)
    )
  }, [pages, query])

  const selectedPages = useMemo(
    () => pages.filter((page) => selectedSet.has(page.href)),
    [pages, selectedSet]
  )

  function togglePath(href: string) {
    setForm((prev) => {
      const has = prev.paths.includes(href)
      const paths = has ? prev.paths.filter((p) => p !== href) : [...prev.paths, href]
      return {
        ...prev,
        paths,
        // Désactive automatiquement s’il ne reste plus de page
        enabled: paths.length === 0 ? false : prev.enabled,
      }
    })
  }

  function clearSelection() {
    setForm((prev) => ({ ...prev, paths: [], enabled: false }))
  }

  async function onSave(event: FormEvent) {
    event.preventDefault()
    if (form.enabled && form.paths.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Pages requises',
        description: 'Sélectionnez au moins une page avant d’activer le pop-up.',
      })
      return
    }

    setSaving(true)
    try {
      const res = await fetch('/api/admin/newsletter/popup', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enabled: form.enabled,
          scrollPercent: form.scrollPercent,
          delayMs: form.delayMs,
          cookieDays: form.cookieDays,
          paths: form.paths,
          title: form.title,
          description: form.description,
          ctaLabel: form.ctaLabel,
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast({
          variant: 'destructive',
          title: 'Enregistrement impossible',
          description: String(json.message ?? json.error ?? `Erreur ${res.status}`),
        })
        return
      }
      applyPayload(json as PopupAdminResponse)
      toast({
        title: 'Pop-up enregistré',
        description: json.enabled
          ? `Activé — visible sur ${json.paths?.length ?? form.paths.length} page(s).`
          : 'Désactivé — le pop-up ne s’affiche plus sur le site.',
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="admin-newsletter-panel" aria-labelledby="nl-popup-title">
      <div className="admin-newsletter-panel-head">
        <div className="admin-newsletter-panel-title">
          <h2 id="nl-popup-title">Pop-up d’abonnement</h2>
          <p>
            Activez le pop-up, choisissez les pages cibles, puis enregistrez pour appliquer
            les règles de scroll.
          </p>
        </div>
      </div>

      {loading ? (
        <p className="admin-newsletter-popup-loading" role="status">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Chargement de la configuration…
        </p>
      ) : (
        <form className="admin-newsletter-popup-form" onSubmit={onSave}>
          <div className="admin-newsletter-popup-grid">
            <div className="admin-newsletter-popup-card">
              <div className="admin-newsletter-popup-card-head">
                <MousePointerClick className="h-4 w-4" aria-hidden />
                <h3>Règles d’affichage</h3>
              </div>

              <label className="admin-newsletter-popup-switch">
                <div>
                  <strong>Activer le pop-up au scroll de l’utilisateur</strong>
                  <span>
                    {form.enabled
                      ? 'Activé — s’affiche quand l’utilisateur scrolle sur les pages ciblées.'
                      : 'Désactivé — le pop-up ne s’affiche pas, même si l’utilisateur scrolle.'}
                  </span>
                </div>
                <Switch
                  checked={form.enabled}
                  onCheckedChange={(enabled) => {
                    if (enabled && form.paths.length === 0) {
                      toast({
                        variant: 'destructive',
                        title: 'Pages requises',
                        description: 'Sélectionnez d’abord au moins une page à droite.',
                      })
                      return
                    }
                    setForm((prev) => ({ ...prev, enabled }))
                  }}
                  aria-label="Activer le pop-up au scroll de l’utilisateur"
                />
              </label>

              {isLive ? (
                <p className="admin-newsletter-popup-ok" role="status">
                  Prêt : visible sur {form.paths.length} page
                  {form.paths.length > 1 ? 's' : ''} (scroll + délai ci-dessous).
                </p>
              ) : form.enabled && form.paths.length === 0 ? (
                <p className="admin-newsletter-popup-alert" role="status">
                  Activation impossible sans page. Choisissez au moins une page à droite.
                </p>
              ) : !form.enabled && form.paths.length > 0 ? (
                <p className="admin-newsletter-popup-alert" role="status">
                  Pages ciblées mais pop-up désactivé. Activez le commutateur puis
                  Enregistrer.
                </p>
              ) : (
                <p className="admin-newsletter-popup-alert" role="status">
                  Sélectionnez des pages et activez le commutateur pour afficher le pop-up.
                </p>
              )}

              <label className="admin-newsletter-popup-field">
                <span>Seuil de scroll de l’utilisateur (%)</span>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={form.scrollPercent}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      scrollPercent: Number(e.target.value) || 1,
                    }))
                  }
                />
                <em>
                  Pourcentage de défilement de la page avant d’afficher le pop-up (ex. 10 =
                  après ~10 %).
                </em>
              </label>

              <label className="admin-newsletter-popup-field">
                <span>Délai avant affichage (ms)</span>
                <input
                  type="number"
                  min={0}
                  max={60000}
                  step={100}
                  value={form.delayMs}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      delayMs: Number(e.target.value) || 0,
                    }))
                  }
                />
              </label>

              <label className="admin-newsletter-popup-field">
                <span>Ne pas réafficher après abonnement (jours)</span>
                <input
                  type="number"
                  min={0}
                  max={365}
                  value={form.cookieDays}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      cookieDays: Number(e.target.value) || 0,
                    }))
                  }
                />
                <em>
                  Uniquement après inscription réussie. Fermer le pop-up permet de le
                  rouvrir en re-scrollant (ou en rechargeant la page).
                </em>
              </label>
            </div>

            <div className="admin-newsletter-popup-card">
              <div className="admin-newsletter-popup-card-head">
                <h3>Où l’afficher</h3>
              </div>

              <div className="admin-newsletter-popup-pages">
                <div className="admin-newsletter-popup-pages-toolbar">
                  <label className="admin-newsletter-popup-pages-search">
                    <Search className="h-3.5 w-3.5" aria-hidden />
                    <input
                      type="search"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Filtrer titre ou URL…"
                      aria-label="Filtrer les pages"
                    />
                  </label>
                  <span className="admin-newsletter-popup-pages-count">
                    {form.paths.length} sélectionnée{form.paths.length > 1 ? 's' : ''}
                  </span>
                  {form.paths.length > 0 ? (
                    <button
                      type="button"
                      className="admin-newsletter-popup-pages-clear"
                      onClick={clearSelection}
                    >
                      Tout retirer
                    </button>
                  ) : null}
                </div>

                {selectedPages.length > 0 ? (
                  <ul className="admin-newsletter-popup-chips" aria-label="Pages sélectionnées">
                    {selectedPages.map((page) => (
                      <li key={page.href}>
                        <button
                          type="button"
                          onClick={() => togglePath(page.href)}
                          title={`Retirer ${page.label}`}
                        >
                          <span>{page.label}</span>
                          <X className="h-3 w-3" aria-hidden />
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="admin-newsletter-popup-pages-hint">
                    Aucune page sélectionnée — le pop-up ne s’affiche nulle part.
                  </p>
                )}

                <div
                  className="admin-newsletter-popup-pages-list"
                  role="listbox"
                  aria-multiselectable="true"
                  aria-label="Pages du site"
                >
                  {filteredPages.length === 0 ? (
                    <p className="admin-newsletter-popup-pages-empty">Aucune page trouvée.</p>
                  ) : (
                    filteredPages.map((page) => {
                      const active = selectedSet.has(page.href)
                      return (
                        <button
                          key={page.href}
                          type="button"
                          role="option"
                          aria-selected={active}
                          className={cn(
                            'admin-newsletter-popup-page-item',
                            active && 'is-active'
                          )}
                          onClick={() => togglePath(page.href)}
                        >
                          <span
                            className={cn(
                              'admin-newsletter-popup-page-check',
                              active && 'is-checked'
                            )}
                            aria-hidden
                          >
                            {active ? <Check className="h-3 w-3" /> : null}
                          </span>
                          <span className="admin-newsletter-popup-page-meta">
                            <strong>
                              {page.label}
                              {!page.published ? <em>Masquée</em> : null}
                            </strong>
                            <small>{page.group}</small>
                            <code>{page.href}</code>
                          </span>
                        </button>
                      )
                    })
                  )}
                </div>
              </div>
            </div>

            <div className="admin-newsletter-popup-card admin-newsletter-popup-card--wide">
              <div className="admin-newsletter-popup-card-head">
                <h3>Contenu du pop-up</h3>
              </div>

              <label className="admin-newsletter-popup-field">
                <span>Titre</span>
                <input
                  type="text"
                  maxLength={120}
                  value={form.title}
                  onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                />
              </label>

              <label className="admin-newsletter-popup-field">
                <span>Texte d’accompagnement</span>
                <textarea
                  rows={3}
                  maxLength={400}
                  value={form.description}
                  onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                />
              </label>

              <label className="admin-newsletter-popup-field">
                <span>Libellé du bouton</span>
                <input
                  type="text"
                  maxLength={80}
                  value={form.ctaLabel}
                  onChange={(e) => setForm((prev) => ({ ...prev, ctaLabel: e.target.value }))}
                />
              </label>
            </div>
          </div>

          <div className="admin-newsletter-popup-actions">
            <button
              type="submit"
              className="admin-appt-header-btn admin-appt-header-btn--primary"
              disabled={saving}
            >
              {saving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
              ) : (
                <Save className="h-3.5 w-3.5" aria-hidden />
              )}
              {saving ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </div>
        </form>
      )}
    </section>
  )
}
