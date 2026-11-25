'use client'

import { useMemo, useState } from 'react'
import {
  ArchiveRestore,
  BellRing,
  Columns3,
  Link2,
  Megaphone,
  Plus,
  Scale,
  Shield,
  Trash2,
} from 'lucide-react'
import { AdminConfirmDialog } from '@/components/admin/admin-confirm-dialog'
import {
  AdminEmptyTrashButton,
  AdminTrashEmptyState,
  AdminTrashScopeTabs,
} from '@/components/admin/admin-trash-ui'
import { SiteCard, SiteField, SiteRowActions } from '@/components/admin/site/site-fields'
import { SiteShell } from '@/components/admin/site/site-shell'
import { useSiteEditor } from '@/components/admin/site/use-site-editor'
import { toast } from '@/hooks/use-toast'
import { archiveNow, isArchivedFlag } from '@/lib/site/news-sources'
import type { SiteLink } from '@/lib/site/types'
import '@/components/admin/site/site-admin.css'

type LinkScope = 'active' | 'trash'
type ConfirmState =
  | { mode: 'purge-column'; columnId: string; linkId: string }
  | { mode: 'purge-legal'; linkId: string }
  | { mode: 'empty-columns' }
  | { mode: 'empty-legal' }
  | null

function ensureLinkId(link: SiteLink, prefix: string, index: number) {
  return link.id?.trim() || `${prefix}-${index + 1}`
}

export function SiteFooterEditor() {
  const { site, setSite, loading, saving, dirty, canEdit, save } = useSiteEditor()
  const [columnScope, setColumnScope] = useState<LinkScope>('active')
  const [legalScope, setLegalScope] = useState<LinkScope>('active')
  const [confirm, setConfirm] = useState<ConfirmState>(null)

  const columnsInTrash = columnScope === 'trash'
  const legalInTrash = legalScope === 'trash'

  const liveColumnLinkCount = useMemo(() => {
    if (!site) return 0
    return site.footer.columns.reduce(
      (sum, column) => sum + column.links.filter((link) => !isArchivedFlag(link)).length,
      0
    )
  }, [site])

  const trashColumnLinkCount = useMemo(() => {
    if (!site) return 0
    return site.footer.columns.reduce(
      (sum, column) => sum + column.links.filter((link) => isArchivedFlag(link)).length,
      0
    )
  }, [site])

  const liveLegal = useMemo(
    () => (site ? site.footer.legal.filter((link) => !isArchivedFlag(link)) : []),
    [site]
  )
  const trashLegal = useMemo(
    () => (site ? site.footer.legal.filter((link) => isArchivedFlag(link)) : []),
    [site]
  )
  const visibleLegal = legalInTrash ? trashLegal : liveLegal

  const updateColumnLink = (columnId: string, linkId: string, patch: Partial<SiteLink>) => {
    if (!site) return
    setSite({
      ...site,
      footer: {
        ...site.footer,
        columns: site.footer.columns.map((column) =>
          column.id === columnId
            ? {
                ...column,
                links: column.links.map((link, index) =>
                  ensureLinkId(link, `${columnId}-link`, index) === linkId
                    ? { ...link, id: linkId, ...patch }
                    : link
                ),
              }
            : column
        ),
      },
    })
  }

  const archiveColumnLink = (columnId: string, linkId: string) => {
    if (!site || !canEdit) return
    updateColumnLink(columnId, linkId, { archived: true, archivedAt: archiveNow() })
    toast({
      title: 'Lien mis en corbeille',
      description: 'Conservé 3 mois — enregistrez pour publier.',
    })
  }

  const restoreColumnLink = (columnId: string, linkId: string) => {
    if (!site || !canEdit) return
    updateColumnLink(columnId, linkId, { archived: false, archivedAt: null })
    setColumnScope('active')
    toast({ title: 'Lien restauré', description: 'Enregistrez pour publier.' })
  }

  const purgeColumnLink = (columnId: string, linkId: string) => {
    if (!site || !canEdit) return
    setSite({
      ...site,
      footer: {
        ...site.footer,
        columns: site.footer.columns.map((column) =>
          column.id === columnId
            ? {
                ...column,
                links: column.links.filter(
                  (link, index) => ensureLinkId(link, `${columnId}-link`, index) !== linkId
                ),
              }
            : column
        ),
      },
    })
    setConfirm(null)
    toast({ title: 'Lien supprimé définitivement' })
  }

  const emptyColumnTrash = () => {
    if (!site || !canEdit) return
    setSite({
      ...site,
      footer: {
        ...site.footer,
        columns: site.footer.columns.map((column) => ({
          ...column,
          links: column.links.filter((link) => !isArchivedFlag(link)),
        })),
      },
    })
    setConfirm(null)
    toast({ title: 'Corbeille des colonnes vidée' })
  }

  const updateLegalLink = (linkId: string, patch: Partial<SiteLink>) => {
    if (!site) return
    setSite({
      ...site,
      footer: {
        ...site.footer,
        legal: site.footer.legal.map((link, index) =>
          ensureLinkId(link, 'legal', index) === linkId
            ? { ...link, id: linkId, ...patch }
            : link
        ),
      },
    })
  }

  const archiveLegalLink = (linkId: string) => {
    if (!site || !canEdit) return
    updateLegalLink(linkId, { archived: true, archivedAt: archiveNow() })
    toast({
      title: 'Mention mise en corbeille',
      description: 'Conservée 3 mois — enregistrez pour publier.',
    })
  }

  const restoreLegalLink = (linkId: string) => {
    if (!site || !canEdit) return
    updateLegalLink(linkId, { archived: false, archivedAt: null })
    setLegalScope('active')
    toast({ title: 'Mention restaurée', description: 'Enregistrez pour publier.' })
  }

  const purgeLegalLink = (linkId: string) => {
    if (!site || !canEdit) return
    setSite({
      ...site,
      footer: {
        ...site.footer,
        legal: site.footer.legal.filter(
          (link, index) => ensureLinkId(link, 'legal', index) !== linkId
        ),
      },
    })
    setConfirm(null)
    toast({ title: 'Mention supprimée définitivement' })
  }

  const emptyLegalTrash = () => {
    if (!site || !canEdit) return
    setSite({
      ...site,
      footer: {
        ...site.footer,
        legal: site.footer.legal.filter((link) => !isArchivedFlag(link)),
      },
    })
    setConfirm(null)
    toast({ title: 'Corbeille des mentions vidée' })
  }

  const moveColumnLiveLink = (columnId: string, linkId: string, direction: -1 | 1) => {
    if (!site) return
    setSite({
      ...site,
      footer: {
        ...site.footer,
        columns: site.footer.columns.map((column) => {
          if (column.id !== columnId) return column
          const live = column.links
            .map((link, index) => ({
              index,
              id: ensureLinkId(link, `${columnId}-link`, index),
              archived: isArchivedFlag(link),
            }))
            .filter((row) => !row.archived)
          const livePos = live.findIndex((row) => row.id === linkId)
          const neighbor = live[livePos + direction]
          if (livePos < 0 || !neighbor) return column
          const next = [...column.links]
          const from = live[livePos].index
          const to = neighbor.index
          const tmp = next[from]
          next[from] = next[to]
          next[to] = tmp
          return { ...column, links: next }
        }),
      },
    })
  }

  return (
    <SiteShell
      title="Pied de page"
      description="Composez le bandeau newsletter, la marque, les colonnes et les mentions légales."
      canEdit={canEdit}
      dirty={dirty}
      saving={saving}
      loading={loading}
      onSave={save}
    >
      {site ? (
        <div className="site-footer-pro">
          <section className="site-footer-studio" aria-label="Aperçu du pied de page">
            <div className="site-footer-studio__head">
              <div className="site-footer-studio__intro">
                <span className="site-footer-studio__mark" aria-hidden>
                  <Shield className="h-4 w-4" />
                </span>
                <div>
                  <p className="site-footer-studio__eyebrow">Aperçu temps réel</p>
                  <h2 className="site-footer-studio__title">Rendu public du pied de page</h2>
                  <p className="site-footer-studio__lead">
                    Les textes et liens se mettent à jour à chaque modification.
                  </p>
                </div>
              </div>

              <ul className="site-footer-kpis" aria-label="Indicateurs">
                <li className="site-footer-kpi">
                  <span className="site-footer-kpi__icon" aria-hidden>
                    <Columns3 className="h-3.5 w-3.5" />
                  </span>
                  <div>
                    <strong>{site.footer.columns.length}</strong>
                    <span>Colonnes</span>
                  </div>
                </li>
                <li className="site-footer-kpi">
                  <span className="site-footer-kpi__icon" aria-hidden>
                    <Link2 className="h-3.5 w-3.5" />
                  </span>
                  <div>
                    <strong>{liveColumnLinkCount}</strong>
                    <span>Liens</span>
                  </div>
                </li>
                <li className="site-footer-kpi">
                  <span className="site-footer-kpi__icon" aria-hidden>
                    <Scale className="h-3.5 w-3.5" />
                  </span>
                  <div>
                    <strong>{liveLegal.length}</strong>
                    <span>Mentions</span>
                  </div>
                </li>
                {trashColumnLinkCount + trashLegal.length > 0 ? (
                  <li className="site-footer-kpi is-trash">
                    <span className="site-footer-kpi__icon" aria-hidden>
                      <Trash2 className="h-3.5 w-3.5" />
                    </span>
                    <div>
                      <strong>{trashColumnLinkCount + trashLegal.length}</strong>
                      <span>Corbeille</span>
                    </div>
                  </li>
                ) : null}
              </ul>
            </div>

            <div className="site-footer-mock">
              <div className="site-footer-mock__cta">
                <div className="site-footer-mock__cta-copy">
                  <span className="site-footer-mock__cta-icon" aria-hidden>
                    <BellRing className="h-4 w-4" />
                  </span>
                  <div>
                    <strong>{site.footer.ctaTitle || 'Restez en vigilance'}</strong>
                    <small>
                      {site.footer.ctaLead ||
                        'Recevez les alertes et publications officielles du CSIRT-ARPT.'}
                    </small>
                  </div>
                </div>
                <span className="site-footer-mock__cta-btn">
                  {site.footer.ctaLabel || 'S’abonner aux alertes'}
                </span>
              </div>

              <div className="site-footer-mock__body">
                <div className="site-footer-mock__brand">
                  <span className="site-footer-mock__brand-badge">CSIRT-ARPT</span>
                  <p>
                    {site.footer.brandText ||
                      'CSIRT-ARPT — Centre de réponse aux incidents de sécurité des systèmes d’information de l’ARPT Guinée.'}
                  </p>
                  {site.footer.twitterHref ? (
                    <span className="site-footer-mock__social">X · configuré</span>
                  ) : (
                    <span className="site-footer-mock__social is-muted">X · non renseigné</span>
                  )}
                </div>

                <div className="site-footer-mock__columns">
                  {site.footer.columns.map((column) => {
                    const previewLinks = column.links.filter((link) => !isArchivedFlag(link))
                    return (
                      <nav key={column.id} className="site-footer-mock__col" aria-label={column.title}>
                        <h3>{column.title || 'Colonne'}</h3>
                        <ul>
                          {previewLinks.slice(0, 4).map((link, index) => (
                            <li key={`${column.id}-preview-${index}`}>{link.label || 'Lien'}</li>
                          ))}
                          {previewLinks.length > 4 ? (
                            <li className="is-more">+{previewLinks.length - 4} autres</li>
                          ) : null}
                          {previewLinks.length === 0 ? <li className="is-empty">Aucun lien</li> : null}
                        </ul>
                      </nav>
                    )
                  })}
                </div>
              </div>

              <div className="site-footer-mock__legal">
                <span>© {new Date().getFullYear()} CSIRT-ARPT</span>
                <ul>
                  {liveLegal.map((item, index) => (
                    <li key={`legal-preview-${index}`}>{item.label || 'Mention'}</li>
                  ))}
                </ul>
              </div>
            </div>
          </section>

          <div className="site-footer-layout">
            <SiteCard
              className="site-footer-card site-footer-card--newsletter"
              title="Bandeau newsletter"
              description="Le bouton ouvre le modal d’abonnement aux alertes."
              actions={
                <span className="site-footer-card__badge" aria-hidden>
                  <Megaphone className="h-3.5 w-3.5" />
                </span>
              }
            >
              <div className="site-grid-2">
                <SiteField label="Titre" required>
                  <input
                    value={site.footer.ctaTitle}
                    disabled={!canEdit}
                    placeholder="Restez en vigilance"
                    onChange={(event) =>
                      setSite({
                        ...site,
                        footer: { ...site.footer, ctaTitle: event.target.value },
                      })
                    }
                  />
                </SiteField>
                <SiteField label="Libellé du bouton" required>
                  <input
                    value={site.footer.ctaLabel}
                    disabled={!canEdit}
                    placeholder="S’abonner aux alertes"
                    onChange={(event) =>
                      setSite({
                        ...site,
                        footer: { ...site.footer, ctaLabel: event.target.value },
                      })
                    }
                  />
                </SiteField>
              </div>
              <SiteField label="Texte d’accompagnement">
                <textarea
                  rows={3}
                  value={site.footer.ctaLead}
                  disabled={!canEdit}
                  placeholder="Recevez les alertes et publications officielles…"
                  onChange={(event) =>
                    setSite({
                      ...site,
                      footer: { ...site.footer, ctaLead: event.target.value },
                    })
                  }
                />
              </SiteField>
            </SiteCard>

            <SiteCard
              className="site-footer-card site-footer-card--brand"
              title="Identité de marque"
              description="Texte institutionnel et lien X affichés dans le pied de page."
              actions={
                <span className="site-footer-card__badge" aria-hidden>
                  <Shield className="h-3.5 w-3.5" />
                </span>
              }
            >
              <SiteField label="Présentation">
                <textarea
                  rows={4}
                  value={site.footer.brandText}
                  disabled={!canEdit}
                  onChange={(event) =>
                    setSite({
                      ...site,
                      footer: { ...site.footer, brandText: event.target.value },
                    })
                  }
                />
              </SiteField>
              <SiteField label="Lien X / Twitter" hint="URL complète https://…">
                <input
                  value={site.footer.twitterHref}
                  disabled={!canEdit}
                  onChange={(event) =>
                    setSite({
                      ...site,
                      footer: { ...site.footer, twitterHref: event.target.value },
                    })
                  }
                />
              </SiteField>
            </SiteCard>
          </div>

          <section className="site-footer-columns" aria-label="Colonnes de navigation">
            <header className="site-footer-section-head">
              <div className="site-footer-section-head__copy">
                <span className="site-footer-section-head__icon" aria-hidden>
                  <Columns3 className="h-4 w-4" />
                </span>
                <div>
                  <p className="site-footer-section-head__eyebrow">Navigation</p>
                  <h2>Colonnes de liens</h2>
                  <p className="site-footer-section-head__lead">
                    Structurez les menus Institution, Cybersécurité et Ressources.
                  </p>
                </div>
              </div>
              <div className="site-footer-section-head__tools">
                <AdminTrashScopeTabs
                  value={columnScope}
                  onChange={setColumnScope}
                  activeLabel="Actifs"
                  activeCount={liveColumnLinkCount}
                  trashCount={trashColumnLinkCount}
                />
                {columnsInTrash ? (
                  <AdminEmptyTrashButton
                    disabled={!canEdit || trashColumnLinkCount === 0}
                    onClick={() => setConfirm({ mode: 'empty-columns' })}
                  />
                ) : null}
              </div>
            </header>

            {columnsInTrash && trashColumnLinkCount === 0 ? (
              <AdminTrashEmptyState
                className="site-footer-trash-empty"
                title="Corbeille vide"
                description="Les liens de colonnes archivés apparaîtront ici."
                onBackToActive={() => setColumnScope('active')}
                backLabel="Retour aux actifs"
                showTips={false}
              />
            ) : (
              <div className="site-footer-columns__grid">
                {site.footer.columns.map((column, columnIndex) => {
                  const liveLinks = column.links.filter((link) => !isArchivedFlag(link))
                  const trashLinks = column.links.filter((link) => isArchivedFlag(link))
                  const visibleLinks = columnsInTrash ? trashLinks : liveLinks

                  return (
                    <div key={column.id} className="site-footer-column-box">
                      <div className="site-footer-column-box__head">
                        <div className="site-footer-column-box__identity">
                          <span className="site-footer-column-box__index" aria-hidden>
                            {columnIndex + 1}
                          </span>
                          <div>
                            <h3 className="site-footer-column-box__title">
                              {column.title || 'Colonne'}
                            </h3>
                            <p className="site-footer-column-box__sub">
                              {columnsInTrash
                                ? `${trashLinks.length} en corbeille`
                                : `${liveLinks.length} lien${liveLinks.length > 1 ? 's' : ''}`}
                            </p>
                          </div>
                        </div>
                        {!columnsInTrash ? (
                          <button
                            type="button"
                            className="site-footer-add-link-btn"
                            disabled={!canEdit}
                            onClick={() =>
                              setSite({
                                ...site,
                                footer: {
                                  ...site.footer,
                                  columns: site.footer.columns.map((item) =>
                                    item.id === column.id
                                      ? {
                                          ...item,
                                          links: [
                                            ...item.links,
                                            {
                                              id: `${column.id}-link-${Date.now()}`,
                                              href: '/',
                                              label: 'Nouveau lien',
                                              archived: false,
                                              archivedAt: null,
                                            },
                                          ],
                                        }
                                      : item
                                  ),
                                },
                              })
                            }
                          >
                            <Plus className="h-3 w-3" />
                            Lien
                          </button>
                        ) : null}
                      </div>

                      <div className="site-footer-column-box__body">
                        {!columnsInTrash ? (
                          <div className="site-footer-col-title-field">
                            <label>Titre de colonne</label>
                            <input
                              value={column.title}
                              disabled={!canEdit}
                              placeholder="Titre de la colonne"
                              onChange={(event) =>
                                setSite({
                                  ...site,
                                  footer: {
                                    ...site.footer,
                                    columns: site.footer.columns.map((item) =>
                                      item.id === column.id
                                        ? { ...item, title: event.target.value }
                                        : item
                                    ),
                                  },
                                })
                              }
                            />
                          </div>
                        ) : null}

                        <div className="site-footer-links-list">
                          {visibleLinks.map((link, index) => {
                            const linkId = ensureLinkId(
                              link,
                              `${column.id}-link`,
                              column.links.indexOf(link)
                            )
                            return (
                              <div key={linkId} className="site-footer-link-row">
                                <span className="site-footer-link-row__num" aria-hidden>
                                  {index + 1}
                                </span>
                                <div className="site-footer-link-row__inputs">
                                  <input
                                    className="site-footer-input-label"
                                    value={link.label}
                                    placeholder="Libellé du lien"
                                    disabled={!canEdit || columnsInTrash}
                                    onChange={(event) =>
                                      updateColumnLink(column.id, linkId, {
                                        label: event.target.value,
                                      })
                                    }
                                  />
                                  <input
                                    className="site-footer-input-href"
                                    value={link.href}
                                    placeholder="/url-du-lien"
                                    disabled={!canEdit || columnsInTrash}
                                    onChange={(event) =>
                                      updateColumnLink(column.id, linkId, {
                                        href: event.target.value,
                                      })
                                    }
                                  />
                                </div>
                                <div className="site-footer-link-row__actions">
                                  {columnsInTrash ? (
                                    <div className="site-row-actions">
                                      <button
                                        type="button"
                                        className="site-icon-btn"
                                        disabled={!canEdit}
                                        aria-label="Restaurer"
                                        title="Restaurer"
                                        onClick={() => restoreColumnLink(column.id, linkId)}
                                      >
                                        <ArchiveRestore className="h-3 w-3" />
                                      </button>
                                      <button
                                        type="button"
                                        className="site-icon-btn site-icon-btn-danger"
                                        disabled={!canEdit}
                                        aria-label="Supprimer définitivement"
                                        title="Supprimer définitivement"
                                        onClick={() =>
                                          setConfirm({
                                            mode: 'purge-column',
                                            columnId: column.id,
                                            linkId,
                                          })
                                        }
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </button>
                                    </div>
                                  ) : (
                                    <SiteRowActions
                                      disableUp={index === 0 || !canEdit}
                                      disableDown={index === liveLinks.length - 1 || !canEdit}
                                      disableRemove={!canEdit}
                                      onUp={() => moveColumnLiveLink(column.id, linkId, -1)}
                                      onDown={() => moveColumnLiveLink(column.id, linkId, 1)}
                                      onRemove={() => archiveColumnLink(column.id, linkId)}
                                    />
                                  )}
                                </div>
                              </div>
                            )
                          })}
                          {visibleLinks.length === 0 ? (
                            <p className="site-footer-empty">
                              {columnsInTrash
                                ? 'Aucun lien archivé dans cette colonne.'
                                : 'Aucun lien dans cette colonne.'}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </section>

          <SiteCard
            className="site-footer-card site-footer-card--legal"
            title="Mentions légales"
            description="Liens affichés en bas du pied de page public."
            actions={
              legalInTrash ? (
                <AdminEmptyTrashButton
                  disabled={!canEdit || trashLegal.length === 0}
                  onClick={() => setConfirm({ mode: 'empty-legal' })}
                />
              ) : (
                <div className="site-footer-legal-card-actions">
                  <button
                    type="button"
                    className="site-footer-add-link-btn"
                    disabled={!canEdit}
                    onClick={() => {
                      setSite({
                        ...site,
                        footer: {
                          ...site.footer,
                          legal: [
                            ...site.footer.legal,
                            {
                              id: `legal-${Date.now()}`,
                              href: '/',
                              label: 'Nouvelle mention',
                              archived: false,
                              archivedAt: null,
                            },
                          ],
                        },
                      })
                      setLegalScope('active')
                    }}
                  >
                    <Plus className="h-3 w-3" />
                    Mention
                  </button>
                  <span className="site-footer-card__badge" aria-hidden>
                    <Scale className="h-3 w-3" />
                  </span>
                </div>
              )
            }
          >
            <div className="site-footer-legal-toolbar">
              <AdminTrashScopeTabs
                value={legalScope}
                onChange={setLegalScope}
                activeLabel="Actives"
                activeCount={liveLegal.length}
                trashCount={trashLegal.length}
              />
              {legalInTrash && trashLegal.length > 0 ? (
                <span className="site-footer-legal-toolbar__hint">
                  Restaurables 90 j · enregistrement requis
                </span>
              ) : null}
            </div>

            {visibleLegal.length === 0 ? (
              legalInTrash ? (
                <AdminTrashEmptyState
                  className="site-footer-trash-empty"
                  title="Corbeille vide"
                  description="Les mentions archivées apparaîtront ici."
                  onBackToActive={() => setLegalScope('active')}
                  backLabel="Retour aux actives"
                  showTips={false}
                />
              ) : (
                <p className="site-footer-empty">Aucune mention légale.</p>
              )
            ) : (
              <div className="site-footer-legal">
                {visibleLegal.map((link, index) => {
                  const linkId = ensureLinkId(link, 'legal', site.footer.legal.indexOf(link))
                  return (
                    <article key={linkId} className="site-footer-legal-item">
                      <span className="site-footer-legal-item__num" aria-hidden>
                        {index + 1}
                      </span>
                      <div className="site-footer-legal-item__fields">
                        <div className="site-grid-2">
                          <SiteField label="Libellé">
                            <input
                              value={link.label}
                              disabled={!canEdit || legalInTrash}
                              onChange={(event) =>
                                updateLegalLink(linkId, { label: event.target.value })
                              }
                            />
                          </SiteField>
                          <SiteField label="URL">
                            <input
                              value={link.href}
                              disabled={!canEdit || legalInTrash}
                              onChange={(event) =>
                                updateLegalLink(linkId, { href: event.target.value })
                              }
                            />
                          </SiteField>
                        </div>
                      </div>
                      <div className="site-footer-legal-item__actions">
                        {legalInTrash ? (
                          <div className="site-row-actions">
                            <button
                              type="button"
                              className="site-icon-btn"
                              disabled={!canEdit}
                              aria-label="Restaurer"
                              title="Restaurer"
                              onClick={() => restoreLegalLink(linkId)}
                            >
                              <ArchiveRestore className="h-3 w-3" />
                            </button>
                            <button
                              type="button"
                              className="site-icon-btn site-icon-btn-danger"
                              disabled={!canEdit}
                              aria-label="Supprimer définitivement"
                              title="Supprimer définitivement"
                              onClick={() => setConfirm({ mode: 'purge-legal', linkId })}
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            className="site-icon-btn site-icon-btn-danger"
                            disabled={!canEdit}
                            aria-label="Mettre en corbeille"
                            title="Mettre en corbeille"
                            onClick={() => archiveLegalLink(linkId)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </article>
                  )
                })}
              </div>
            )}
          </SiteCard>
        </div>
      ) : null}

      <AdminConfirmDialog
        open={confirm !== null}
        onOpenChange={(open) => {
          if (!open) setConfirm(null)
        }}
        title={
          confirm?.mode === 'empty-columns' || confirm?.mode === 'empty-legal'
            ? 'Vider la corbeille ?'
            : 'Supprimer définitivement ?'
        }
        message={
          confirm?.mode === 'empty-columns'
            ? 'Tous les liens de colonnes en corbeille seront effacés définitivement.'
            : confirm?.mode === 'empty-legal'
              ? 'Toutes les mentions en corbeille seront effacées définitivement.'
              : 'Cette action est irréversible.'
        }
        confirmLabel={
          confirm?.mode === 'empty-columns' || confirm?.mode === 'empty-legal'
            ? 'Vider'
            : 'Supprimer'
        }
        intent="destructive"
        onConfirm={() => {
          if (!confirm) return
          if (confirm.mode === 'purge-column') {
            purgeColumnLink(confirm.columnId, confirm.linkId)
          } else if (confirm.mode === 'purge-legal') {
            purgeLegalLink(confirm.linkId)
          } else if (confirm.mode === 'empty-columns') {
            emptyColumnTrash()
          } else if (confirm.mode === 'empty-legal') {
            emptyLegalTrash()
          }
        }}
      />
    </SiteShell>
  )
}
