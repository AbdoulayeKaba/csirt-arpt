'use client'

import type { ReactNode } from 'react'
import { ChevronDown, ChevronUp, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export function SiteField({
  label,
  hint,
  required,
  className,
  children,
}: {
  label: string
  hint?: string
  required?: boolean
  className?: string
  children: ReactNode
}) {
  return (
    <label className={cn('site-field', className)}>
      <span className="site-field-label">
        {label}
        {required ? <em aria-hidden> *</em> : null}
      </span>
      {children}
      {hint ? <span className="site-field-hint">{hint}</span> : null}
    </label>
  )
}

export function SiteToggle({
  label,
  checked,
  onChange,
  disabled,
}: {
  label: string
  checked: boolean
  onChange: (value: boolean) => void
  disabled?: boolean
}) {
  return (
    <label className={cn('site-toggle', disabled && 'is-disabled')}>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span>{label}</span>
    </label>
  )
}

export function SiteCard({
  title,
  description,
  actions,
  className,
  id,
  children,
}: {
  title: string
  description?: string
  actions?: ReactNode
  className?: string
  id?: string
  children: ReactNode
}) {
  return (
    <section id={id} className={cn('site-card', className)}>
      <header className="site-card-head">
        <div>
          <h2>{title}</h2>
          {description ? <p>{description}</p> : null}
        </div>
        {actions}
      </header>
      <div className="site-card-body">{children}</div>
    </section>
  )
}

export function SiteRowActions({
  onUp,
  onDown,
  onRemove,
  disableUp,
  disableDown,
  disableRemove,
}: {
  onUp?: () => void
  onDown?: () => void
  onRemove?: () => void
  disableUp?: boolean
  disableDown?: boolean
  disableRemove?: boolean
}) {
  return (
    <div className="site-row-actions">
      {onUp ? (
        <button type="button" className="site-icon-btn" onClick={onUp} disabled={disableUp} aria-label="Monter">
          <ChevronUp className="h-4 w-4" />
        </button>
      ) : null}
      {onDown ? (
        <button type="button" className="site-icon-btn" onClick={onDown} disabled={disableDown} aria-label="Descendre">
          <ChevronDown className="h-4 w-4" />
        </button>
      ) : null}
      {onRemove ? (
        <button
          type="button"
          className="site-icon-btn site-icon-btn-danger"
          onClick={onRemove}
          disabled={disableRemove}
          aria-label="Supprimer"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      ) : null}
    </div>
  )
}
