'use client'

import { useMemo, useState, type ReactNode } from 'react'
import { Check, Link2, ListTree, Search } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import type { SitePage } from '@/lib/site/types'
import { isArchivedFlag } from '@/lib/site/news-sources'
import { cn } from '@/lib/utils'

export type SitePageUrlOption = {
  label: string
  href: string
  group: string
  published: boolean
}

export function buildSitePageCatalog(pages: SitePage[]): SitePageUrlOption[] {
  return [...pages]
    .filter((page) => !isArchivedFlag(page))
    .sort((a, b) => {
      const byGroup = a.group.localeCompare(b.group, 'fr')
      if (byGroup !== 0) return byGroup
      return a.title.localeCompare(b.title, 'fr')
    })
    .map((page) => ({
      label: page.title,
      href: page.path,
      group: page.group,
      published: page.published,
    }))
}

export function SitePageUrlPicker({
  pages,
  value,
  disabled,
  onPick,
}: {
  pages: SitePageUrlOption[]
  value?: string
  disabled?: boolean
  onPick: (page: SitePageUrlOption) => void
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return pages.slice(0, 40)
    return pages
      .filter((page) =>
        `${page.label} ${page.href} ${page.group}`.toLowerCase().includes(needle)
      )
      .slice(0, 40)
  }, [pages, query])

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) setQuery('')
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          className="site-url-picker-btn"
          disabled={disabled || pages.length === 0}
          title="Choisir une page"
          aria-label="Choisir une page"
        >
          <ListTree className="h-3.5 w-3.5" aria-hidden />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={6} className="site-url-picker-pop p-0">
        <div className="site-url-picker-pop__head">
          <strong>Pages du site</strong>
          <span>{pages.length} URL</span>
        </div>
        <label className="site-url-picker-pop__search">
          <Search className="h-3.5 w-3.5" aria-hidden />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Filtrer titre ou URL…"
            aria-label="Filtrer les pages"
          />
        </label>
        <div className="site-url-picker-pop__list" role="listbox" aria-label="Liste des pages">
          {filtered.length === 0 ? (
            <p className="site-url-picker-pop__empty">Aucune page trouvée.</p>
          ) : (
            filtered.map((page) => {
              const active = value === page.href
              return (
                <button
                  key={page.href}
                  type="button"
                  role="option"
                  aria-selected={active}
                  className={cn('site-url-picker-pop__item', active && 'is-active')}
                  onClick={() => {
                    onPick(page)
                    setOpen(false)
                    setQuery('')
                  }}
                >
                  <span className="site-url-picker-pop__item-title">
                    {page.label}
                    {!page.published ? <em>Masquée</em> : null}
                    {active ? <Check className="h-3 w-3" aria-hidden /> : null}
                  </span>
                  <small>{page.group}</small>
                  <code>{page.href}</code>
                </button>
              )
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}

type SiteLinkFieldProps = {
  value: string
  onChange: (value: string) => void
  pages: SitePageUrlOption[]
  disabled?: boolean
  placeholder?: string
  className?: string
  inputClassName?: string
  inputAriaLabel?: string
  /** default = champ standard ; home = diaporama ; table = accès rapides */
  variant?: 'default' | 'home' | 'table'
  onPickPage?: (page: SitePageUrlOption) => void
}

export function SiteLinkField({
  value,
  onChange,
  pages,
  disabled,
  placeholder = '/chemin',
  className,
  inputClassName,
  inputAriaLabel,
  variant = 'default',
  onPickPage,
}: SiteLinkFieldProps) {
  const handlePick = (page: SitePageUrlOption) => {
    onChange(page.href)
    onPickPage?.(page)
  }

  const picker = (
    <SitePageUrlPicker
      pages={pages}
      value={value}
      disabled={disabled}
      onPick={handlePick}
    />
  )

  if (variant === 'home') {
    return (
      <div className={cn('site-home-link-field site-home-link-field--picker', className)}>
        <Link2 className="h-3.5 w-3.5" aria-hidden />
        <input
          value={value}
          disabled={disabled}
          placeholder={placeholder}
          aria-label={inputAriaLabel}
          className={inputClassName}
          onChange={(e) => onChange(e.target.value)}
        />
        {picker}
      </div>
    )
  }

  if (variant === 'table') {
    return (
      <div className={cn('site-home-actions-url site-home-actions-url--picker', className)}>
        <Link2 className="h-3.5 w-3.5" aria-hidden />
        <input
          value={value}
          disabled={disabled}
          placeholder={placeholder}
          aria-label={inputAriaLabel}
          className={cn('site-home-actions-input', inputClassName)}
          onChange={(e) => onChange(e.target.value)}
        />
        {picker}
      </div>
    )
  }

  return (
    <div className={cn('site-url-field', className)}>
      <input
        className={cn('site-input', inputClassName)}
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        aria-label={inputAriaLabel}
        onChange={(e) => onChange(e.target.value)}
      />
      {picker}
    </div>
  )
}

export function SiteLinkFieldWrap({ children }: { children: ReactNode }) {
  return <>{children}</>
}
