'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Eye,
  EyeOff,
  Globe2,
  Loader2,
  MessageCircleQuestion,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  ShieldAlert,
  Trash2,
} from 'lucide-react'
import { AdminPageHeader } from '@/components/admin/admin-page-header'
import { AdminConfirmDialog } from '@/components/admin/admin-confirm-dialog'
import { toast } from '@/hooks/use-toast'
import {
  buildDefaultAssistantConfig,
  type AssistantConfig,
  type AssistantFaqItem,
  type AssistantLink,
  type AssistantScope,
} from '@/lib/csirt/assistant'
import { cn } from '@/lib/utils'
import '@/components/admin/assistant-management.css'

function newItemId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `faq-${crypto.randomUUID().slice(0, 8)}`
  }
  return `faq-${Date.now().toString(36)}`
}

function emptyItem(sortOrder: number): AssistantFaqItem {
  return {
    id: newItemId(),
    label: '',
    query: '',
    answerText: '',
    links: [],
    keywords: [],
    sortOrder,
    published: true,
    archivedAt: null,
  }
}

function linksToText(links?: AssistantLink[]) {
  if (!links?.length) return ''
  return links.map((link) => `${link.label} | ${link.href}`).join('\n')
}

function textToLinks(value: string): AssistantLink[] {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [labelPart, ...hrefParts] = line.split('|')
      const label = (labelPart || '').trim()
      const href = hrefParts.join('|').trim()
      return { label, href }
    })
    .filter((link) => link.label && link.href)
}

const SCOPE_TABS = [
  {
    id: 'site' as const,
    label: 'Site public',
    hint: 'Widget accueil & pages',
    icon: Globe2,
  },
  {
    id: 'signalement' as const,
    label: 'Signalement',
    hint: 'Aide au formulaire',
    icon: ShieldAlert,
  },
]

export function AssistantManagement() {
  const [config, setConfig] = useState<AssistantConfig>(() => buildDefaultAssistantConfig())
  const [scope, setScope] = useState<AssistantScope>('site')
  const [listMode, setListMode] = useState<'active' | 'trash'>('active')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [dirty, setDirty] = useState(false)
  const [purgeTarget, setPurgeTarget] = useState<AssistantFaqItem | null>(null)
  const [emptyTrashOpen, setEmptyTrashOpen] = useState(false)

  const items = config[scope].items
  const activeItems = useMemo(
    () => items.filter((item) => !item.archivedAt),
    [items]
  )
  const trashItems = useMemo(
    () => items.filter((item) => Boolean(item.archivedAt)),
    [items]
  )
  const visibleItems = listMode === 'trash' ? trashItems : activeItems
  const selected = useMemo(
    () => visibleItems.find((item) => item.id === selectedId) ?? null,
    [visibleItems, selectedId]
  )

  const markDirty = useCallback(() => setDirty(true), [])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/assistant', { cache: 'no-store' })
      if (!res.ok) throw new Error('LOAD_FAILED')
      const data = (await res.json()) as AssistantConfig
      setConfig(data)
      setDirty(false)
      setSelectedId((current) => {
        const pool = data[scope].items.filter((item) =>
          listMode === 'trash' ? Boolean(item.archivedAt) : !item.archivedAt
        )
        if (current && pool.some((item) => item.id === current)) return current
        return pool[0]?.id ?? null
      })
    } catch {
      toast({
        title: 'Erreur',
        description: 'Impossible de charger la configuration de l’assistant.',
        variant: 'destructive',
      })
      const defaults = buildDefaultAssistantConfig()
      setConfig(defaults)
      setSelectedId(defaults[scope].items[0]?.id ?? null)
      setDirty(false)
    } finally {
      setLoading(false)
    }
  }, [scope, listMode])

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const pool = config[scope].items.filter((item) =>
      listMode === 'trash' ? Boolean(item.archivedAt) : !item.archivedAt
    )
    setSelectedId((current) => {
      if (current && pool.some((item) => item.id === current)) return current
      return pool[0]?.id ?? null
    })
  }, [scope, listMode, config])

  const updateScopeWelcome = (welcome: string) => {
    markDirty()
    setConfig((current) => ({
      ...current,
      [scope]: { ...current[scope], welcome },
    }))
  }

  const updateFallback = (text: string) => {
    markDirty()
    setConfig((current) => ({
      ...current,
      fallback: { ...current.fallback, text },
    }))
  }

  const patchItem = (id: string, patch: Partial<AssistantFaqItem>) => {
    markDirty()
    setConfig((current) => ({
      ...current,
      [scope]: {
        ...current[scope],
        items: current[scope].items.map((item) =>
          item.id === id ? { ...item, ...patch } : item
        ),
      },
    }))
  }

  const addItem = () => {
    if (listMode === 'trash') setListMode('active')
    const next = emptyItem((activeItems.length + 1) * 10)
    markDirty()
    setConfig((current) => ({
      ...current,
      [scope]: {
        ...current[scope],
        items: [...current[scope].items, next],
      },
    }))
    setSelectedId(next.id)
  }

  const moveToTrash = (id: string) => {
    markDirty()
    patchItem(id, { archivedAt: new Date().toISOString() })
    setSelectedId((current) => (current === id ? null : current))
    toast({ title: 'Déplacé dans la corbeille' })
  }

  const restoreItem = (id: string) => {
    markDirty()
    patchItem(id, { archivedAt: null })
    toast({ title: 'Question restaurée' })
  }

  const purgeItem = (id: string) => {
    markDirty()
    setConfig((current) => {
      const nextItems = current[scope].items.filter((item) => item.id !== id)
      return {
        ...current,
        [scope]: { ...current[scope], items: nextItems },
      }
    })
    setSelectedId((current) => (current === id ? null : current))
    setPurgeTarget(null)
    toast({ title: 'Suppression définitive effectuée' })
  }

  const emptyTrash = () => {
    markDirty()
    setConfig((current) => ({
      ...current,
      [scope]: {
        ...current[scope],
        items: current[scope].items.filter((item) => !item.archivedAt),
      },
    }))
    setSelectedId(null)
    setEmptyTrashOpen(false)
    toast({ title: 'Corbeille vidée' })
  }

  const save = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/admin/assistant', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      })
      if (!res.ok) throw new Error('SAVE_FAILED')
      const data = (await res.json()) as { config?: AssistantConfig }
      if (data.config) setConfig(data.config)
      setDirty(false)
      toast({
        title: 'Enregistré',
        description: 'Configuration assistant publiée sur le site.',
      })
    } catch {
      toast({
        title: 'Erreur',
        description: 'Échec de l’enregistrement.',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const sortedItems = useMemo(
    () =>
      [...visibleItems].sort(
        (a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label, 'fr')
      ),
    [visibleItems]
  )

  const publishedCount = activeItems.filter((item) => item.published).length
  const hiddenCount = activeItems.length - publishedCount
  const trashCount = trashItems.length

  return (
    <div className="assistant-pro">
      <AdminPageHeader
        variant="flat"
        title="Assistant — FAQ"
        description="Pilotage des suggestions rapides et des réponses du widget d’aide CSIRT."
      />

      <div className="assistant-pro__frame">
        <header className="assistant-pro__command">
          <div className="assistant-pro__command-left">
            <div className="assistant-pro__mark" aria-hidden>
              <MessageCircleQuestion className="h-4 w-4" />
            </div>
            <div className="assistant-pro__command-copy">
              <p className="assistant-pro__command-kicker">Console éditoriale</p>
              <h2>Base de connaissance assistant</h2>
            </div>
          </div>

          <div className="assistant-pro__kpis" aria-label="Indicateurs">
            <div className="assistant-pro__kpi">
              <span className="assistant-pro__kpi-value">{publishedCount}</span>
              <span className="assistant-pro__kpi-label">Publiées</span>
            </div>
            <div className="assistant-pro__kpi">
              <span className="assistant-pro__kpi-value">{hiddenCount}</span>
              <span className="assistant-pro__kpi-label">Masquées</span>
            </div>
            <div className="assistant-pro__kpi is-trash">
              <span className="assistant-pro__kpi-value">{trashCount}</span>
              <span className="assistant-pro__kpi-label">Corbeille</span>
            </div>
            <div className="assistant-pro__kpi">
              <span className="assistant-pro__kpi-value">{activeItems.length}</span>
              <span className="assistant-pro__kpi-label">Actives</span>
            </div>
          </div>

          <div className="assistant-pro__command-actions">
            <button
              type="button"
              className="assistant-pro__btn assistant-pro__btn--ghost"
              onClick={() => void load()}
              disabled={loading || saving}
            >
              <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
              Actualiser
            </button>
            <button
              type="button"
              className="assistant-pro__btn assistant-pro__btn--primary"
              onClick={() => void save()}
              disabled={loading || saving}
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              Enregistrer
            </button>
          </div>
        </header>

        <div className="assistant-pro__tabs" role="tablist" aria-label="Périmètre">
          {SCOPE_TABS.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={scope === tab.id}
                className={cn('assistant-pro__tab', scope === tab.id && 'is-active')}
                onClick={() => setScope(tab.id)}
              >
                <Icon className="h-3.5 w-3.5" aria-hidden />
                <span className="assistant-pro__tab-text">
                  <strong>{tab.label}</strong>
                  <small>{tab.hint}</small>
                </span>
              </button>
            )
          })}
          <div className="assistant-pro__status">
            <span className={cn('assistant-pro__dot', dirty ? 'is-dirty' : 'is-clean')} />
            {dirty ? 'Modifications non enregistrées' : 'À jour'}
          </div>
        </div>

        {loading ? (
          <div className="assistant-pro__loading">
            <Loader2 className="h-4 w-4 animate-spin" />
            Chargement de la configuration…
          </div>
        ) : (
          <div className="assistant-pro__body">
            <aside className="assistant-pro__rail">
              <div className="assistant-pro__rail-block">
                <p className="assistant-pro__section-label">Messages globaux</p>
                <label className="assistant-pro__field">
                  <span>Accueil</span>
                  <textarea
                    value={config[scope].welcome}
                    onChange={(event) => updateScopeWelcome(event.target.value)}
                    rows={3}
                  />
                </label>
                <label className="assistant-pro__field">
                  <span>Repli</span>
                  <textarea
                    value={config.fallback.text}
                    onChange={(event) => updateFallback(event.target.value)}
                    rows={3}
                  />
                </label>
              </div>

              <div className="assistant-pro__rail-block assistant-pro__rail-block--grow">
                <div className="assistant-pro__rail-head">
                  <div className="assistant-pro__list-modes" role="tablist" aria-label="Liste">
                    <button
                      type="button"
                      role="tab"
                      aria-selected={listMode === 'active'}
                      className={cn('assistant-pro__list-mode', listMode === 'active' && 'is-active')}
                      onClick={() => setListMode('active')}
                    >
                      Questions
                      <span>{activeItems.length}</span>
                    </button>
                    <button
                      type="button"
                      role="tab"
                      aria-selected={listMode === 'trash'}
                      className={cn(
                        'assistant-pro__list-mode is-trash',
                        listMode === 'trash' && 'is-active'
                      )}
                      onClick={() => setListMode('trash')}
                    >
                      Corbeille
                      <span>{trashCount}</span>
                    </button>
                  </div>
                  {listMode === 'active' ? (
                    <button type="button" className="assistant-pro__btn assistant-pro__btn--mini" onClick={addItem}>
                      <Plus className="h-3 w-3" />
                      Ajouter
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="assistant-pro__btn assistant-pro__btn--mini is-danger"
                      onClick={() => setEmptyTrashOpen(true)}
                      disabled={trashCount === 0}
                    >
                      <Trash2 className="h-3 w-3" />
                      Vider
                    </button>
                  )}
                </div>
                <ul className="assistant-pro__list">
                  {sortedItems.map((item, index) => (
                    <li key={item.id}>
                      <button
                        type="button"
                        className={cn(
                          'assistant-pro__item',
                          selectedId === item.id && 'is-active'
                        )}
                        onClick={() => setSelectedId(item.id)}
                      >
                        <span className="assistant-pro__item-index">{index + 1}</span>
                        <span className="assistant-pro__item-main">
                          <span className="assistant-pro__item-title">
                            {item.label || 'Sans titre'}
                          </span>
                          <span className="assistant-pro__item-meta">
                            {listMode === 'trash' ? (
                              <span className="assistant-pro__pill is-trash">
                                <Trash2 className="h-2.5 w-2.5" /> Corbeille
                              </span>
                            ) : (
                              <span
                                className={cn(
                                  'assistant-pro__pill',
                                  item.published ? 'is-live' : 'is-off'
                                )}
                              >
                                {item.published ? (
                                  <>
                                    <Eye className="h-2.5 w-2.5" /> Publiée
                                  </>
                                ) : (
                                  <>
                                    <EyeOff className="h-2.5 w-2.5" /> Masquée
                                  </>
                                )}
                              </span>
                            )}
                          </span>
                        </span>
                      </button>
                    </li>
                  ))}
                  {sortedItems.length === 0 ? (
                    <li className="assistant-pro__list-empty">
                      {listMode === 'trash'
                        ? 'Corbeille vide pour ce périmètre.'
                        : 'Aucune question dans ce périmètre.'}
                    </li>
                  ) : null}
                </ul>
              </div>
            </aside>

            <section className="assistant-pro__canvas">
              {!selected ? (
                <div className="assistant-pro__empty">
                  <MessageCircleQuestion className="h-9 w-9" />
                  <h3>Sélectionnez une question</h3>
                  <p>Ou créez une entrée pour alimenter le fil de messagerie.</p>
                  <button type="button" className="assistant-pro__btn assistant-pro__btn--primary" onClick={addItem}>
                    <Plus className="h-3.5 w-3.5" />
                    Nouvelle question
                  </button>
                </div>
              ) : (
                <>
                  <div className="assistant-pro__canvas-head">
                    <div>
                      <p className="assistant-pro__section-label">
                        {selected.archivedAt ? 'Corbeille' : 'Édition'}
                      </p>
                      <h3>{selected.label || 'Nouvelle question'}</h3>
                    </div>
                    {selected.archivedAt ? (
                      <div className="assistant-pro__command-actions">
                        <button
                          type="button"
                          className="assistant-pro__btn assistant-pro__btn--ghost assistant-pro__btn--mini"
                          onClick={() => restoreItem(selected.id)}
                        >
                          <RotateCcw className="h-3 w-3" />
                          Restaurer
                        </button>
                        <button
                          type="button"
                          className="assistant-pro__btn assistant-pro__btn--danger"
                          onClick={() => setPurgeTarget(selected)}
                          title="Supprimer définitivement"
                        >
                          <Trash2 className="h-3 w-3" />
                          Effacer
                        </button>
                      </div>
                    ) : (
                      <div className="assistant-pro__command-actions">
                        <span
                          className={cn(
                            'assistant-pro__pill assistant-pro__status-chip',
                            selected.published ? 'is-live' : 'is-off'
                          )}
                          title={
                            selected.published
                              ? 'Visible dans les suggestions rapides'
                              : 'Masquée des suggestions (mots-clés seulement)'
                          }
                        >
                          {selected.published ? (
                            <>
                              <Eye className="h-2.5 w-2.5" /> Affichée
                            </>
                          ) : (
                            <>
                              <EyeOff className="h-2.5 w-2.5" /> Masquée
                            </>
                          )}
                        </span>
                        <button
                          type="button"
                          className="assistant-pro__btn assistant-pro__btn--danger"
                          onClick={() => moveToTrash(selected.id)}
                          title="Mettre à la corbeille"
                        >
                          <Trash2 className="h-3 w-3" />
                          Supprimer
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="assistant-pro__canvas-grid">
                    <div className="assistant-pro__form">
                      <label className="assistant-pro__field">
                        <span>Libellé carte</span>
                        <input
                          value={selected.label}
                          onChange={(event) =>
                            patchItem(selected.id, {
                              label: event.target.value,
                              query: selected.query || event.target.value,
                            })
                          }
                          placeholder="Que mettre dans la description ?"
                        />
                      </label>
                      <label className="assistant-pro__field">
                        <span>Bulle utilisateur</span>
                        <input
                          value={selected.query}
                          onChange={(event) =>
                            patchItem(selected.id, { query: event.target.value })
                          }
                          placeholder="Texte affiché au clic dans le fil"
                        />
                      </label>
                      <label className="assistant-pro__field">
                        <span>Réponse messagerie</span>
                        <textarea
                          value={selected.answerText}
                          onChange={(event) =>
                            patchItem(selected.id, { answerText: event.target.value })
                          }
                          rows={5}
                          placeholder="Réponse affichée comme message assistant…"
                        />
                      </label>
                      <label className="assistant-pro__field">
                        <span>Mots-clés (virgules)</span>
                        <input
                          value={selected.keywords.join(', ')}
                          onChange={(event) =>
                            patchItem(selected.id, {
                              keywords: event.target.value
                                .split(',')
                                .map((part) => part.trim())
                                .filter(Boolean),
                            })
                          }
                          placeholder="csirt, presentation, mission"
                        />
                      </label>
                      <label className="assistant-pro__field">
                        <span>Liens (Libellé | /chemin)</span>
                        <textarea
                          className="is-mono"
                          value={linksToText(selected.links)}
                          onChange={(event) =>
                            patchItem(selected.id, { links: textToLinks(event.target.value) })
                          }
                          rows={2}
                          placeholder="Découvrir le CSIRT | /csirt-arpt"
                        />
                      </label>
                      <div className="assistant-pro__row">
                        <label className="assistant-pro__field">
                          <span>Visibilité</span>
                          <select
                            value={selected.published ? '1' : '0'}
                            onChange={(event) =>
                              patchItem(selected.id, {
                                published: event.target.value === '1',
                              })
                            }
                          >
                            <option value="1">Publiée (suggestions rapides)</option>
                            <option value="0">Masquée (mots-clés seulement)</option>
                          </select>
                        </label>
                      </div>
                    </div>

                    <aside className="assistant-pro__preview" aria-label="Aperçu messagerie">
                      <div className="assistant-pro__preview-head">
                        <span className="assistant-pro__preview-live" />
                        Aperçu fil
                      </div>
                      <div className="assistant-pro__preview-thread">
                        <div className="assistant-pro__bubble assistant-pro__bubble--bot">
                          {config[scope].welcome}
                        </div>
                        <div className="assistant-pro__bubble assistant-pro__bubble--user">
                          {selected.query || selected.label || '…'}
                        </div>
                        <div className="assistant-pro__bubble assistant-pro__bubble--bot">
                          {selected.answerText || 'Réponse…'}
                          {selected.links?.length ? (
                            <div className="assistant-pro__preview-links">
                              {selected.links.map((link) => (
                                <span key={`${link.label}-${link.href}`}>{link.label}</span>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </aside>
                  </div>
                </>
              )}
            </section>
          </div>
        )}

        <footer className="assistant-pro__savebar">
          <div className="assistant-pro__savebar-copy">
            <span className={cn('assistant-pro__dot', dirty ? 'is-dirty' : 'is-clean')} />
            <p>
              {dirty
                ? 'Des changements attendent d’être publiés sur le widget public.'
                : 'Configuration synchronisée avec le widget public.'}
            </p>
          </div>
          <div className="assistant-pro__command-actions">
            <button
              type="button"
              className="assistant-pro__btn assistant-pro__btn--ghost"
              onClick={() => void load()}
              disabled={loading || saving}
            >
              <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
              Recharger
            </button>
            <button
              type="button"
              className="assistant-pro__btn assistant-pro__btn--primary"
              onClick={() => void save()}
              disabled={loading || saving || !dirty}
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              Publier
            </button>
          </div>
        </footer>
      </div>

      <AdminConfirmDialog
        open={Boolean(purgeTarget)}
        onOpenChange={(open) => !open && setPurgeTarget(null)}
        title="Suppression définitive"
        message={
          purgeTarget
            ? `La question « ${purgeTarget.label || 'Sans titre'} » sera effacée définitivement. Cette action est irréversible.`
            : ''
        }
        confirmLabel="Supprimer définitivement"
        intent="destructive"
        onConfirm={() => {
          if (purgeTarget) purgeItem(purgeTarget.id)
        }}
      />

      <AdminConfirmDialog
        open={emptyTrashOpen}
        onOpenChange={setEmptyTrashOpen}
        title="Vider la corbeille"
        message={`Supprimer définitivement ${trashCount} question(s) du périmètre « ${scope === 'site' ? 'Site public' : 'Signalement'} » ?`}
        confirmLabel="Vider la corbeille"
        intent="destructive"
        onConfirm={emptyTrash}
      />
    </div>
  )
}
