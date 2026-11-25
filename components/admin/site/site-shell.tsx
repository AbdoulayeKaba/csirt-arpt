'use client'

import { useEffect, type ReactNode } from 'react'
import Link from 'next/link'
import { ExternalLink, Loader2, Save } from 'lucide-react'
import { AdminPageHeader } from '@/components/admin/admin-page-header'
import { cn } from '@/lib/utils'

type Props = {
  title: string
  description: string
  children: ReactNode
  canEdit: boolean
  dirty: boolean
  saving: boolean
  loading?: boolean
  onSave?: () => void
  previewHref?: string
  extraActions?: ReactNode
}

export function SiteShell({
  title,
  description,
  children,
  canEdit,
  dirty,
  saving,
  loading,
  onSave,
  previewHref = '/',
  extraActions,
}: Props) {
  const canSave = Boolean(onSave) && canEdit && dirty && !saving && !loading

  useEffect(() => {
    if (!onSave) return
    const onKeyDown = (event: KeyboardEvent) => {
      const isSave = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's'
      if (!isSave) return
      event.preventDefault()
      if (!canEdit || !dirty || saving || loading) return
      onSave()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onSave, canEdit, dirty, saving, loading])

  return (
    <div className="site-admin">
      <AdminPageHeader
        variant="flat"
        eyebrow="Site public"
        title={title}
        description={description}
        actions={
          <div className="site-header-actions" role="group" aria-label="Actions éditoriales">
            {extraActions}
            <Link
              href={previewHref}
              target="_blank"
              rel="noreferrer"
              className="site-btn site-btn-ghost site-btn-header"
            >
              <ExternalLink className="h-3.5 w-3.5" aria-hidden />
              <span>Voir le site</span>
            </Link>
            {onSave ? (
              <button
                type="button"
                className={cn(
                  'site-btn site-btn-primary site-btn-header site-btn-save',
                  dirty && 'is-dirty'
                )}
                disabled={!canSave}
                onClick={onSave}
                title={canSave ? 'Enregistrer (Ctrl+S)' : undefined}
              >
                {saving ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                ) : (
                  <Save className="h-3.5 w-3.5" aria-hidden />
                )}
                <span>{saving ? 'Enregistrement…' : 'Enregistrer'}</span>
                {dirty && !saving ? <i className="site-btn-save-dot" aria-hidden /> : null}
                {canSave ? <kbd className="site-btn-kbd">Ctrl+S</kbd> : null}
              </button>
            ) : null}
          </div>
        }
      />

      {loading ? (
        <div className="site-loading">Chargement de l’espace éditorial…</div>
      ) : (
        children
      )}

      {onSave && dirty ? (
        <div className={cn('site-savebar', !canEdit && 'is-readonly')}>
          <div className="site-savebar-copy">
            <span className="site-savebar-pulse" aria-hidden />
            <p>
              {canEdit
                ? 'Modifications non enregistrées'
                : 'Lecture seule — enregistrement non autorisé'}
            </p>
          </div>
          <button
            type="button"
            className="site-btn site-btn-primary site-btn-header site-btn-save is-dirty"
            disabled={!canEdit || saving}
            onClick={onSave}
          >
            {saving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
            ) : (
              <Save className="h-3.5 w-3.5" aria-hidden />
            )}
            <span>{saving ? 'Enregistrement…' : 'Enregistrer'}</span>
          </button>
        </div>
      ) : null}
    </div>
  )
}
