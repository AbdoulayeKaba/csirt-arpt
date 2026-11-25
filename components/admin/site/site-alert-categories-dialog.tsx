'use client'

import { useEffect, useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, Loader2, Plus, Tags, Trash2 } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from '@/components/ui/sheet'
import { moveItem } from '@/components/admin/site/use-site-editor'
import { toast } from '@/hooks/use-toast'
import {
  createEmptyNewsTopic,
  DEFAULT_NEWS_TOPICS,
  isArchivedFlag,
  sortNewsTopics,
  type SiteNewsTopic,
} from '@/lib/site/news-sources'
import type { SiteContent } from '@/lib/site/types'
import { cn } from '@/lib/utils'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  site: SiteContent
  persistSite: (next: SiteContent, opts?: { quiet?: boolean }) => Promise<boolean>
}

type Usage = { alerts: number; sources: number }

function categoryUsage(site: SiteContent, id: string): Usage {
  const alerts =
    site.newsCollected.filter((item) => !item.archived && item.category === id).length +
    site.news.filter((item) => !item.archived && item.category === id).length
  const sources = site.newsSources.filter((item) => !item.archived && item.category === id).length
  return { alerts, sources }
}

function usageLabel(usage: Usage) {
  if (!usage.alerts) return 'Vide'
  return `${usage.alerts} alerte${usage.alerts > 1 ? 's' : ''}`
}

export function SiteAlertCategoriesDialog({ open, onOpenChange, site, persistSite }: Props) {
  const [rows, setRows] = useState<SiteNewsTopic[]>([])
  const [label, setLabel] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [baseline, setBaseline] = useState('')

  useEffect(() => {
    if (!open) return
    const stored = site.newsTopics.length > 0 ? site.newsTopics : DEFAULT_NEWS_TOPICS
    const next = sortNewsTopics(stored.filter((topic) => !isArchivedFlag(topic))).map((topic) => ({ ...topic }))
    setRows(next)
    setBaseline(JSON.stringify(next))
    setLabel('')
    setError('')
    setBusy(false)
  }, [open, site])

  const usage = useMemo(() => {
    const counts = new Map<string, number>()
    for (const row of rows) counts.set(row.id, categoryUsage(site, row.id))
    return counts
  }, [rows, site])

  const addCategory = () => {
    const name = label.trim()
    if (!name) {
      setError('Indiquez le nom de la catégorie.')
      return
    }
    if (rows.some((row) => row.label.trim().toLowerCase() === name.toLowerCase())) {
      setError('Cette catégorie existe déjà.')
      return
    }
    const created = createEmptyNewsTopic(rows.length)
    setRows((current) => [...current, { ...created, label: name, tone: 'alert', order: current.length }])
    setLabel('')
    setError('')
  }

  const removeCategory = (id: string) => {
    if (rows.length <= 1) {
      setError('Conservez au moins une catégorie.')
      return
    }
    const count = usage.get(id)
    const total = (count?.alerts ?? 0) + (count?.sources ?? 0)
    if (total > 0) {
      setError('Cette catégorie contient encore des alertes. Déplacez-les avant de la supprimer.')
      return
    }
    setRows((current) => current.filter((row) => row.id !== id))
    setError('')
  }

  const save = async () => {
    const named = rows.map((row) => ({ ...row, label: row.label.trim() }))
    if (named.some((row) => !row.label)) {
      setError('Chaque catégorie doit avoir un nom.')
      return
    }
    const keys = named.map((row) => row.label.toLowerCase())
    if (new Set(keys).size !== keys.length) {
      setError('Deux catégories ne peuvent pas porter le même nom.')
      return
    }
    setBusy(true)
    setError('')
    const archived = site.newsTopics.filter((topic) => isArchivedFlag(topic))
    const newsTopics = [
      ...named.map((row, index) => ({ ...row, order: index })),
      ...archived,
    ]
    const ok = await persistSite({ ...site, newsTopics }, { quiet: true })
    setBusy(false)
    if (!ok) return
    toast({ title: 'Catégories enregistrées' })
    onOpenChange(false)
  }

  const dirty = JSON.stringify(rows) !== baseline

  return (
    <Sheet open={open} onOpenChange={(next) => !busy && onOpenChange(next)}>
      <SheetContent side="right" className="site-cat-dialog">
        <header className="site-cat-head">
          <div className="site-cat-head__row">
            <span className="site-cat-head__mark" aria-hidden>
              <Tags />
            </span>
            <SheetTitle>Catégories d’alertes</SheetTitle>
            <span className="site-cat-head__badge">{rows.length}</span>
          </div>
          <SheetDescription>Le nom et l’ordre sont repris sur le site public.</SheetDescription>
        </header>

        <form
          className="site-cat-create"
          onSubmit={(event) => {
            event.preventDefault()
            addCategory()
          }}
        >
          <label className="site-cat-create__name">
            <span className="sr-only">Nom de la nouvelle catégorie</span>
            <input
              value={label}
              maxLength={80}
              placeholder="Nouvelle catégorie"
              onChange={(event) => setLabel(event.target.value)}
            />
          </label>
          <button type="submit" className="site-btn site-btn-primary site-btn-sm" disabled={!label.trim()}>
            <Plus aria-hidden />
            Ajouter
          </button>
        </form>

        <div className="site-cat-sheet">
          <div className="site-cat-cols" aria-hidden>
            <span>#</span>
            <span>Nom</span>
            <span>Contenu</span>
            <span>Actions</span>
          </div>
          <ul className="site-cat-list">
            {rows.map((row, index) => {
              const count = usage.get(row.id) ?? { alerts: 0, sources: 0 }
              const total = count.alerts + count.sources
              return (
                <li key={row.id}>
                  <span className="site-cat-index">{index + 1}</span>
                  <input
                    aria-label={`Nom de la catégorie ${index + 1}`}
                    value={row.label}
                    maxLength={80}
                    onChange={(event) =>
                      setRows((current) =>
                        current.map((item) => (item.id === row.id ? { ...item, label: event.target.value } : item))
                      )
                    }
                  />
                  <span className={cn('site-cat-count', total === 0 && 'is-empty')}>{usageLabel(count)}</span>
                  <div className="site-cat-tools">
                    <button
                      type="button"
                      aria-label="Monter"
                      disabled={index === 0}
                      onClick={() => setRows((current) => moveItem(current, index, -1))}
                    >
                      <ArrowUp aria-hidden />
                    </button>
                    <button
                      type="button"
                      aria-label="Descendre"
                      disabled={index === rows.length - 1}
                      onClick={() => setRows((current) => moveItem(current, index, 1))}
                    >
                      <ArrowDown aria-hidden />
                    </button>
                    <button
                      type="button"
                      className={cn('is-delete', total > 0 && 'is-locked')}
                      aria-label={`Supprimer ${row.label || 'la catégorie'}`}
                      title={total > 0 ? 'Déplacez d’abord les alertes et les sources de cette catégorie.' : 'Supprimer'}
                      onClick={() => removeCategory(row.id)}
                    >
                      <Trash2 aria-hidden />
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        </div>

        {error ? <p className="site-cat-error" role="alert">{error}</p> : null}

        <footer className="site-cat-actions">
          <p>Une catégorie utilisée reste protégée tant que son contenu n’est pas déplacé.</p>
          <div>
            <button type="button" className="site-btn site-btn-ghost" disabled={busy} onClick={() => onOpenChange(false)}>
              Annuler
            </button>
            <button
              type="button"
              className="site-btn site-btn-primary"
              disabled={busy || !dirty || rows.length === 0}
              onClick={() => void save()}
            >
              {busy ? <Loader2 className="animate-spin" aria-hidden /> : null}
              Enregistrer
            </button>
          </div>
        </footer>
      </SheetContent>
    </Sheet>
  )
}
