'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, ExternalLink, Eye, EyeOff, Loader2 } from 'lucide-react'
import { AdminPageHeader } from '@/components/admin/admin-page-header'
import { SiteRichEditor } from '@/components/admin/site/site-rich-editor-lazy'
import { useSiteEditor } from '@/components/admin/site/use-site-editor'
import { newSiteId } from '@/lib/site/ids'
import { decodeHtmlEntities } from '@/lib/site/news-scrape'
import {
  isAlertNewsCategory,
  newsCategoryLabel,
  resolveNewsTopics,
  type SiteNewsCollectedItem,
} from '@/lib/site/news-sources'
import { cn } from '@/lib/utils'
import { toast } from '@/hooks/use-toast'
import '@/components/admin/site/site-admin.css'
import '@/components/admin/site/site-alert-editor.css'

type Mode = 'create' | 'edit'

type AlertForm = {
  title: string
  excerpt: string
  bodyHtml: string
  category: string
  date: string
  url: string
  enabled: boolean
}

type Status = 'loading' | 'ready' | 'missing'

function todayInputDate() {
  const date = new Date()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

function textFromHtml(html: string) {
  return decodeHtmlEntities(html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')).trim()
}

function emptyForm(category: string): AlertForm {
  return {
    title: '',
    excerpt: '',
    bodyHtml: '',
    category,
    date: todayInputDate(),
    url: '',
    enabled: true,
  }
}

function formFromItem(item: SiteNewsCollectedItem): AlertForm {
  const date = /^\d{4}-\d{2}-\d{2}/.test(item.date) ? item.date.slice(0, 10) : todayInputDate()
  return {
    title: item.title,
    excerpt: item.excerpt || '',
    bodyHtml: item.bodyHtml || '',
    category: item.category,
    date,
    url: item.url.startsWith('http') ? item.url : '',
    enabled: item.enabled,
  }
}

export function SiteCollectedAlertEditor({
  mode,
  alertId,
}: {
  mode: Mode
  alertId?: string | null
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { site, persistSite, loading, saving, canEdit } = useSiteEditor()
  const topics = useMemo(() => resolveNewsTopics(site?.newsTopics), [site?.newsTopics])
  const [form, setForm] = useState<AlertForm | null>(null)
  const [baseline, setBaseline] = useState('')
  const [status, setStatus] = useState<Status>('loading')
  const [error, setError] = useState('')

  useEffect(() => {
    if (loading) return
    if (!site) {
      setStatus('missing')
      return
    }
    if (form) return
    if (mode === 'edit') {
      const item = site.newsCollected.find((row) => row.id === alertId)
      if (!item || item.archived) {
        setStatus('missing')
        return
      }
      const next = formFromItem(item)
      setForm(next)
      setBaseline(JSON.stringify(next))
      setStatus('ready')
      return
    }
    const requested = searchParams.get('category')?.trim()
    const category =
      topics.find((topic) => topic.id === requested)?.id ??
      topics.find((topic) => topic.id === 'ALERTES_SECURITE')?.id ??
      topics[0]?.id ??
      'ALERTES_SECURITE'
    const next = emptyForm(category)
    setForm(next)
    setBaseline(JSON.stringify(next))
    setStatus('ready')
  }, [alertId, form, loading, mode, searchParams, site, topics])

  const dirty = Boolean(form) && JSON.stringify(form) !== baseline

  useEffect(() => {
    if (!dirty) return
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [dirty])

  const patch = (partial: Partial<AlertForm>) => {
    setForm((current) => (current ? { ...current, ...partial } : current))
    setError('')
  }

  const save = async () => {
    if (!site || !form || !canEdit || saving) return
    const title = form.title.trim()
    if (title.length < 8) {
      setError('Indiquez un titre d’au moins 8 caractères.')
      return
    }
    const external = form.url.trim()
    if (external && !/^https?:\/\//i.test(external)) {
      setError('Le lien de référence doit commencer par http:// ou https://.')
      return
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(form.date)) {
      setError('Indiquez une date de publication.')
      return
    }

    const topic = topics.find((item) => item.id === form.category)
    const category = topic?.id ?? form.category
    const bodyHtml = textFromHtml(form.bodyHtml) ? form.bodyHtml : undefined
    const excerpt = form.excerpt.trim() || textFromHtml(form.bodyHtml).slice(0, 320)
    const now = new Date().toISOString()
    const existing =
      mode === 'edit' ? site.newsCollected.find((row) => row.id === alertId) : undefined
    const id = existing?.id ?? newSiteId('ncol')
    const enabled = form.enabled
    const item: SiteNewsCollectedItem = {
      id,
      title,
      excerpt,
      bodyHtml,
      author: existing?.author || 'CSIRT-ARPT',
      url: external || `/actualites/${id}`,
      sourceId: existing?.sourceId || 'manual',
      sourceName: existing?.sourceName || 'Saisie manuelle',
      category,
      themes: topic ? [topic.label] : existing?.themes,
      date: form.date,
      scrapedAt: existing?.scrapedAt || now,
      enabled,
      enabledAt: enabled ? existing?.enabledAt || now : null,
      image: isAlertNewsCategory(category, topics) ? undefined : existing?.image,
      archived: false,
      archivedAt: null,
    }
    const newsCollected =
      mode === 'create'
        ? [item, ...site.newsCollected]
        : site.newsCollected.map((row) => (row.id === id ? item : row))

    setError('')
    const ok = await persistSite({ ...site, newsCollected }, { quiet: true })
    if (!ok) {
      setError('L’alerte n’a pas pu être enregistrée.')
      return
    }
    toast({
      title: mode === 'create' ? 'Alerte créée' : 'Alerte mise à jour',
      description: enabled
        ? 'Elle est visible sur le site public.'
        : 'Elle reste masquée tant que vous ne l’affichez pas.',
    })
    router.push('/dg/collected')
  }

  const title =
    mode === 'create' ? 'Nouvelle alerte' : form?.title.trim() || 'Modifier l’alerte'
  const previewHref =
    mode === 'edit' && alertId ? `/actualites/${encodeURIComponent(alertId)}` : '/actualites'

  return (
    <div className="site-admin site-alert-editor">
      <AdminPageHeader
        variant="flat"
        eyebrow="Site public"
        title={mode === 'create' ? 'Nouvelle alerte' : 'Modifier l’alerte'}
        description="Rédigez le texte officiel. Sans image de couverture : l’alerte est publiée en texte sur l’accueil et les actualités."
        actions={
          <div className="site-header-actions">
            <Link href="/dg/collected" className="site-btn site-btn-ghost site-btn-header">
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
              <span>Alertes</span>
            </Link>
            <Link
              href={previewHref}
              target="_blank"
              rel="noreferrer"
              className="site-btn site-btn-ghost site-btn-header"
            >
              <ExternalLink className="h-3.5 w-3.5" aria-hidden />
              <span>Aperçu</span>
            </Link>
            <button
              type="button"
              className={cn('site-btn site-btn-primary site-btn-header', dirty && 'is-dirty')}
              disabled={!canEdit || saving || status !== 'ready' || !dirty}
              onClick={() => void save()}
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : null}
              <span>{saving ? 'Enregistrement…' : 'Enregistrer'}</span>
            </button>
          </div>
        }
      />

      {status === 'loading' || loading ? (
        <p className="site-alert-editor__state">Chargement de l’alerte…</p>
      ) : status === 'missing' ? (
        <div className="site-alert-editor__state">
          <strong>Alerte introuvable</strong>
          <p>Elle a peut-être été supprimée ou mise en corbeille.</p>
          <Link href="/dg/collected" className="site-btn site-btn-primary site-btn-sm">
            Retour aux alertes
          </Link>
        </div>
      ) : form ? (
        <div className="site-alert-editor__layout">
          <section className="site-alert-editor__sheet" aria-label={title}>
            {error ? <p className="site-alert-editor__error">{error}</p> : null}
            <SiteRichEditor
              variant="document"
              value={form.bodyHtml}
              disabled={!canEdit}
              placeholder="Rédigez le corps de l’alerte : contexte, impact, recommandations…"
              onChange={(bodyHtml) => {
                const next = textFromHtml(bodyHtml) ? bodyHtml : ''
                if (next === form.bodyHtml) return
                patch({ bodyHtml: next })
              }}
              documentHeader={
                <header className="site-alert-doc">
                  <p className="site-alert-doc__kicker">
                    {newsCategoryLabel(form.category, topics)}
                    <span aria-hidden>·</span>
                    CSIRT-ARPT
                  </p>
                  <label className="site-alert-doc__title">
                    <span className="sr-only">Titre</span>
                    <textarea
                      value={form.title}
                      disabled={!canEdit}
                      rows={2}
                      maxLength={220}
                      placeholder="Titre de l’alerte"
                      onChange={(event) => patch({ title: event.target.value })}
                    />
                  </label>
                  <label className="site-alert-doc__lead">
                    <span>Chapô</span>
                    <textarea
                      value={form.excerpt}
                      disabled={!canEdit}
                      rows={3}
                      maxLength={600}
                      placeholder="Résumé affiché dans la liste, juste après le titre."
                      onChange={(event) => patch({ excerpt: event.target.value })}
                    />
                  </label>
                </header>
              }
            />
          </section>

          <aside className="site-alert-editor__rail" aria-label="Publication">
            <section>
              <h2>Publication</h2>
              <div className="site-alert-editor__switch" role="group" aria-label="Visibilité">
                <button
                  type="button"
                  className={cn(form.enabled && 'is-on')}
                  disabled={!canEdit}
                  aria-pressed={form.enabled}
                  onClick={() => patch({ enabled: true })}
                >
                  <Eye className="h-3.5 w-3.5" aria-hidden />
                  Afficher
                </button>
                <button
                  type="button"
                  className={cn(!form.enabled && 'is-off')}
                  disabled={!canEdit}
                  aria-pressed={!form.enabled}
                  onClick={() => patch({ enabled: false })}
                >
                  <EyeOff className="h-3.5 w-3.5" aria-hidden />
                  Masquer
                </button>
              </div>
              <p>
                {form.enabled
                  ? 'Visible sur l’accueil et la page Actualités après enregistrement.'
                  : 'Enregistrée dans sa catégorie, masquée du site public.'}
              </p>
            </section>

            <section>
              <h2>Références</h2>
              <label>
                <span>Catégorie</span>
                <select
                  className="site-input"
                  value={form.category}
                  disabled={!canEdit}
                  onChange={(event) => patch({ category: event.target.value })}
                >
                  {topics.map((topic) => (
                    <option key={topic.id} value={topic.id}>
                      {topic.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Date de publication</span>
                <input
                  className="site-input"
                  type="date"
                  value={form.date}
                  disabled={!canEdit}
                  onChange={(event) => patch({ date: event.target.value })}
                />
              </label>
              <label>
                <span>Lien de référence</span>
                <input
                  className="site-input"
                  type="url"
                  value={form.url}
                  disabled={!canEdit}
                  placeholder="https://…"
                  onChange={(event) => patch({ url: event.target.value })}
                />
                <small>Facultatif. Vide si l’alerte est rédigée ici.</small>
              </label>
            </section>

            <section className="site-alert-editor__meta">
              <h2>Origine</h2>
              <p>Saisie manuelle, classée par catégorie</p>
              <p>Auteur CSIRT-ARPT</p>
              {mode === 'edit' && alertId ? <p className="site-alert-editor__id">{alertId}</p> : null}
            </section>
          </aside>
        </div>
      ) : null}
    </div>
  )
}
